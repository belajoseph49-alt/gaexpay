import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/savings?q=&tab=goals|budgets
 * List all savings goals + budgets across users.
 */
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "savings.view");
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const tab = searchParams.get("tab") || "goals";

    if (tab === "budgets") {
      const where: Record<string, unknown> = {};
      if (q) {
        where.OR = [
          { category: { contains: q } },
          {
            user: {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
              ],
            },
          },
        ];
      }
      // Budget has no `user` relation — fetch budgets first, then users by id.
      const budgets = await db.budget.findMany({
        where: q ? { OR: [{ category: { contains: q } }] } : undefined,
        orderBy: { updatedAt: "desc" },
        take: 300,
      });
      const userIds = Array.from(new Set(budgets.map((b) => b.userId)));
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      let result = budgets.map((b) => ({ ...b, user: userMap.get(b.userId) || null }));
      if (q) {
        const ql = q.toLowerCase();
        result = result.filter(
          (b) =>
            b.category?.toLowerCase().includes(ql) ||
            b.user?.firstName?.toLowerCase().includes(ql) ||
            b.user?.lastName?.toLowerCase().includes(ql) ||
            b.user?.email?.toLowerCase().includes(ql),
        );
      }
      return NextResponse.json({ budgets: result });
    }

    // goals
    const goals = await db.savingsGoal.findMany({
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: {
        contributions: {
          select: { id: true, amount: true, type: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    const userIds = Array.from(new Set(goals.map((g) => g.userId)));
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    let result = goals.map((g) => ({ ...g, user: userMap.get(g.userId) || null }));
    if (q) {
      const ql = q.toLowerCase();
      result = result.filter(
        (g) =>
          g.name?.toLowerCase().includes(ql) ||
          g.user?.firstName?.toLowerCase().includes(ql) ||
          g.user?.lastName?.toLowerCase().includes(ql) ||
          g.user?.email?.toLowerCase().includes(ql),
      );
    }
    return NextResponse.json({ goals: result });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/savings?action=adjust_goal|adjust_budget|delete_goal|delete_budget
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "adjust_goal";

    const auth = await requirePermission(req, "savings.adjust");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const {
      goalId, budgetId, targetAmount, currentAmount, limit, spent, reason,
    } = body as {
      goalId?: string;
      budgetId?: string;
      targetAmount?: number;
      currentAmount?: number;
      limit?: number;
      spent?: number;
      reason?: string;
    };

    if (action === "adjust_goal" && goalId) {
      const goal = await db.savingsGoal.findUnique({ where: { id: goalId } });
      if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      const data: Record<string, unknown> = {};
      if (typeof targetAmount === "number" && targetAmount > 0) data.targetAmount = targetAmount;
      if (typeof currentAmount === "number" && currentAmount >= 0) data.currentAmount = currentAmount;
      const updated = await db.savingsGoal.update({ where: { id: goalId }, data });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "savings.goal_adjust",
          entity: "SavingsGoal",
          entityId: goalId,
          severity: "info",
          details: JSON.stringify({ by: auth.userId, before: { target: goal.targetAmount, current: goal.currentAmount }, after: data, reason }),
        },
      });
      return NextResponse.json({ success: true, goal: updated });
    }

    if (action === "adjust_budget" && budgetId) {
      const budget = await db.budget.findUnique({ where: { id: budgetId } });
      if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
      const data: Record<string, unknown> = {};
      if (typeof limit === "number" && limit > 0) data.limit = limit;
      if (typeof spent === "number" && spent >= 0) data.spent = spent;
      const updated = await db.budget.update({ where: { id: budgetId }, data });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "savings.budget_adjust",
          entity: "Budget",
          entityId: budgetId,
          severity: "info",
          details: JSON.stringify({ by: auth.userId, before: { limit: budget.limit, spent: budget.spent }, after: data, reason }),
        },
      });
      return NextResponse.json({ success: true, budget: updated });
    }

    if (action === "delete_goal" && goalId) {
      await db.savingsGoal.delete({ where: { id: goalId } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "savings.goal_delete",
          entity: "SavingsGoal",
          entityId: goalId,
          severity: "warning",
          details: JSON.stringify({ by: auth.userId, reason }),
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_budget" && budgetId) {
      await db.budget.delete({ where: { id: budgetId } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "savings.budget_delete",
          entity: "Budget",
          entityId: budgetId,
          severity: "warning",
          details: JSON.stringify({ by: auth.userId, reason }),
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return apiCatch(e);
  }
}
