import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const PRESET_TAGS = [
  { id: "essential", label: "Essential", color: "emerald", icon: "✅" },
  { id: "subscription", label: "Subscription", color: "violet", icon: "🔄" },
  { id: "business", label: "Business", color: "sky", icon: "💼" },
  { id: "personal", label: "Personal", color: "amber", icon: "👤" },
  { id: "investment", label: "Investment", color: "teal", icon: "📈" },
  { id: "gift", label: "Gift", color: "rose", icon: "🎁" },
  { id: "loan", label: "Loan", color: "orange", icon: "💰" },
  { id: "tax", label: "Tax", color: "slate", icon: "🧾" },
];

/** GET /api/transactions/tag — list preset + used tags. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const transactions = await db.transaction.findMany({
      where: { userId },
      select: { id: true, metadata: true },
    });

    // Extract all tags used
    const tagUsage: Record<string, number> = {};
    for (const t of transactions) {
      if (t.metadata) {
        try {
          const meta = JSON.parse(t.metadata) as { tags?: string[] };
          if (meta.tags && Array.isArray(meta.tags)) {
            for (const tag of meta.tags) {
              tagUsage[tag] = (tagUsage[tag] || 0) + 1;
            }
          }
        } catch {
          // ignore malformed metadata
        }
      }
    }

    const tags = PRESET_TAGS.map((t) => ({
      ...t,
      count: tagUsage[t.id] || 0,
    }));

    return NextResponse.json({ tags, tagUsage });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/transactions/tag — set the tag list on a transaction.
 *
 * Rate-limited because it mutates transaction metadata; audited so we can trace
 * who re-tagged what and when (useful for fraud investigations).
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
    const b = (body ?? {}) as { transactionId?: string; tags?: string[] };
    const { transactionId, tags } = b;
    if (!transactionId) return apiError("transactionId required", 400);
    if (!Array.isArray(tags)) return apiError("tags must be an array", 400);

    const tx = await db.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    if (!tx) return apiError("Transaction not found", 404);

    // Parse existing metadata or create new
    let metadata: Record<string, unknown> = {};
    if (tx.metadata) {
      try { metadata = JSON.parse(tx.metadata) as Record<string, unknown>; } catch { /* ignore */ }
    }
    const previousTags = Array.isArray(metadata.tags) ? metadata.tags : [];
    metadata.tags = tags;

    const updated = await db.transaction.update({
      where: { id: transactionId },
      data: { metadata: JSON.stringify(metadata) },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "transaction.tag_update",
        entity: "transaction",
        entityId: transactionId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ previousTags, newTags: tags }),
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
