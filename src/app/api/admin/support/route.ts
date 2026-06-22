import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// GET — list all support tickets with messages + stats
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "support.view");
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";
    const priority = searchParams.get("priority") || "all";

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { subject: { contains: q } },
        { id: { contains: q } },
        { user: { email: { contains: q } } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
      ];
    }
    if (status !== "all") where.status = status;
    if (priority !== "all") where.priority = priority;

    const tickets = await db.supportTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            avatar: true, accountType: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, senderType: true, content: true, createdAt: true,
            isRead: true,
          },
        },
      },
    });

    // All tickets for stats
    const allTickets = await db.supportTicket.findMany({
      select: { id: true, status: true, priority: true, createdAt: true, updatedAt: true },
    });
    const open = allTickets.filter((t) => t.status === "open").length;
    const inProgress = allTickets.filter((t) => t.status === "in_progress").length;
    const resolved = allTickets.filter((t) => t.status === "resolved").length;
    const closed = allTickets.filter((t) => t.status === "closed").length;

    // Average resolution time (hours) — resolved or closed tickets
    const completedTickets = allTickets.filter(
      (t) => t.status === "resolved" || t.status === "closed",
    );
    let avgResolutionHours = 0;
    if (completedTickets.length > 0) {
      const totalHours = completedTickets.reduce((s, t) => {
        const diff = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
        return s + (diff / (1000 * 60 * 60));
      }, 0);
      avgResolutionHours = Math.round((totalHours / completedTickets.length) * 10) / 10;
    }

    // Satisfaction rate — derived from resolved tickets ratio (proxy: resolved/(resolved+rejected) * 100)
    // For simplicity, we treat resolved as satisfied.
    const totalResolvedOrClosed = resolved + closed;
    const satisfactionRate = totalResolvedOrClosed > 0
      ? Math.round((resolved / totalResolvedOrClosed) * 1000) / 10
      : 0;

    // Agents (support/admin users) — for the assign dropdown
    const agents = await db.user.findMany({
      where: {
        OR: [
          { role: "support" },
          { role: "admin" },
          { role: "super_admin" },
          { role: "moderator" },
        ],
        status: "active",
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true, avatar: true,
      },
    });

    return NextResponse.json({
      tickets,
      stats: {
        total: allTickets.length,
        open,
        inProgress,
        resolved,
        closed,
        avgResolutionHours,
        satisfactionRate,
        urgent: allTickets.filter((t) => t.priority === "urgent").length,
      },
      agents,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — assign, change status, change priority, or reply
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "status";

    let perm: string;
    switch (action) {
      case "assign":
        perm = "support.assign";
        break;
      case "status":
        perm = "support.resolve";
        break;
      case "priority":
        perm = "support.assign";
        break;
      case "reply":
        perm = "support.reply";
        break;
      default:
        return apiError("Unknown action", 400);
    }

    const auth = await requirePermission(req, perm);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { ticketId, agentId, status, priority, reply } = body as {
      ticketId?: string;
      agentId?: string;
      status?: string;
      priority?: string;
      reply?: string;
    };

    if (!ticketId) return apiError("ticketId is required", 400);

    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return apiError("Ticket not found", 404);

    const audit = (action_name: string, severity: string, details: Record<string, unknown>) =>
      db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: action_name,
          entity: "SupportTicket",
          entityId: ticket.id,
          severity,
          details: JSON.stringify(details),
        },
      });

    if (action === "assign") {
      if (!agentId) return apiError("agentId is required", 400);
      const agent = await db.user.findUnique({
        where: { id: agentId },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!agent) return apiError("Agent not found", 404);
      const updated = await db.supportTicket.update({
        where: { id: ticket.id },
        data: {
          assignedTo: agentId,
          status: ticket.status === "open" ? "in_progress" : ticket.status,
        },
      });
      await db.notification.create({
        data: {
          userId: agentId,
          title: "Ticket assigned to you",
          message: `Ticket #${ticket.id.slice(-6)} "${ticket.subject}" has been assigned to you.`,
          type: "info",
          channel: "in_app",
        },
      });
      await audit("ticket.assign", "info", { agentId, agentName: `${agent.firstName} ${agent.lastName}` });
      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "status") {
      const valid = ["open", "in_progress", "resolved", "closed"];
      if (!status || !valid.includes(status)) return apiError("Invalid status", 400);
      const updated = await db.supportTicket.update({
        where: { id: ticket.id },
        data: { status },
      });
      await audit("ticket.status_change", status === "closed" || status === "resolved" ? "info" : "info", { from: ticket.status, to: status });
      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "priority") {
      const valid = ["low", "medium", "high", "urgent"];
      if (!priority || !valid.includes(priority)) return apiError("Invalid priority", 400);
      const updated = await db.supportTicket.update({
        where: { id: ticket.id },
        data: { priority },
      });
      await audit("ticket.priority_change", priority === "urgent" ? "warning" : "info", { from: ticket.priority, to: priority });
      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "reply") {
      if (!reply) return apiError("Reply content is required", 400);
      const message = await db.supportMessage.create({
        data: {
          ticketId: ticket.id,
          userId: auth.userId,
          senderType: "agent",
          content: reply,
          isRead: false,
        },
      });
      // Mark ticket as in_progress if it was open
      if (ticket.status === "open") {
        await db.supportTicket.update({
          where: { id: ticket.id },
          data: { status: "in_progress" },
        });
      }
      // Notify the user
      await db.notification.create({
        data: {
          userId: ticket.userId,
          title: "Support reply received",
          message: `Your ticket "${ticket.subject}" has a new reply from our team.`,
          type: "info",
          channel: "in_app",
        },
      });
      await audit("ticket.reply", "info", { messageId: message.id });
      return NextResponse.json({ success: true, message });
    }

    return apiError("Unknown action", 400);
  } catch (e) {
    return apiCatch(e);
  }
}
