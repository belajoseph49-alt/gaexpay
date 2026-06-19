import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const disputes = await db.dispute.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
  });
  const open = disputes.filter((d) => d.status === "open" || d.status === "under_review").length;
  return NextResponse.json({ disputes, open });
}

export async function POST(req: Request) {
  const body = await req.json();
  const dispute = await db.dispute.create({
    data: {
      userId: DEMO_USER_ID,
      transactionId: body.transactionId,
      transactionRef: body.transactionRef,
      reason: body.reason,
      description: body.description,
      priority: body.priority || "medium",
      status: "open",
    },
  });
  // create a notification
  await db.notification.create({
    data: {
      userId: DEMO_USER_ID,
      title: "Dispute filed",
      message: `Your dispute for transaction ${body.transactionRef} has been received. We'll review it within 48 hours.`,
      type: "warning",
      channel: "push",
    },
  });
  // create a support ticket linked to it
  await db.supportTicket.create({
    data: {
      userId: DEMO_USER_ID,
      subject: `Dispute: ${body.transactionRef}`,
      category: "transaction",
      priority: body.priority || "medium",
      status: "open",
      messages: {
        create: {
          userId: DEMO_USER_ID,
          senderType: "user",
          content: `Dispute reason: ${body.reason}. ${body.description}`,
        },
      },
    },
  });
  return NextResponse.json({ dispute });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const dispute = await db.dispute.update({
    where: { id: body.id },
    data: { ...(body.status && { status: body.status }) },
  });
  return NextResponse.json({ dispute });
}
