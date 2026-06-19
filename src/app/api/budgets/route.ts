import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/budgets — list budgets + check threshold breaches. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const budgets = await db.budget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

    // Check for threshold breaches and create notifications (once per day per budget)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingNotifs = await db.notification.findMany({
      where: { userId, createdAt: { gte: today }, type: "warning" },
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
            userId,
            title: overKey,
            message: `You've exceeded your ${b.category} budget! Spent ₦${b.spent.toLocaleString()} of ₦${b.limit.toLocaleString()}.`,
            type: "warning",
            channel: "push",
          },
        });
      } else if (pct >= 80 && pct < 100 && !notifKeys.has(warnKey)) {
        await db.notification.create({
          data: {
            userId,
            title: warnKey,
            message: `You've used ${pct.toFixed(0)}% of your ${b.category} budget. ₦${(b.limit - b.spent).toLocaleString()} remaining.`,
            type: "warning",
            channel: "push",
          },
        });
      }
    }

    return NextResponse.json({ budgets, totalLimit, totalSpent });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/budgets — create a budget. */
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
      category?: string; limit?: number | string; currency?: string;
      period?: string; alertThreshold?: number;
    };
    if (!b.category || !b.limit) return apiError("category and limit are required", 400);

    const budget = await db.budget.create({
      data: {
        userId,
        category: b.category,
        limit: Number(b.limit),
        spent: 0,
        currency: b.currency || "NGN",
        period: b.period || "monthly",
        alertThreshold: b.alertThreshold || 80,
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "budget.create",
        entity: "budget",
        entityId: budget.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ category: budget.category, limit: budget.limit, currency: budget.currency }),
        severity: "info",
      },
    });

    return NextResponse.json({ budget });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/budgets — update a budget or add an expense (mutates spent). */
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
      id?: string; addExpense?: number | string; limit?: number | string; category?: string;
    };

    if (b.addExpense !== undefined) {
      if (!b.id) return apiError("id required", 400);
      const budget = await db.budget.findFirst({ where: { id: b.id, userId } });
      if (!budget) return apiError("Budget not found", 404);

      const addAmt = Number(b.addExpense);
      const newSpent = budget.spent + addAmt;
      const updated = await db.budget.update({
        where: { id: b.id },
        data: { spent: newSpent },
      });
      const pct = (newSpent / budget.limit) * 100;
      if (pct >= 100) {
        await db.notification.create({
          data: {
            userId,
            title: `Budget exceeded: ${budget.category}`,
            message: `You've exceeded your ${budget.category} budget! Spent ₦${newSpent.toLocaleString()} of ₦${budget.limit.toLocaleString()}.`,
            type: "warning",
            channel: "push",
          },
        });
      } else if (pct >= 80) {
        await db.notification.create({
          data: {
            userId,
            title: `Budget warning: ${budget.category}`,
            message: `You've used ${pct.toFixed(0)}% of your ${budget.category} budget.`,
            type: "warning",
            channel: "push",
          },
        });
      }

      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "budget.expense_add",
          entity: "budget",
          entityId: budget.id,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({ category: budget.category, expenseAdded: addAmt, newSpent }),
          severity: "info",
        },
      });

      return NextResponse.json({ budget: updated });
    }

    if (!b.id) return apiError("id required", 400);
    const existing = await db.budget.findFirst({ where: { id: b.id, userId } });
    if (!existing) return apiError("Budget not found", 404);

    const budget = await db.budget.update({
      where: { id: b.id },
      data: { ...(b.limit && { limit: Number(b.limit) }), ...(b.category && { category: b.category }) },
    });
    return NextResponse.json({ budget });
  } catch (e) {
    return apiCatch(e);
  }
}

/** DELETE /api/budgets?id=... — remove a budget. */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return apiError("id required", 400);

    const existing = await db.budget.findFirst({ where: { id, userId } });
    if (!existing) return apiError("Budget not found", 404);

    await db.budget.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "budget.delete",
        entity: "budget",
        entityId: id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        severity: "info",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
