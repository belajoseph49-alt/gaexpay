import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const tickets = await db.supportTicket.findMany({
    where: { userId: DEMO_USER_ID },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.ticketId) {
    const msg = await db.supportMessage.create({
      data: { ticketId: body.ticketId, userId: DEMO_USER_ID, senderType: "user", content: body.content },
    });
    return NextResponse.json({ message: msg });
  }
  const ticket = await db.supportTicket.create({
    data: {
      userId: DEMO_USER_ID,
      subject: body.subject,
      category: body.category || "general",
      priority: body.priority || "medium",
      status: "open",
      messages: { create: { userId: DEMO_USER_ID, senderType: "user", content: body.content } },
    },
    include: { messages: true },
  });
  return NextResponse.json({ ticket });
}
