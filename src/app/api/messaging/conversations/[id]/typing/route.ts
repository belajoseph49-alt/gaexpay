import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/conversations/[id]/typing
 *   Returns { typing: boolean, typers: [{userId, firstName, ...}] } — the list
 *   of users currently typing in this conversation (last 5s). For 1-to-1,
 *   only the other participant can be "typing".
 *
 * POST /api/messaging/conversations/[id]/typing
 * Body: { typing: boolean }
 *   Records that the auth user is (or stopped) typing. We store the timestamp
 *   in the Conversation.updatedAt… no — that conflicts. Instead we use a
 *   lightweight in-memory map (server-side) keyed by conversationId+userId.
 *   For a sandbox single-instance server this is fine.
 */

// In-memory typing registry: convId → Map(userId → timestamp)
const typingMap = new Map<string, Map<string, number>>();
const TYPING_TTL_MS = 5000;

function cleanTypers(convId: string): Map<string, number> {
  let m = typingMap.get(convId);
  if (!m) { m = new Map(); typingMap.set(convId, m); }
  const now = Date.now();
  for (const [uid, ts] of m.entries()) {
    if (now - ts > TYPING_TTL_MS) m.delete(uid);
  }
  return m;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);
    const { id } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    const m = cleanTypers(id);
    const typerIds = Array.from(m.keys()).filter((uid) => uid !== userId);
    let typers: Array<{ id: string; firstName: string; lastName: string }> = [];
    if (typerIds.length > 0) {
      typers = await db.user.findMany({
        where: { id: { in: typerIds } },
        select: { id: true, firstName: true, lastName: true },
      });
    }
    return NextResponse.json({ typing: typers.length > 0, typers });
  } catch (e) {
    return apiCatch(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);
    const { id } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const typing = !!body.typing;

    const m = cleanTypers(id);
    if (typing) {
      m.set(userId, Date.now());
    } else {
      m.delete(userId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiCatch(e);
  }
}
