import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/conversations/[id]/payment-request/[reqId]/decline
 * The auth user (payer) declines a payment request.
 * - Marks PaymentRequest.status = "declined"
 * - Creates a native "system" chat message (declined notice)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; reqId: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id, reqId } = await params;

    const request = await db.paymentRequest.findUnique({ where: { id: reqId } });
    if (!request) return apiError("Payment request not found", 404);
    if (request.conversationId !== id) return apiError("Request does not belong to this conversation", 400);
    if (request.payerId !== userId) return apiError("You are not the payer of this request", 403);
    if (request.status === "paid") return apiError("This request has already been paid", 400);
    if (request.status === "declined") return apiError("This request was already declined", 400);

    const [updated, message] = await db.$transaction([
      db.paymentRequest.update({
        where: { id: reqId },
        data: { status: "declined", resolvedAt: new Date() },
      }),
      db.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: "Payment request declined",
          kind: "system",
          metadata: JSON.stringify({
            requestId: reqId,
            amount: request.amount,
            currency: request.currency,
            note: request.note || null,
            status: "declined",
            direction: "out",
          }),
          status: "sent",
        },
      }),
      db.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);

    return NextResponse.json({ request: updated, message });
  } catch (e) {
    return apiCatch(e);
  }
}
