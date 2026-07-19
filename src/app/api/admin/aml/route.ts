import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import { getSetting, setSetting, ensureSetting, DEFAULT_AML_RULES } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

// GET — suspicious transactions, AML rules, compliance reports
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "aml.view");
    if ("error" in auth) return auth.error;

    const rules = await ensureSetting("aml.rules", DEFAULT_AML_RULES, "aml");
    const reports = await ensureSetting("aml.reports", [], "aml");

    // Suspicious transactions: flagged OR high risk score OR status='flagged'
    const suspiciousTx = await db.transaction.findMany({
      where: {
        OR: [
          { fraudFlag: true },
          { status: "flagged" },
          { riskScore: { gte: 0.7 } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountType: true,
            kycStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const formatted = suspiciousTx.map((t) => ({
      id: t.id,
      reference: t.reference,
      userId: t.userId,
      userName: `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.trim(),
      userEmail: t.user?.email ?? "",
      accountType: t.user?.accountType ?? "personal",
      kycStatus: t.user?.kycStatus ?? "unverified",
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      direction: t.direction,
      riskScore: t.riskScore,
      reason: deriveReason(t),
      status: t.fraudFlag || t.status === "flagged" ? "flagged" : "reviewed",
      createdAt: t.createdAt,
    }));

    // Stats
    const stats = {
      total: formatted.length,
      flagged: formatted.filter((t) => t.status === "flagged").length,
      reviewed: formatted.filter((t) => t.status === "reviewed").length,
      reported: (reports as any[]).filter((r) => r.status === "filed").length,
    };

    return NextResponse.json({
      suspicious: formatted,
      rules,
      reports,
      stats,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — update rules, mark reviewed, file report
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "aml.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action === "update_rule") {
      const { ruleId, updates } = body as { ruleId: string; updates: Record<string, unknown> };
      const rules = (await getSetting<any[]>("aml.rules")) ?? DEFAULT_AML_RULES;
      const next = rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r));
      await setSetting("aml.rules", next, "aml");
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "aml.rule.update",
          entity: "SystemSetting",
          entityId: ruleId,
          severity: "warning",
          details: JSON.stringify({ ruleId, fields: Object.keys(updates) }),
        },
      });
      return NextResponse.json({ success: true, rules: next });
    }

    if (action === "toggle_rule") {
      const { ruleId, enabled } = body as { ruleId: string; enabled: boolean };
      const rules = (await getSetting<any[]>("aml.rules")) ?? DEFAULT_AML_RULES;
      const next = rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
      await setSetting("aml.rules", next, "aml");
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "aml.rule.toggle",
          entity: "SystemSetting",
          entityId: ruleId,
          severity: "warning",
          details: JSON.stringify({ ruleId, enabled }),
        },
      });
      return NextResponse.json({ success: true, rules: next });
    }

    if (action === "review_flag") {
      const { transactionId, note } = body as { transactionId: string; note?: string };
      const tx = await db.transaction.update({
        where: { id: transactionId },
        data: {
          fraudFlag: false,
          status: "completed",
          metadata: note ? JSON.stringify({ reviewNote: note, reviewedBy: auth.userId, reviewedAt: new Date().toISOString() }) : undefined,
        },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "aml.flag.review",
          entity: "Transaction",
          entityId: transactionId,
          severity: "info",
          details: JSON.stringify({ reference: tx.reference, note }),
        },
      });
      return NextResponse.json({ success: true, transaction: tx });
    }

    if (action === "file_report") {
      const { type, periodStart, periodEnd, transactionIds, summary } = body as {
        type: "STR" | "CTR" | "SAR";
        periodStart: string;
        periodEnd: string;
        transactionIds?: string[];
        summary?: string;
      };
      if (!type || !periodStart || !periodEnd) {
        return NextResponse.json({ error: "type, periodStart, periodEnd required" }, { status: 400 });
      }
      const reports = (await getSetting<any[]>("aml.reports")) ?? [];
      const newReport = {
        id: `rpt_${Date.now()}`,
        type,
        periodStart,
        periodEnd,
        transactionIds: transactionIds ?? [],
        summary: summary ?? "",
        status: "filed",
        filedBy: auth.userId,
        filedAt: new Date().toISOString(),
      };
      const next = [newReport, ...reports];
      await setSetting("aml.reports", next, "aml");
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "aml.report.file",
          entity: "SystemSetting",
          entityId: newReport.id,
          severity: "critical",
          details: JSON.stringify({ type, periodStart, periodEnd }),
        },
      });
      return NextResponse.json({ success: true, report: newReport, reports: next });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return apiCatch(e);
  }
}

function deriveReason(t: any): string {
  if (t.status === "flagged") return "Status flagged by system";
  if (t.fraudFlag) return "Fraud flag triggered";
  if (t.riskScore >= 0.9) return "Critical risk score";
  if (t.riskScore >= 0.7) return "High risk score";
  return "Threshold exceeded";
}
