/**
 * GET /api/auth/google/callback
 *
 * Handle the Google OAuth 2.0 authorization-code redirect.
 *
 * Flow:
 *   1. Verify `state` matches the `gxp_oauth_state` cookie (CSRF protection).
 *   2. Exchange `code` for an access token at Google's token endpoint.
 *   3. Fetch the user profile from Google's userinfo endpoint.
 *   4. Look up the user by email.
 *      - If found: log them in (issue JWT, set `gxp_token` cookie).
 *      - If not found: create a new account — first/last name from Google
 *        profile, email from Google, phone empty, random password hash,
 *        accountType "personal", currency from SystemSetting
 *        `signup_initial_balance_currency` or "USD". Create the default
 *        wallet with the SystemSetting `signup_initial_balance` amount,
 *        plus welcome + confirmation notifications and a beta demo deposit
 *        transaction (mirroring the regular signup flow).
 *   5. Redirect to `/?authed=1` on success (or `/?oauth_error=…` on failure).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { apiCatch } from "@/lib/api-error";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return `${xfProto}://${url.host}`;
  return `${url.protocol}//${url.host}`;
}

function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set("gxp_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

function failRedirect(origin: string, code: string, message: string): NextResponse {
  const url = new URL("/", origin);
  url.searchParams.set("oauth_error", code);
  url.searchParams.set("oauth_message", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete("gxp_oauth_state");
  return res;
}

export async function GET(req: Request) {
  const origin = getOrigin(req);
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // User denied consent on Google's side.
    if (error) {
      return failRedirect(origin, "google_denied", `Google sign-in was cancelled: ${error}`);
    }
    if (!code || !stateParam) {
      return failRedirect(origin, "google_invalid_callback", "Missing authorization code or state.");
    }

    // Verify state cookie to prevent login CSRF.
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieMatch = /(?:^|;\s*)gxp_oauth_state=([^;]+)/.exec(cookieHeader);
    if (!cookieMatch || cookieMatch[1] !== stateParam) {
      return failRedirect(origin, "google_state_mismatch", "OAuth state mismatch — please try again.");
    }

    // Load OAuth client credentials from SystemSetting.
    const [clientIdRow, clientSecretRow] = await Promise.all([
      db.systemSetting.findUnique({ where: { key: "google_client_id" } }),
      db.systemSetting.findUnique({ where: { key: "google_client_secret" } }),
    ]);
    const clientId = clientIdRow?.value?.trim() ?? "";
    const clientSecret = clientSecretRow?.value?.trim() ?? "";
    if (!clientId || !clientSecret) {
      return failRedirect(origin, "google_not_configured", "Google OAuth is not configured.");
    }

    const redirectUri = `${origin}/api/auth/google/callback`;

    // --- Exchange authorization code for tokens ---------------------------
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = (await tokenRes.json().catch(() => ({}))) as GoogleTokenResponse;
      return failRedirect(
        origin,
        "google_token_exchange_failed",
        `Failed to exchange authorization code: ${errBody.error_description || errBody.error || tokenRes.status}`,
      );
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;
    const accessToken = tokens.access_token;
    if (!accessToken) {
      return failRedirect(origin, "google_no_access_token", "Google did not return an access token.");
    }

    // --- Fetch user profile from Google ----------------------------------
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return failRedirect(origin, "google_profile_failed", "Failed to fetch Google profile.");
    }
    const profile = (await profileRes.json()) as GoogleUserInfo;
    const email = profile.email?.trim().toLowerCase();
    if (!email) {
      return failRedirect(origin, "google_no_email", "Google did not return an email address.");
    }

    // --- Look up or create the user --------------------------------------
    const firstName = profile.given_name?.trim() || profile.name?.trim()?.split(" ")[0] || "Google";
    const lastName = profile.family_name?.trim() || profile.name?.trim()?.split(" ").slice(1).join(" ") || "User";

    let user = await db.user.findUnique({
      where: { email },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        accountType: true, role: true, status: true, kycStatus: true,
        kycTier: true, currency: true, country: true, referralCode: true,
        createdAt: true,
      },
    });

    if (user) {
      // Existing user — verify account is usable.
      if (user.status !== "active") {
        return failRedirect(
          origin,
          "account_suspended",
          "Your account is not active. Please contact support.",
        );
      }
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } else {
      // --- Create a new account ------------------------------------------
      // Pull the signup initial balance config so the new OAuth user gets the
      // same beta demo funds as a regular signup.
      const [balanceSetting, balanceCurrencySetting, balanceLabelSetting] = await Promise.all([
        db.systemSetting.findUnique({ where: { key: "signup_initial_balance" } }),
        db.systemSetting.findUnique({ where: { key: "signup_initial_balance_currency" } }),
        db.systemSetting.findUnique({ where: { key: "signup_initial_balance_label" } }),
      ]);
      const initialBalance = balanceSetting ? Number(balanceSetting.value) || 0 : 0;
      const currency =
        (balanceCurrencySetting?.value?.trim().toUpperCase()) || "USD";
      const balanceLabel = balanceLabelSetting?.value?.trim() || "Beta Demo Balance";

      // OAuth users don't have a password — store a long random hash. They
      // authenticate exclusively via Google. If they later want a password,
      // they can use the "forgot password" flow.
      const randomPassword = randomBytes(32).toString("hex") + randomBytes(16).toString("hex");
      const passwordHash = await hashPassword(randomPassword);
      const referralCode = "GXP" + randomBytes(4).toString("hex").toUpperCase();

      // Phone is required to be unique in our schema. Use a placeholder
      // derived from a cuid-like suffix so the user can update it later.
      const placeholderPhone = `+0${randomBytes(6).toString("hex").slice(0, 11)}`;

      const newUser = await db.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone: placeholderPhone,
          passwordHash,
          country: "Nigeria",
          accountType: "personal",
          role: "user",
          status: "active",
          currency,
          language: profile.locale?.slice(0, 2) || "en",
          permissions: "[]",
          referralCode,
          avatar: profile.picture || null,
        },
      });
      user = {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        accountType: newUser.accountType,
        role: newUser.role,
        status: newUser.status,
        kycStatus: newUser.kycStatus,
        kycTier: newUser.kycTier,
        currency: newUser.currency,
        country: newUser.country,
        referralCode: newUser.referralCode,
        createdAt: newUser.createdAt,
      };

      // Default wallet in the configured currency with the initial balance.
      await db.wallet.create({
        data: {
          userId: newUser.id,
          currency,
          balance: initialBalance,
          ledgerBalance: initialBalance,
          type: "primary",
          label: "Main Wallet",
          isDefault: true,
          status: "active",
        },
      });

      // Record the initial balance as a demo deposit transaction.
      if (initialBalance > 0) {
        await db.transaction.create({
          data: {
            userId: newUser.id,
            type: "deposit",
            amount: initialBalance,
            fee: 0,
            currency,
            status: "completed",
            direction: "in",
            reference: "GXPBETA" + Date.now().toString(36).toUpperCase(),
            counterpartyName: "GaexPay Beta Program",
            description: `${balanceLabel} — demo funds for testing (via Google signup)`,
            method: "system",
            metadata: JSON.stringify({ source: "google_signup", isDemo: true }),
          },
        });
      }

      // Welcome + confirmation notifications (mirror the regular signup).
      await db.notification.create({
        data: {
          userId: newUser.id,
          title: "Welcome to GaexPay! 🎉",
          message: `Hi ${firstName}, your personal account is ready. ${
            initialBalance > 0
              ? `You've received ${initialBalance.toLocaleString()} ${currency} as beta demo funds to explore the platform.`
              : "Complete verification to unlock higher limits."
          }`,
          type: "success",
          channel: "in_app",
        },
      });
      await db.notification.create({
        data: {
          userId: newUser.id,
          title: "Account Created Successfully ✅",
          message: `Your GaexPay account (${email}) has been created via Google. You can now send money, pay bills, trade crypto, and more.`,
          type: "transaction",
          channel: "in_app",
        },
      });
    }

    // --- Issue JWT + set cookie ------------------------------------------
    const token = generateToken(user.id);
    const successUrl = new URL("/", origin);
    successUrl.searchParams.set("authed", "1");
    const res = NextResponse.redirect(successUrl);
    setAuthCookie(res, token);
    res.cookies.delete("gxp_oauth_state");
    return res;
  } catch (e) {
    return apiCatch(e);
  }
}
