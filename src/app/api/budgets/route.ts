import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const budgets = await db.budget.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
  });
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  return NextResponse.json({ budgets, totalLimit, totalSpent });
}

export async function POST(req: Request) {
  const body = await req.json();
  const budget = await db.budget.create({
    data: {
      userId: DEMO_USER_ID,
      category: body.category,
      limit: Number(body.limit),
      spent: 0,
      currency: body.currency || "NGN",
      period: body.period || "monthly",
      alertThreshold: body.alertThreshold || 80,
    },
  });
  return NextResponse.json({ budget });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const budget = await db.budget.update({
    where: { id: body.id },
    data: { ...(body.limit && { limit: Number(body.limit) }), ...(body.category && { category: body.category }) },
  });
  return NextResponse.json({ budget });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.budget.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
