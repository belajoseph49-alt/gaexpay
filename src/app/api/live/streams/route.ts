import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/streams — list live + scheduled streams.
 *
 * Query params:
 *   ?status=live|scheduled|ended|all  (default: all live+scheduled)
 *   ?category=crypto|shopping|food|fitness|general
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    } else {
      where.status = { in: ["live", "scheduled"] };
    }
    if (category && category !== "all") {
      where.category = category;
    }

    const streams = await db.liveStream.findMany({
      where,
      include: {
        streamer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            accountType: true,
          },
        },
        // _count removed — no Donation model yet
      },
      orderBy: [
        { status: "asc" }, // live first (alphabetical: ended < live < scheduled)
        { startedAt: "desc" },
      ],
    });

    const enriched = streams.map((s) => {
      const now = new Date();
      const durationMs = s.status === "live"
        ? now.getTime() - s.startedAt.getTime()
        : s.endedAt
          ? s.endedAt.getTime() - s.startedAt.getTime()
          : 0;
      return {
        id: s.id,
        title: s.title,
        category: s.category,
        status: s.status,
        viewerCount: s.viewerCount,
        donationGoal: s.donationGoal,
        donationsTotal: s.donationsTotal,
        donationsCount: 0,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        scheduledFor: s.scheduledFor,
        durationMs,
        streamer: {
          id: s.streamer.id,
          name: `${s.streamer.firstName} ${s.streamer.lastName}`,
          email: s.streamer.email,
          avatar: s.streamer.avatar,
          accountType: s.streamer.accountType,
        },
      };
    });

    const liveCount = enriched.filter((s) => s.status === "live").length;
    const scheduledCount = enriched.filter((s) => s.status === "scheduled").length;
    const totalViewers = enriched
      .filter((s) => s.status === "live")
      .reduce((sum, s) => sum + s.viewerCount, 0);

    return NextResponse.json({
      streams: enriched,
      stats: { liveCount, scheduledCount, totalViewers },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/live/streams — start a new stream (status="live" by default). */
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
      title?: string;
      category?: string;
      donationGoal?: number | string;
      scheduledFor?: string;
    };
    if (!b.title) return apiError("title is required", 400);

    const isScheduled = !!b.scheduledFor;
    const stream = await db.liveStream.create({
      data: {
        streamerId: userId,
        title: b.title,
        category: b.category || "general",
        status: isScheduled ? "scheduled" : "live",
        viewerCount: isScheduled ? 0 : Math.floor(Math.random() * 20) + 3,
        donationGoal: b.donationGoal ? Number(b.donationGoal) : null,
        scheduledFor: b.scheduledFor ? new Date(b.scheduledFor) : null,
        startedAt: new Date(),
      },
      include: {
        streamer: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, accountType: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: isScheduled ? "live.schedule" : "live.start",
        entity: "live_stream",
        entityId: stream.id,
        details: JSON.stringify({ title: stream.title, category: stream.category }),
        severity: "info",
      },
    });

    await db.notification.create({
      data: {
        userId,
        title: isScheduled ? "Stream scheduled" : "You're live!",
        message: isScheduled
          ? `Your stream "${stream.title}" is scheduled.`
          : `Your stream "${stream.title}" is now live.`,
        type: "success",
        channel: "in_app",
        actionUrl: "live",
      },
    });

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        title: stream.title,
        category: stream.category,
        status: stream.status,
        viewerCount: stream.viewerCount,
        donationGoal: stream.donationGoal,
        donationsTotal: stream.donationsTotal,
        startedAt: stream.startedAt,
        scheduledFor: stream.scheduledFor,
        streamer: {
          id: stream.streamer.id,
          name: `${stream.streamer.firstName} ${stream.streamer.lastName}`,
          email: stream.streamer.email,
          avatar: stream.streamer.avatar,
          accountType: stream.streamer.accountType,
        },
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
