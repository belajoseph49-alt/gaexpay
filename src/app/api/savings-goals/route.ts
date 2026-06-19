import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const goals = await db.savingsGoal.findMany({
    where: { userId: DEMO_USER_ID },
    include: { contributions: { orderBy: { createdAt: "desc" }, take: 10 } },
    orderBy: { createdAt: "desc" },
  });
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  return NextResponse.json({ goals, totalSaved, totalTarget });
}

export async function POST(req: Request) {
  const body = await req.json();
  const goal = await db.savingsGoal.create({
    data: {
      userId: DEMO_USER_ID,
      name: body.name,
      targetAmount: Number(body.targetAmount),
      currentAmount: 0,
      currency: body.currency || "NGN",
      deadline: body.deadline ? new Date(body.deadline) : null,
      icon: body.icon || "🎯",
      color: body.color || "emerald",
      autoSaveAmount: body.autoSaveAmount ? Number(body.autoSaveAmount) : null,
      autoSaveDay: body.autoSaveDay ? Number(body.autoSaveDay) : null,
    },
  });
  return NextResponse.json({ goal });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (body.contribution) {
    const { goalId, amount, type = "deposit", note } = body;
    const goal = await db.savingsGoal.findUnique({ where: { id: goalId } });
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    const newAmount = type === "deposit" ? goal.currentAmount + Number(amount) : Math.max(0, goal.currentAmount - Number(amount));
    const updated = await db.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: newAmount, status: newAmount >= goal.targetAmount ? "completed" : goal.status },
    });
    await db.savingsContribution.create({
      data: { goalId, amount: Number(amount), type, note },
    });
    return NextResponse.json({ goal: updated });
  }
  const goal = await db.savingsGoal.update({
    where: { id: body.id },
    data: { ...(body.status && { status: body.status }), ...(body.name && { name: body.name }) },
  });
  return NextResponse.json({ goal });
}
