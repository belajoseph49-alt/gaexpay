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

  // Check for threshold breaches and create notifications (once per day per budget)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existingNotifs = await db.notification.findMany({
    where: { userId: DEMO_USER_ID, createdAt: { gte: today }, type: "warning" },
  });
  const notifKeys = new Set(existingNotifs.map((n) => n.title));

  for (const b of budgets) {
    if (b.limit <= 0) continue;
    const pct = (b.spent / b.limit) * 100;
    const overKey = `budget-over-${b.id}`;
    const warnKey = `budget-warn-${b.id}`;
    if (pct >= 100 && !notifKeys.has(overKey)) {
      await db.notification.create({
        data: {
          userId: DEMO_USER_ID,
          title: overKey,
          message: `You've exceeded your ${b.category} budget! Spent ₦${b.spent.toLocaleString()} of ₦${b.limit.toLocaleString()}.`,
          type: "warning",
          channel: "push",
        },
      });
    } else if (pct >= 80 && pct < 100 && !notifKeys.has(warnKey)) {
      await db.notification.create({
        data: {
          userId: DEMO_USER_ID,
          title: warnKey,
          message: `You've used ${pct.toFixed(0)}% of your ${b.category} budget. ₦${(b.limit - b.spent).toLocaleString()} remaining.`,
          type: "warning",
          channel: "push",
        },
      });
    }
  }

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
  if (body.addExpense !== undefined) {
    // Add an expense to a budget (simulates spending)
    const budget = await db.budget.findUnique({ where: { id: body.id } });
    if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    const newSpent = budget.spent + Number(body.addExpense);
    const updated = await db.budget.update({
      where: { id: body.id },
      data: { spent: newSpent },
    });
    // Check threshold crossing
    const pct = (newSpent / budget.limit) * 100;
    if (pct >= 100) {
      await db.notification.create({
        data: {
          userId: DEMO_USER_ID,
          title: `Budget exceeded: ${budget.category}`,
          message: `You've exceeded your ${budget.category} budget! Spent ₦${newSpent.toLocaleString()} of ₦${budget.limit.toLocaleString()}.`,
          type: "warning",
          channel: "push",
        },
      });
    } else if (pct >= 80) {
      await db.notification.create({
        data: {
          userId: DEMO_USER_ID,
          title: `Budget warning: ${budget.category}`,
          message: `You've used ${pct.toFixed(0)}% of your ${budget.category} budget.`,
          type: "warning",
          channel: "push",
        },
      });
    }
    return NextResponse.json({ budget: updated });
  }
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
