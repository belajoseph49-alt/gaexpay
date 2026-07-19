import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/cash-links/[token] — public check of a cash link's validity. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const link = await db.cashLink.findUnique({
      where: { token },
      select: {
        amount: true,
        currency: true,
        note: true,
        status: true,
        expiresAt: true,
        claimedAt: true,
        createdAt: true,
        userId: true,
      },
    });
    if (!link) return apiError("Cash link not found", 404);

    // Refresh expired status
    let status = link.status;
    if (status === "pending" && link.expiresAt < new Date()) {
      status = "expired";
    }

    // Look up creator (first name only — public info)
    const creator = await db.user.findUnique({
      where: { id: link.userId },
      select: { firstName: true, lastName: true },
    });

    return NextResponse.json({
      valid: status === "pending",
      status,
      amount: link.amount,
      currency: link.currency,
      note: link.note,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Anonymous",
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/cash-links/[token] — claim the link (credit to caller's wallet). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const claimantId = getAuthUserId(req);
    if (!claimantId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, claimantId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    const { token } = await params;
    const link = await db.cashLink.findUnique({ where: { token } });
    if (!link) return apiError("Cash link not found", 404);

    if (link.status !== "pending") {
      return apiError(`This cash link is already ${link.status}`, 400);
    }
    if (link.expiresAt < new Date()) {
      await db.cashLink.update({ where: { id: link.id }, data: { status: "expired" } });
      return apiError("This cash link has expired", 400);
    }
    if (link.userId === claimantId) {
      return apiError("You cannot claim your own cash link", 400);
    }

    // Find or create a wallet in this currency for the claimer
    let wallet = await db.wallet.findFirst({
      where: { userId: claimantId, currency: link.currency, type: "primary" },
    });
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId: claimantId,
          currency: link.currency,
          balance: 0,
          ledgerBalance: 0,
          type: "primary",
          label: `${link.currency} Wallet`,
        },
      });
    }

    // Credit the claimer
    const updatedWallet = await db.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: link.amount } },
    });

    // Mark link as claimed
    await db.cashLink.update({
      where: { id: link.id },
      data: {
        status: "claimed",
        claimantId,
        claimedAt: new Date(),
      },
    });

    // Record the credit transaction for claimer
    const claimer = await db.user.findUnique({
      where: { id: claimantId },
      select: { firstName: true, lastName: true },
    });
    await db.transaction.create({
      data: {
        reference: `CLCLM-${token.toUpperCase()}`,
        userId: claimantId,
        senderId: link.userId,
        type: "transfer",
        direction: "credit",
        status: "completed",
        amount: link.amount,
        fee: 0,
        currency: link.currency,
        description: `Claimed cash link${link.note ? `: ${link.note}` : ""}`,
        category: "p2p",
        counterpartyName: "Cash Link",
        method: "wallet",
        walletId: wallet.id,
        completedAt: new Date(),
        metadata: JSON.stringify({ cashLinkId: link.id, token, newWalletBalance: updatedWallet.balance }),
      },
    });

    // Notify the original creator
    await db.notification.create({
      data: {
        userId: link.userId,
        title: "Cash link claimed 🎉",
        message: `Your ${link.currency} ${link.amount} cash link was claimed by ${claimer ? `${claimer.firstName} ${claimer.lastName}` : "a user"}.`,
        type: "success",
        channel: "in_app",
        isRead: false,
        actionUrl: null,
        metadata: JSON.stringify({ cashLinkId: link.id, claimantId }),
      },
    });

    await db.auditLog.create({
      data: {
        userId: claimantId,
        actor: "user",
        action: "cash_link.claim",
        entity: "cash_link",
        entityId: link.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ amount: link.amount, currency: link.currency, creatorId: link.userId }),
        severity: "info",
      },
    });

    return NextResponse.json({
      claimed: true,
      amount: link.amount,
      currency: link.currency,
      newWalletBalance: updatedWallet.balance,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
