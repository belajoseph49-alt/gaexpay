import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/api-configs/stats
 * Aggregated statistics across all ApiConfig entries:
 *   - Per-service counts + totalRequests + failedRequests
 *   - Top 5 most-used APIs
 *   - Top 5 most-erroring APIs
 *   - Overall health summary (healthy / warnings / errors / disabled counts)
 *   - Recent error log entries (last 20)
 *   - 14-day requests-by-day series (derived from ApiLog)
 *
 * Requires permission: api.view
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "api.view");
    if ("error" in auth) return auth.error;

    const [configs, recentLogs] = await Promise.all([
      db.apiConfig.findMany({
        orderBy: [{ service: "asc" }, { name: "asc" }],
        select: {
          id: true,
          service: true,
          name: true,
          provider: true,
          enabled: true,
          isDefault: true,
          lastUsedAt: true,
          lastErrorAt: true,
          lastError: true,
          totalRequests: true,
          failedRequests: true,
          createdAt: true,
        },
      }),
      db.apiLog.findMany({
        where: { level: "error", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          apiConfigId: true,
          message: true,
          endpoint: true,
          statusCode: true,
          responseTimeMs: true,
          createdAt: true,
        },
      }),
    ]);

    // Per-service aggregation
    const serviceMap: Record<string, {
      service: string;
      count: number;
      enabledCount: number;
      totalRequests: number;
      failedRequests: number;
    }> = {};
    for (const c of configs) {
      if (!serviceMap[c.service]) {
        serviceMap[c.service] = {
          service: c.service,
          count: 0,
          enabledCount: 0,
          totalRequests: 0,
          failedRequests: 0,
        };
      }
      serviceMap[c.service].count++;
      if (c.enabled) serviceMap[c.service].enabledCount++;
      serviceMap[c.service].totalRequests += c.totalRequests;
      serviceMap[c.service].failedRequests += c.failedRequests;
    }
    const byService = Object.values(serviceMap);

    // Health classification per config
    const now = Date.now();
    const ONE_HOUR = 3600000;
    const ONE_DAY = 86400000;
    let healthy = 0, warnings = 0, errors = 0, disabled = 0;
    for (const c of configs) {
      if (!c.enabled) { disabled++; continue; }
      const errorRate = c.totalRequests > 0 ? c.failedRequests / c.totalRequests : 0;
      const recentError = c.lastErrorAt && (now - c.lastErrorAt.getTime()) < ONE_HOUR;
      const dayError = c.lastErrorAt && (now - c.lastErrorAt.getTime()) < ONE_DAY;
      if (recentError || errorRate > 0.1) errors++;
      else if (dayError || errorRate > 0.01) warnings++;
      else healthy++;
    }

    // Top 5 most-used
    const topUsed = [...configs]
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, service: c.service, totalRequests: c.totalRequests, failedRequests: c.failedRequests }));

    // Top 5 most-erroring (must have >0 failedRequests)
    const topErrors = [...configs]
      .filter(c => c.failedRequests > 0)
      .sort((a, b) => b.failedRequests - a.failedRequests)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        service: c.service,
        failedRequests: c.failedRequests,
        totalRequests: c.totalRequests,
        errorRate: c.totalRequests > 0 ? c.failedRequests / c.totalRequests : 0,
        lastErrorAt: c.lastErrorAt,
      }));

    // Overall totals
    const totalRequests = configs.reduce((s, c) => s + c.totalRequests, 0);
    const totalFailed = configs.reduce((s, c) => s + c.failedRequests, 0);
    const overallErrorRate = totalRequests > 0 ? totalFailed / totalRequests : 0;

    // 14-day series — fetch from logs grouped by day
    const since = new Date(Date.now() - 13 * 86400000);
    const sinceDayStart = new Date(since.getFullYear(), since.getMonth(), since.getDate());
    const allLogsSince = await db.apiLog.findMany({
      where: { createdAt: { gte: sinceDayStart } },
      select: { level: true, createdAt: true, responseTimeMs: true, apiConfigId: true },
    });

    const series: { date: string; label: string; requests: number; errors: number; warns: number; infos: number; avgResponseMs: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayLogs = allLogsSince.filter(l => l.createdAt >= dayStart && l.createdAt < dayEnd);
      const errorsCount = dayLogs.filter(l => l.level === "error").length;
      const warnsCount = dayLogs.filter(l => l.level === "warn").length;
      const infosCount = dayLogs.filter(l => l.level === "info").length;
      const responseTimes = dayLogs.map(l => l.responseTimeMs).filter((v): v is number => v != null);
      const avgResponseMs = responseTimes.length
        ? Math.round(responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length)
        : 0;
      series.push({
        date: dayStart.toISOString().slice(0, 10),
        label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        requests: dayLogs.length,
        errors: errorsCount,
        warns: warnsCount,
        infos: infosCount,
        avgResponseMs,
      });
    }

    // Response-time distribution (bucket from logs in last 14d)
    const rtBuckets = [
      { bucket: "<100ms", count: 0, min: 0, max: 100 },
      { bucket: "100-300ms", count: 0, min: 100, max: 300 },
      { bucket: "300-1s", count: 0, min: 300, max: 1000 },
      { bucket: "1-3s", count: 0, min: 1000, max: 3000 },
      { bucket: "3s+", count: 0, min: 3000, max: Infinity },
    ];
    for (const l of allLogsSince) {
      const rt = l.responseTimeMs;
      if (rt == null) continue;
      for (const b of rtBuckets) {
        if (rt >= b.min && rt < b.max) { b.count++; break; }
      }
    }

    return NextResponse.json({
      totals: {
        configs: configs.length,
        enabled: configs.filter(c => c.enabled).length,
        // 'disabled' below uses the health-classification counter (=== configs where !enabled)
        healthy, warnings, errors, disabled,
        totalRequests,
        totalFailed,
        overallErrorRate,
      },
      byService,
      topUsed,
      topErrors,
      series,
      responseTimeDistribution: rtBuckets.map(({ bucket, count }) => ({ bucket, count })),
      recentErrors: recentLogs,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
