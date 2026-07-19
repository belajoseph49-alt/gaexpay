// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/live/streams/[id] — stream detail with recent donations + chat. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await ctx.params;
    const stream = await db.liveStream.findUnique({
      where: { id },
      include: {
        streamer: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, accountType: true },
        },
        donations: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!stream) return apiError("Stream not found", 404);

    // Bump viewer count when someone opens the stream (only if still live).
    let updated = stream;
    if (stream.status === "live") {
      updated = await db.liveStream.update({
        where: { id },
        data: { viewerCount: { increment: 1 } },
        include: {
          streamer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true, accountType: true },
          },
          donations: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
    }

    const now = new Date();
    const durationMs = updated.status === "live"
      ? now.getTime() - updated.startedAt.getTime()
      : updated.endedAt
        ? updated.endedAt.getTime() - updated.startedAt.getTime()
        : 0;

    return NextResponse.json({
      stream: {
        id: updated.id,
        title: updated.title,
        category: updated.category,
        status: updated.status,
        viewerCount: updated.viewerCount,
        donationGoal: updated.donationGoal,
        donationsTotal: updated.donationsTotal,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
        scheduledFor: updated.scheduledFor,
        durationMs,
        streamer: {
          id: updated.streamer.id,
          name: `${updated.streamer.firstName} ${updated.streamer.lastName}`,
          email: updated.streamer.email,
          avatar: updated.streamer.avatar,
          accountType: updated.streamer.accountType,
        },
        donations: updated.donations.map((d) => ({
          id: d.id,
          donorName: d.donorName,
          amount: d.amount,
          currency: d.currency,
          message: d.message,
          createdAt: d.createdAt,
        })),
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/live/streams/[id] — end a stream (status="ended"). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await ctx.params;
    const stream = await db.liveStream.findUnique({ where: { id } });
    if (!stream) return apiError("Stream not found", 404);
    if (stream.streamerId !== userId) return apiError("Only the streamer can end this stream", 403);
    if (stream.status === "ended") return apiError("Stream already ended", 400);

    const updated = await db.liveStream.update({
      where: { id },
      data: { status: "ended", endedAt: new Date(), viewerCount: 0 },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "live.end",
        entity: "live_stream",
        entityId: stream.id,
        details: JSON.stringify({ title: stream.title }),
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, stream: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
