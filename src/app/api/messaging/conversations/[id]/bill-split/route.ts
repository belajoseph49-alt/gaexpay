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
 * POST /api/messaging/conversations/[id]/bill-split
 * Body: { billerName, billerCategory?, totalAmount, currency?, note? }
 *
 * Initiates a 2-way bill split between the auth user and the other
 * participant. Each pays half (rounded). The auth user (initiator) is
 * marked as "paid" for their share immediately; the other participant owes
 * their share. Creates a ChatBillSplit + 2 ChatBillSplitShare rows + a
 * native "split" chat message (split card with "Pay my share" button).
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
    const billerName = (body.billerName || "").toString().trim().slice(0, 80);
    const billerCategory = (body.billerCategory || "general").toString().trim().slice(0, 40);
    const totalAmount = Number(body.totalAmount);
    const currency = (body.currency || "NGN").toString().toUpperCase();
    const note = (body.note || "").toString().trim().slice(0, 200);
    if (!billerName) return apiError("Biller name is required", 400);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return apiError("Invalid amount", 400);
    if (totalAmount > 10_000_000) return apiError("Amount too large", 400);

    // Split evenly between the two participants
    const shareAmount = Math.round((totalAmount / 2) * 100) / 100;

    const split = await db.chatBillSplit.create({
      data: {
        conversationId: id,
        initiatorId: userId,
        billerName,
        billerCategory,
        totalAmount,
        currency,
        note,
        status: "open",
      },
    });
    // Initiator pays their share immediately
    await db.chatBillSplitShare.create({
      data: { splitId: split.id, userId, shareAmount, status: "paid", paidAt: new Date() },
    });
    // Other participant owes the other half
    await db.chatBillSplitShare.create({
      data: { splitId: split.id, userId: ctx.otherId, shareAmount, status: "pending" },
    });

    const message = await db.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content: "Bill split",
        kind: "split",
        metadata: JSON.stringify({
          splitId: split.id,
          billerName,
          billerCategory,
          totalAmount,
          myShare: shareAmount,
          currency,
          note: note || null,
          status: "open",
          direction: "out", // auth user initiated
        }),
        status: "sent",
      },
    });
    await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await db.chatBillSplit.update({ where: { id: split.id }, data: { messageId: message.id } });

    return NextResponse.json({ split, message });
  } catch (e) {
    return apiCatch(e);
  }
}
