import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cards?q=&status=&type=
 * List all user cards with user info (masked number, balance, limit, etc.).
 */
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "cards.view");
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (type && type !== "all") where.type = type;
    if (q) {
      where.user = {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      };
    }

    const cards = await db.card.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ cards });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/cards?action=freeze|unfreeze|block|adjust_limit|delete
 * Mutate a card's status, spending limit, or remove it.
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "adjust_limit";

    const permMap: Record<string, string> = {
      freeze: "cards.freeze",
      unfreeze: "cards.freeze",
      block: "cards.block",
      adjust_limit: "cards.adjust",
      delete: "cards.delete",
    };
    const perm = permMap[action] || "cards.adjust";

    const auth = await requirePermission(req, perm);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { cardId, limit, reason } = body as {
      cardId?: string;
      limit?: number;
      reason?: string;
    };

    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

    const card = await db.card.findUnique({ where: { id: cardId } });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    if (action === "freeze") {
      await db.card.update({ where: { id: cardId }, data: { status: "frozen" } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "card.freeze",
          entity: "Card",
          entityId: cardId,
          severity: "warning",
          details: JSON.stringify({ masked: card.maskedNumber, by: auth.userId, reason }),
        },
      });
      return NextResponse.json({ success: true, status: "frozen" });
    }

    if (action === "unfreeze") {
      await db.card.update({ where: { id: cardId }, data: { status: "active" } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "card.unfreeze",
          entity: "Card",
          entityId: cardId,
          severity: "info",
          details: JSON.stringify({ masked: card.maskedNumber, by: auth.userId }),
        },
      });
      return NextResponse.json({ success: true, status: "active" });
    }

    if (action === "block") {
      await db.card.update({ where: { id: cardId }, data: { status: "blocked" } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "card.block",
          entity: "Card",
          entityId: cardId,
          severity: "critical",
          details: JSON.stringify({ masked: card.maskedNumber, by: auth.userId, reason }),
        },
      });
      return NextResponse.json({ success: true, status: "blocked" });
    }

    if (action === "delete") {
      await db.card.delete({ where: { id: cardId } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "card.delete",
          entity: "Card",
          entityId: cardId,
          severity: "critical",
          details: JSON.stringify({ masked: card.maskedNumber, by: auth.userId, reason }),
        },
      });
      return NextResponse.json({ success: true });
    }

    // adjust_limit
    const newLimit = Number(limit);
    if (!newLimit || isNaN(newLimit) || newLimit <= 0) {
      return NextResponse.json({ error: "limit (positive number) required" }, { status: 400 });
    }
    await db.card.update({ where: { id: cardId }, data: { limit: newLimit } });
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "card.adjust_limit",
        entity: "Card",
        entityId: cardId,
        severity: "warning",
        details: JSON.stringify({
          masked: card.maskedNumber,
          by: auth.userId,
          before: card.limit,
          after: newLimit,
          reason,
        }),
      },
    });
    return NextResponse.json({ success: true, limit: newLimit });
  } catch (e) {
    return apiCatch(e);
  }
}
