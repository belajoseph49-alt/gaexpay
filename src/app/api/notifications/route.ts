import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const notifications = await db.notification.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unread = await db.notification.count({ where: { userId: DEMO_USER_ID, isRead: false } });
  return NextResponse.json({ notifications, unread });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (body.markAllRead) {
    await db.notification.updateMany({
      where: { userId: DEMO_USER_ID, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }
  const n = await db.notification.update({
    where: { id: body.id },
    data: { isRead: body.isRead },
  });
  return NextResponse.json({ notification: n });
}
