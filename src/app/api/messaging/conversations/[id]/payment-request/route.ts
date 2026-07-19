// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

async function getConvForUser(conversationId: string, userId: string) {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conv) return null;
  if (conv.participantAId !== userId && conv.participantBId !== userId) return null;
  const otherId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;
  return { conv, otherId };
}

/**
 * POST /api/messaging/conversations/[id]/payment-request
 * Body: { amount, currency?, note? }
 * Creates a payment request from the auth user (requester) to the other
 * participant (payer). Creates a PaymentRequest row + a native "request"
 * chat message (request card with Accept/Pay + Decline buttons).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const amount = Number(body.amount);
    const currency = (body.currency || "NGN").toString().toUpperCase();
    const note = (body.note || "").toString().trim().slice(0, 200);
    if (!Number.isFinite(amount) || amount <= 0) return apiError("Invalid amount", 400);
    if (amount > 10_000_000) return apiError("Amount too large", 400);

    const [request, message] = await db.$transaction([
      db.paymentRequest.create({
        data: {
          conversationId: id,
          requesterId: userId,
          payerId: ctx.otherId,
          amount,
          currency,
          note,
          status: "pending",
        },
      }),
      db.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: "Payment request",
          kind: "request",
          metadata: JSON.stringify({
            requestId: null, // filled below
            amount,
            currency,
            note: note || null,
            status: "pending",
            direction: "out", // auth user is the requester
          }),
          status: "sent",
        },
      }),
      db.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);

    // Patch the message metadata with the requestId now that we have it
    const meta = JSON.parse(message.metadata || "{}");
    meta.requestId = request.id;
    await db.message.update({
      where: { id: message.id },
      data: { metadata: JSON.stringify(meta) },
    });
    await db.paymentRequest.update({
      where: { id: request.id },
      data: { messageId: message.id },
    });

    return NextResponse.json({ request, message });
  } catch (e) {
    return apiCatch(e);
  }
}
