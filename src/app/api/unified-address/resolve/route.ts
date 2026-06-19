import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// Normalize an identifier: strips spaces, lowercase (except for GaexPay IDs),
// and detects the type.
function detectType(raw: string): {
  type: "username" | "email" | "phone" | "gaexpay_id";
  normalized: string;
  atHandle: string | null;
} {
  const trimmed = raw.trim();

  // Email?
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: "email", normalized: trimmed.toLowerCase(), atHandle: null };
  }

  // Phone (starts with +, or pure digits >= 8)
  if (/^\+?\d[\d\s-]{6,}$/.test(trimmed)) {
    const digits = trimmed.replace(/[\s-]/g, "");
    return { type: "phone", normalized: digits, atHandle: null };
  }

  // @username?
  if (trimmed.startsWith("@")) {
    return {
      type: "username",
      normalized: trimmed.slice(1).toLowerCase(),
      atHandle: trimmed.toLowerCase(),
    };
  }

  // GaexPay ID (GXP-XXXX pattern)
  if (/^GXP-/i.test(trimmed)) {
    return { type: "gaexpay_id", normalized: trimmed.toUpperCase(), atHandle: null };
  }

  // Plain username (no @)
  return {
    type: "username",
    normalized: trimmed.toLowerCase(),
    atHandle: `@${trimmed.toLowerCase()}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier: string | undefined = body?.identifier;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: "Missing 'identifier' field. Provide an email, phone, @username, or GaexPay ID." },
        { status: 400 },
      );
    }

    const detected = detectType(identifier);
    const needle = detected.normalized.toLowerCase();

    // 1) Try to look up the actual demo user (and any other seeded user)
    //    by username / email / phone / referralCode.
    let user: any = null;

    if (detected.type === "email") {
      user = await db.user.findUnique({
        where: { email: detected.normalized },
        select: SELECT_FIELDS,
      });
    } else if (detected.type === "phone") {
      // Try exact match, then match-by-digits
      user = await db.user.findUnique({
        where: { phone: detected.normalized },
        select: SELECT_FIELDS,
      });
      if (!user) {
        user = await db.user.findFirst({
          where: { phone: { contains: needle.replace(/\D/g, "").slice(-8) } },
          select: SELECT_FIELDS,
        });
      }
    } else if (detected.type === "username") {
      user = await db.user.findUnique({
        where: { username: detected.normalized },
        select: SELECT_FIELDS,
      });
    } else if (detected.type === "gaexpay_id") {
      user = await db.user.findUnique({
        where: { referralCode: detected.normalized },
        select: SELECT_FIELDS,
      });
    }

    // 2) Fallback: demo-mode match. The demo user has email "demo@gaexpay.com",
    //    phone "+2348012345678", username "adaeze", referral code "GXP-ADAEZE".
    //    Any identifier containing "adaeze" or "demo" or "gaexpay" or the demo
    //    phone's last 8 digits resolves to the demo user.
    if (!user) {
      const demoUserMatch =
        needle.includes("adaeze") ||
        needle.includes("demo") ||
        needle.includes("gaexpay") ||
        needle.includes("gxp-adaeze") ||
        needle.includes("2348012345678") ||
        needle.includes("8012345678");

      if (demoUserMatch) {
        user = await db.user.findUnique({
          where: { id: DEMO_USER_ID },
          select: SELECT_FIELDS,
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          found: false,
          identifier,
          detectedType: detected.type,
          message: "No GaexPay user matches that identifier.",
        },
        { status: 404 },
      );
    }

    const fullName = `${user.firstName} ${user.lastName}`;
    const initials = (user.firstName[0] || "U") + (user.lastName[0] || "");
    const atHandle = `@${user.username ?? user.email.split("@")[0]}`;

    return NextResponse.json({
      found: true,
      identifier,
      detectedType: detected.type,
      matchedField:
        detected.type === "email"
          ? "email"
          : detected.type === "phone"
            ? "phone"
            : detected.type === "username"
              ? "username"
              : "referralCode",
      profile: {
        id: user.id,
        fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        initials: initials.toUpperCase(),
        avatar: user.avatar,
        username: user.username,
        atHandle,
        // Mask PII — only reveal email/phone once sender confirms (UI flow)
        emailMasked: maskEmail(user.email),
        phoneMasked: maskPhone(user.phone),
        country: user.country,
        city: user.city,
        kycStatus: user.kycStatus,
        kycTier: user.kycTier,
        verified: user.kycStatus === "verified",
        status: user.status,
        isSelf: user.id === DEMO_USER_ID,
      },
      supportedMethods: [
        { id: "wallet", name: "GaexPay Wallet", fee: "Free", time: "Instant" },
        { id: "bank", name: "Bank Transfer", fee: "Bank fees", time: "1–3 days" },
        { id: "momo", name: "Mobile Money", fee: "Provider fees", time: "Instant" },
        { id: "crypto", name: "Crypto", fee: "Network fee", time: "10–30 min" },
      ],
    });
  } catch (e: any) {
    console.error("[unified-address/resolve] error:", e);
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}

const SELECT_FIELDS = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  username: true,
  country: true,
  city: true,
  avatar: true,
  kycStatus: true,
  kycTier: true,
  status: true,
} as const;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 4) + "•".repeat(Math.max(phone.length - 6, 4)) + phone.slice(-2);
}
