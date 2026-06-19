import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/savings-goals — list savings goals with recent contributions. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const goals = await db.savingsGoal.findMany({
      where: { userId },
      include: { contributions: { orderBy: { createdAt: "desc" }, take: 10 } },
      orderBy: { createdAt: "desc" },
    });
    const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    return NextResponse.json({ goals, totalSaved, totalTarget });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/savings-goals — create a new savings goal. */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      name?: string; targetAmount?: number | string; currency?: string;
      deadline?: string; icon?: string; color?: string;
      autoSaveAmount?: number | string; autoSaveDay?: number | string;
    };
    if (!b.name || !b.targetAmount) return apiError("name and targetAmount are required", 400);

    const goal = await db.savingsGoal.create({
      data: {
        userId,
        name: b.name,
        targetAmount: Number(b.targetAmount),
        currentAmount: 0,
        currency: b.currency || "NGN",
        deadline: b.deadline ? new Date(b.deadline) : null,
        icon: b.icon || "🎯",
        color: b.color || "emerald",
        autoSaveAmount: b.autoSaveAmount ? Number(b.autoSaveAmount) : null,
        autoSaveDay: b.autoSaveDay ? Number(b.autoSaveDay) : null,
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "savings_goal.create",
        entity: "savings_goal",
        entityId: goal.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ name: goal.name, targetAmount: goal.targetAmount, currency: goal.currency }),
        severity: "info",
      },
    });

    return NextResponse.json({ goal });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/savings-goals — update a goal or record a contribution.
 *
 * Money-moving when `body.contribution` is set: deposits/withdrawals move
 * balance INTO/OUT OF the goal, so we audit-log every contribution.
 */
export async function PATCH(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      contribution?: boolean; goalId?: string; amount?: number | string;
      type?: "deposit" | "withdraw"; note?: string; id?: string;
      status?: string; name?: string;
    };

    if (b.contribution) {
      const { goalId, amount, type = "deposit", note } = b;
      if (!goalId || !amount) return apiError("goalId and amount are required", 400);

      const goal = await db.savingsGoal.findFirst({ where: { id: goalId, userId } });
      if (!goal) return apiError("Goal not found", 404);

      const amt = Number(amount);
      const newAmount = type === "deposit"
        ? goal.currentAmount + amt
        : Math.max(0, goal.currentAmount - amt);

      const updated = await db.savingsGoal.update({
        where: { id: goalId },
        data: { currentAmount: newAmount, status: newAmount >= goal.targetAmount ? "completed" : goal.status },
      });
      await db.savingsContribution.create({
        data: { goalId, amount: amt, type, note },
      });

      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "savings_goal.contribution",
          entity: "savings_goal",
          entityId: goalId,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({ type, amount: amt, previousBalance: goal.currentAmount, newBalance: newAmount }),
          severity: "info",
        },
      });

      return NextResponse.json({ goal: updated });
    }

    if (!b.id) return apiError("id required", 400);
    const existing = await db.savingsGoal.findFirst({ where: { id: b.id, userId } });
    if (!existing) return apiError("Goal not found", 404);

    const goal = await db.savingsGoal.update({
      where: { id: b.id },
      data: { ...(b.status && { status: b.status }), ...(b.name && { name: b.name }) },
    });
    return NextResponse.json({ goal });
  } catch (e) {
    return apiCatch(e);
  }
}
