// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/live/streams/[id]/donate — donate to a streamer.
 *
 * Body:
 *   { amount: number, currency?: "NGN"|"USD"|..., message?: string, donorName?: string }
 *
 * Debits the donor's wallet for `currency`, increments the stream's
 * donationsTotal, and creates a LiveDonation record.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
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

    const { id } = await ctx.params;
    const stream = await db.liveStream.findUnique({ where: { id } });
    if (!stream) return apiError("Stream not found", 404);
    if (stream.status !== "live") return apiError("Stream is not live", 400);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      amount?: number | string;
      currency?: string;
      message?: string;
      donorName?: string;
    };
    if (!b.amount) return apiError("amount is required", 400);
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("amount must be a positive number", 400);
    }
    const currency = (b.currency || "NGN").toUpperCase();
    const message = (b.message || "").slice(0, 280);

    // Donor display name — prefer the user's profile name.
    const donor = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, username: true },
    });
    const donorName =
      b.donorName?.trim() ||
      (donor?.username
        ? donor.username
        : donor
          ? `${donor.firstName} ${donor.lastName}`.trim()
          : "Anonymous");

    // Find or create donor wallet for this currency.
    let wallet = await db.wallet.findFirst({
      where: { userId, currency },
    });
    if (!wallet) {
      return apiError(`You don't have a ${currency} wallet yet. Add one first.`, 400);
    }
    if (wallet.balance < amount) {
      return apiError(`Insufficient ${currency} balance. You have ${wallet.balance}, need ${amount}.`, 400);
    }

    const [updatedWallet, updatedStream, donation] = await db.$transaction([
      db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      db.liveStream.update({
        where: { id: stream.id },
        data: { donationsTotal: { increment: amount } },
      }),
      db.liveDonation.create({
        data: {
          streamId: stream.id,
          donorId: userId,
          donorName,
          amount,
          currency,
          message: message || null,
        },
      }),
    ]);

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "live.donate",
        entity: "live_stream",
        entityId: stream.id,
        details: JSON.stringify({ amount, currency, donorName, donationId: donation.id }),
        severity: "info",
      },
    });

    await db.notification.create({
      data: {
        userId: stream.streamerId,
        title: "New donation!",
        message: `${donorName} sent you ${amount} ${currency}${message ? ` — "${message}"` : ""}.`,
        type: "success",
        channel: "in_app",
        actionUrl: "live",
      },
    });

    return NextResponse.json({
      success: true,
      donation: {
        id: donation.id,
        donorName,
        amount,
        currency,
        message,
        createdAt: donation.createdAt,
      },
      walletBalanceAfter: updatedWallet.balance,
      streamDonationsTotal: updatedStream.donationsTotal,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
