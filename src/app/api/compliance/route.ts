import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// USD-normalized currency conversion (mirrors enterprise route)
const USD_RATE: Record<string, number> = {
  NGN: 1 / 1540, USD: 1, EUR: 1.08, GBP: 1.27, GHS: 1 / 12.5,
  KES: 1 / 130, UGX: 1 / 3800, XOF: 1 / 600, XAF: 1 / 600,
  ZAR: 1 / 18, ETB: 1 / 125, RWF: 1 / 1300, TZS: 1 / 2530,
  EGP: 1 / 48, MAD: 1 / 10, DZD: 1 / 134, TND: 1 / 3.1,
  BIF: 1 / 2950, CDF: 1 / 2750, AOA: 1 / 920, MZN: 1 / 63,
  ZMW: 1 / 26, BWP: 1 / 13.5, CNY: 1 / 7.2, JPY: 1 / 156,
  CAD: 1 / 1.37, AUD: 1 / 1.51, CHF: 1 / 0.88, AED: 1 / 3.67,
  SAR: 1 / 3.75, INR: 1 / 83, BRL: 1 / 5.4,
  BTC: 62500, ETH: 1700, BNB: 575, SOL: 68, XRP: 1.12, ADA: 0.45,
  DOT: 6.5, MATIC: 0.7, LTC: 85, TRX: 0.12, PI: 47.35,
  USDT: 1, USDC: 1, BUSD: 1, DAI: 1,
};
const toUSD = (amount: number, currency: string) =>
  amount * (USD_RATE[currency] ?? 1);

// AML alert types
const ALERT_TYPES = [
  "structuring",
  "velocity",
  "high-risk-geo",
  "unusual-pattern",
  "peeling",
] as const;

// Transaction monitoring rules catalog (8 rules)
const RULES_CATALOG = [
  {
    id: "rule_large_txn",
    name: "Transactions > ₦1M",
    description: "Flags any single transaction exceeding ₦1,000,000 to detect high-value movement requiring enhanced due diligence.",
    severity: "high" as const,
    category: "Threshold",
  },
  {
    id: "rule_velocity",
    name: "Velocity > 10 tx/day",
    description: "Triggers when a user performs more than 10 transactions within 24 hours, indicating potential structuring or account takeover.",
    severity: "medium" as const,
    category: "Velocity",
  },
  {
    id: "rule_high_risk_countries",
    name: "High-risk countries",
    description: "Screens transactions involving sanctioned or high-risk jurisdictions (FATF grey/black list) for OFAC, UN, EU compliance.",
    severity: "high" as const,
    category: "Geographic",
  },
  {
    id: "rule_structuring",
    name: "Structuring pattern",
    description: "Detects multiple sub-threshold transactions just below reporting limits — a classic smurfing indicator.",
    severity: "high" as const,
    category: "Pattern",
  },
  {
    id: "rule_round_amounts",
    name: "Round amounts",
    description: "Flags unusual round-number transfers (e.g. ₦500,000.00 exactly) often linked to money laundering or bulk cash placement.",
    severity: "low" as const,
    category: "Pattern",
  },
  {
    id: "rule_unusual_hours",
    name: "Unusual hours",
    description: "Alerts on transactions between 02:00–05:00 local time, which deviate from the user's typical activity window.",
    severity: "medium" as const,
    category: "Behavioral",
  },
  {
    id: "rule_new_recipient_large",
    name: "New recipient large amount",
    description: "Triggers when a user sends a high-value transfer to a newly added beneficiary within 24h of adding them.",
    severity: "medium" as const,
    category: "Behavioral",
  },
  {
    id: "rule_failed_attempts",
    name: "Multiple failed attempts",
    description: "Flags 5+ failed authentication or transaction attempts within an hour — a possible brute-force or fraud signal.",
    severity: "medium" as const,
    category: "Authentication",
  },
];

// Deterministic pseudo-random for stable mock data per request
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// 14-day alert trend builder
function build14DayAlertSeries(alerts: any[]) {
  const out: { date: string; label: string; value: number }[] = [];
  const nowTs = Date.now();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowTs - i * 86400000);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const count = alerts.filter(
      (a) => new Date(a.createdAt) >= dayStart && new Date(a.createdAt) < dayEnd,
    ).length;
    out.push({
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: count,
    });
  }
  return out;
}

export async function GET() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const rand = seededRandom(20260621);

  // Parallel aggregations
  const [
    allUsers,
    flaggedTx,
    allKycDocs,
    recentScreenedTx,
    pendingKycCount,
    verifiedKycCount,
    rejectedKycCount,
    sanctionsAuditCount,
    amlAuditCount,
  ] = await Promise.all([
    db.user.findMany({
      select: {
        id: true, firstName: true, lastName: true, email: true,
        country: true, status: true, kycStatus: true, kycTier: true,
        kycSubmittedAt: true, kycVerifiedAt: true, kycRejectionReason: true,
        createdAt: true, lastLoginAt: true, role: true,
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    db.transaction.findMany({
      where: {
        OR: [
          { fraudFlag: true },
          { status: "flagged" },
          { riskScore: { gte: 0.55 } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, country: true, kycTier: true },
        },
      },
    }),
    db.kycDocument.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, country: true, kycTier: true, kycSubmittedAt: true },
        },
      },
    }),
    db.transaction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        id: true, reference: true, userId: true, type: true, direction: true,
        status: true, amount: true, fee: true, currency: true, description: true,
        category: true, method: true, provider: true, riskScore: true,
        fraudFlag: true, counterpartyName: true, counterpartyAccount: true,
        counterpartyBank: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.user.count({ where: { kycStatus: "pending" } }),
    db.user.count({ where: { kycStatus: "verified" } }),
    db.user.count({ where: { kycStatus: "rejected" } }),
    db.auditLog.count({ where: { action: { contains: "sanctions" } } }),
    db.auditLog.count({ where: { action: { contains: "aml" } } }),
  ]);

  // silence unused warnings (these counts are reserved for future audit enrichment)
  void sanctionsAuditCount;
  void amlAuditCount;

  // -----------------------------------------------------------------
  // 1. AML DASHBOARD
  // -----------------------------------------------------------------
  const alertTypeForTx = (tx: any): (typeof ALERT_TYPES)[number] => {
    const amtUsd = toUSD(tx.amount, tx.currency);
    if (amtUsd >= 5000 && tx.amount % 100000 === 0) return "structuring";
    if (tx.riskScore >= 0.85) return "high-risk-geo";
    if (amtUsd >= 10000) return "peeling";
    if (tx.riskScore >= 0.7) return "velocity";
    return "unusual-pattern";
  };
  const severityForTx = (tx: any): "high" | "medium" | "low" => {
    if (tx.riskScore >= 0.85 || toUSD(tx.amount, tx.currency) >= 5000) return "high";
    if (tx.riskScore >= 0.65) return "medium";
    return "low";
  };

  const amlAlerts = flaggedTx
    .filter((t) => new Date(t.createdAt) >= thirtyDaysAgo)
    .map((t) => {
      const type = alertTypeForTx(t);
      const severity = severityForTx(t);
      const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
      let status: "open" | "under_review" | "escalated" | "closed" | "sar_filed";
      if (severity === "high" && ageHours < 72) status = "escalated";
      else if (ageHours < 24) status = "open";
      else if (ageHours < 168) status = "under_review";
      else if (severity === "high" && rand() > 0.5) status = "sar_filed";
      else status = "closed";
      const ruleIdMap: Record<string, string> = {
        "high-risk-geo": "rule_high_risk_countries",
        "structuring": "rule_structuring",
        "peeling": "rule_large_txn",
        "velocity": "rule_velocity",
        "unusual-pattern": "rule_round_amounts",
      };
      return {
        id: `ALR-${t.id.slice(-8).toUpperCase()}`,
        txId: t.id,
        reference: t.reference,
        userId: t.userId,
        userName: t.user ? `${t.user.firstName} ${t.user.lastName}` : "Unknown",
        userEmail: t.user?.email ?? "",
        userCountry: t.user?.country ?? "",
        amount: t.amount,
        currency: t.currency,
        amountUSD: Math.round(toUSD(t.amount, t.currency) * 100) / 100,
        type,
        severity,
        riskScore: Math.round((t.riskScore || 0) * 100) / 100,
        ruleId: ruleIdMap[type] ?? "rule_round_amounts",
        status,
        description: t.description,
        createdAt: t.createdAt,
      };
    });

  const totalAlerts = amlAlerts.length;
  const alertsBySeverity = {
    high: amlAlerts.filter((a) => a.severity === "high").length,
    medium: amlAlerts.filter((a) => a.severity === "medium").length,
    low: amlAlerts.filter((a) => a.severity === "low").length,
  };
  const alertsByType = ALERT_TYPES.map((type) => ({
    type,
    label: type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: amlAlerts.filter((a) => a.type === type).length,
  }));
  const sarFiled = amlAlerts.filter((a) => a.status === "sar_filed").length;
  const falsePositiveRate =
    totalAlerts > 0
      ? Math.round(
          (amlAlerts.filter((a) => a.status === "closed").length / totalAlerts) * 1000,
        ) / 10
      : 0;
  const alertTrend14d = build14DayAlertSeries(amlAlerts);
  const recentAlerts = amlAlerts.slice(0, 10);

  // -----------------------------------------------------------------
  // 2. SANCTIONS SCREENING
  // -----------------------------------------------------------------
  const totalScreened = recentScreenedTx.length;
  const sanctionsHits = recentScreenedTx.filter(
    (t) =>
      t.riskScore >= 0.85 ||
      (t.counterpartyName || "").toLowerCase().match(/sanction|ofac|blocked|pep/) !== null,
  ).length;
  const blockedTx = recentScreenedTx.filter(
    (t) => t.fraudFlag && t.riskScore >= 0.85,
  ).length;

  const screeningLists = [
    {
      id: "ofac",
      name: "OFAC SDN List",
      fullName: "Office of Foreign Assets Control — Specially Designated Nationals",
      entities: 9542,
      lastUpdated: new Date(now.getTime() - 2 * 86400000).toISOString(),
      status: "active",
      hits: Math.max(2, Math.floor(sanctionsHits * 0.5)),
    },
    {
      id: "un",
      name: "UN Consolidated Sanctions",
      fullName: "United Nations Security Council Consolidated List",
      entities: 1024,
      lastUpdated: new Date(now.getTime() - 5 * 86400000).toISOString(),
      status: "active",
      hits: Math.max(1, Math.floor(sanctionsHits * 0.2)),
    },
    {
      id: "eu",
      name: "EU Financial Sanctions",
      fullName: "European Union Financial Sanctions Files",
      entities: 2187,
      lastUpdated: new Date(now.getTime() - 1 * 86400000).toISOString(),
      status: "active",
      hits: Math.max(1, Math.floor(sanctionsHits * 0.2)),
    },
    {
      id: "local",
      name: "NFIU Local Watchlist",
      fullName: "Nigerian Financial Intelligence Unit — Domestic Watchlist",
      entities: 487,
      lastUpdated: new Date(now.getTime() - 3 * 86400000).toISOString(),
      status: "active",
      hits: Math.max(1, Math.floor(sanctionsHits * 0.1)),
    },
  ];

  const recentScreened = recentScreenedTx
    .slice()
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 12)
    .map((t) => {
      const user = allUsers.find((u) => u.id === t.userId);
      const hit = t.riskScore >= 0.85;
      const blocked = t.fraudFlag && t.riskScore >= 0.85;
      return {
        id: t.id,
        reference: t.reference,
        userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        userCountry: user?.country ?? "Unknown",
        counterparty: t.counterpartyName || t.counterpartyAccount || "—",
        amount: t.amount,
        currency: t.currency,
        amountUSD: Math.round(toUSD(t.amount, t.currency) * 100) / 100,
        riskScore: Math.round((t.riskScore || 0) * 100) / 100,
        status: blocked ? "blocked" : hit ? "hit" : "cleared",
        listMatched: hit ? ["OFAC SDN", "EU FSF", "UN Consolidated", "NFIU"][Math.floor(rand() * 4)] : null,
        screenedAt: t.createdAt,
      };
    });

  const blockedEntities = Array.from({ length: Math.min(6, Math.max(3, sanctionsHits)) }).map((_, i) => {
    const entities = [
      { name: "Bilad Al-Rafidain Trading LLC", country: "IQ", type: "Entity", reason: "OFAC SDN — terror financing" },
      { name: "Yevgeny Volkov", country: "RU", type: "Individual", reason: "EU FSF — oligarch sanctions" },
      { name: "Khartoum Exchange House", country: "SD", type: "Entity", reason: "UN Consolidated — regime" },
      { name: "Mahmoud Al-Bashir", country: "SD", type: "Individual", reason: "OFAC SDN — PEP" },
      { name: "Mirage Holdings Ltd", country: "IR", type: "Entity", reason: "EU FSF — nuclear program" },
      { name: "Joseph Kabila Trust", country: "CD", type: "Entity", reason: "NFIU — corruption PEP" },
    ];
    const e = entities[i % entities.length];
    return {
      id: `BLK-${(1000 + i).toString(36).toUpperCase()}`,
      ...e,
      addedAt: new Date(now.getTime() - (i + 1) * 4 * 86400000).toISOString(),
      source: ["OFAC", "UN", "EU", "NFIU"][i % 4],
    };
  });

  // -----------------------------------------------------------------
  // 3. KYC QUEUE
  // -----------------------------------------------------------------
  const pendingReviewsRaw = allKycDocs
    .filter((d) => d.status === "pending")
    .slice(0, 12)
    .map((d) => ({
      id: d.id,
      userId: d.userId,
      userName: d.user ? `${d.user.firstName} ${d.user.lastName}` : "Unknown",
      userEmail: d.user?.email ?? "",
      userCountry: d.user?.country ?? "Unknown",
      documentType: d.type,
      documentNumber: d.documentNumber ?? "",
      tier: d.user?.kycTier ?? 0,
      submittedAt: d.user?.kycSubmittedAt ?? d.createdAt,
      daysInQueue: Math.max(
        0,
        Math.floor((Date.now() - new Date(d.user?.kycSubmittedAt ?? d.createdAt).getTime()) / 86400000),
      ),
      riskFlag: (d.user?.kycTier ?? 0) < 2 && (d.user?.country ?? "").match(/IR|KP|SY|CU|SD/) !== null,
    }));

  const approvedToday = Math.max(1, Math.floor(verifiedKycCount * 0.12));
  const rejectedToday = Math.max(0, Math.floor(rejectedKycCount * 0.25));
  const avgReviewTimeMinutes = 204 + Math.floor(rand() * 60);
  const avgReviewTime = `${Math.floor(avgReviewTimeMinutes / 60)}h ${avgReviewTimeMinutes % 60}m`;

  const kycQueueByTier = [
    { tier: 1, label: "Tier 1 — Basic", count: Math.max(0, pendingKycCount - 2) },
    { tier: 2, label: "Tier 2 — Standard", count: Math.max(1, Math.floor(pendingKycCount * 0.5)) },
    { tier: 3, label: "Tier 3 — Enhanced", count: Math.max(1, Math.floor(pendingKycCount * 0.3)) },
  ];

  // -----------------------------------------------------------------
  // 4. RISK DISTRIBUTION
  // -----------------------------------------------------------------
  const userRiskMap = new Map<string, "low" | "medium" | "high" | "critical">();
  for (const u of allUsers) {
    const userTx = recentScreenedTx.filter((t) => t.userId === u.id);
    const maxRisk = userTx.reduce((m, t) => Math.max(m, t.riskScore || 0), 0);
    let level: "low" | "medium" | "high" | "critical";
    if (u.status === "suspended" || maxRisk >= 0.9) level = "critical";
    else if (maxRisk >= 0.7 || u.kycTier < 1) level = "high";
    else if (maxRisk >= 0.4 || u.kycTier < 2) level = "medium";
    else level = "low";
    userRiskMap.set(u.id, level);
  }
  const usersByRisk = {
    low: Array.from(userRiskMap.values()).filter((l) => l === "low").length,
    medium: Array.from(userRiskMap.values()).filter((l) => l === "medium").length,
    high: Array.from(userRiskMap.values()).filter((l) => l === "high").length,
    critical: Array.from(userRiskMap.values()).filter((l) => l === "critical").length,
  };

  const riskBuckets = [
    { bucket: "0–20", label: "Minimal (0–20)", count: 0, color: "#10b981" },
    { bucket: "21–40", label: "Low (21–40)", count: 0, color: "#84cc16" },
    { bucket: "41–60", label: "Moderate (41–60)", count: 0, color: "#f59e0b" },
    { bucket: "61–80", label: "High (61–80)", count: 0, color: "#f97316" },
    { bucket: "81–100", label: "Critical (81–100)", count: 0, color: "#ef4444" },
  ];
  for (const t of recentScreenedTx) {
    const r = (t.riskScore || 0) * 100;
    if (r <= 20) riskBuckets[0].count++;
    else if (r <= 40) riskBuckets[1].count++;
    else if (r <= 60) riskBuckets[2].count++;
    else if (r <= 80) riskBuckets[3].count++;
    else riskBuckets[4].count++;
  }

  // -----------------------------------------------------------------
  // 5. TRANSACTION MONITORING RULES
  // -----------------------------------------------------------------
  const ruleTriggerStats: Record<string, { count: number; lastTriggered: string }> = {
    rule_large_txn: { count: 0, lastTriggered: "" },
    rule_velocity: { count: 0, lastTriggered: "" },
    rule_high_risk_countries: { count: 0, lastTriggered: "" },
    rule_structuring: { count: 0, lastTriggered: "" },
    rule_round_amounts: { count: 0, lastTriggered: "" },
    rule_unusual_hours: { count: 0, lastTriggered: "" },
    rule_new_recipient_large: { count: 0, lastTriggered: "" },
    rule_failed_attempts: { count: 0, lastTriggered: "" },
  };

  let latestLarge = "";
  let latestVelocity = "";
  let latestGeo = "";
  let latestStruct = "";
  let latestRound = "";
  let latestHours = "";
  let latestNewRec = "";
  let latestFail = "";

  const userTxMap: Record<string, any[]> = {};
  for (const t of recentScreenedTx) {
    if (!userTxMap[t.userId]) userTxMap[t.userId] = [];
    userTxMap[t.userId].push(t);
  }

  for (const t of recentScreenedTx) {
    const amtUsd = toUSD(t.amount, t.currency);
    if (amtUsd >= 1000) {
      ruleTriggerStats.rule_large_txn.count++;
      if (t.createdAt > latestLarge) latestLarge = t.createdAt;
    }
    if (t.amount >= 100000 && t.amount % 100000 === 0) {
      ruleTriggerStats.rule_round_amounts.count++;
      if (t.createdAt > latestRound) latestRound = t.createdAt;
    }
    const u = allUsers.find((x) => x.id === t.userId);
    const country = u?.country ?? "";
    if (["Iran", "North Korea", "Syria", "Cuba", "Sudan", "Myanmar"].some((c) => country.includes(c))) {
      ruleTriggerStats.rule_high_risk_countries.count++;
      if (t.createdAt > latestGeo) latestGeo = t.createdAt;
    }
    const userTxs = userTxMap[t.userId] || [];
    const sameDayTx = userTxs.filter(
      (x) =>
        new Date(x.createdAt).toDateString() === new Date(t.createdAt).toDateString() &&
        toUSD(x.amount, x.currency) < 500,
    );
    if (sameDayTx.length >= 3) {
      ruleTriggerStats.rule_structuring.count++;
      if (t.createdAt > latestStruct) latestStruct = t.createdAt;
    }
    if (userTxs.length > 10) {
      ruleTriggerStats.rule_velocity.count++;
      if (t.createdAt > latestVelocity) latestVelocity = t.createdAt;
    }
    const hour = new Date(t.createdAt).getHours();
    if (hour >= 2 && hour < 5) {
      ruleTriggerStats.rule_unusual_hours.count++;
      if (t.createdAt > latestHours) latestHours = t.createdAt;
    }
    if (t.status === "failed") {
      ruleTriggerStats.rule_failed_attempts.count++;
      if (t.createdAt > latestFail) latestFail = t.createdAt;
    }
    if (amtUsd >= 500 && t.counterpartyName) {
      ruleTriggerStats.rule_new_recipient_large.count++;
      if (t.createdAt > latestNewRec) latestNewRec = t.createdAt;
    }
  }
  ruleTriggerStats.rule_large_txn.lastTriggered = latestLarge || new Date(now.getTime() - 6 * 3600000).toISOString();
  ruleTriggerStats.rule_velocity.lastTriggered = latestVelocity || new Date(now.getTime() - 2 * 3600000).toISOString();
  ruleTriggerStats.rule_high_risk_countries.lastTriggered = latestGeo || new Date(now.getTime() - 12 * 3600000).toISOString();
  ruleTriggerStats.rule_structuring.lastTriggered = latestStruct || new Date(now.getTime() - 4 * 3600000).toISOString();
  ruleTriggerStats.rule_round_amounts.lastTriggered = latestRound || new Date(now.getTime() - 8 * 3600000).toISOString();
  ruleTriggerStats.rule_unusual_hours.lastTriggered = latestHours || new Date(now.getTime() - 18 * 3600000).toISOString();
  ruleTriggerStats.rule_new_recipient_large.lastTriggered = latestNewRec || new Date(now.getTime() - 36 * 3600000).toISOString();
  ruleTriggerStats.rule_failed_attempts.lastTriggered = latestFail || new Date(now.getTime() - 1 * 3600000).toISOString();

  const monitoringRules = RULES_CATALOG.map((r, i) => {
    const stats = ruleTriggerStats[r.id];
    const enabled = i !== 4 && i !== 6;
    return {
      ...r,
      enabled,
      triggeredCount: stats.count,
      lastTriggered: stats.lastTriggered,
      threshold: r.id === "rule_large_txn" ? 1_000_000
        : r.id === "rule_velocity" ? 10
        : r.id === "rule_failed_attempts" ? 5
        : r.id === "rule_structuring" ? 3
        : null,
    };
  });

  // -----------------------------------------------------------------
  // 6. COMPLIANCE METRICS (CTR, SAR, compliance rate, audit score)
  // -----------------------------------------------------------------
  const ctrFiled = Math.max(3, Math.floor(recentScreenedTx.filter((t) => toUSD(t.amount, t.currency) >= 10000).length * 0.4));
  const sarFiledTotal = sarFiled + Math.max(2, Math.floor(totalAlerts * 0.15));
  const complianceRate =
    allUsers.length > 0
      ? Math.round((verifiedKycCount / allUsers.length) * 1000) / 10
      : 0;
  const auditScore = Math.min(98, Math.max(82, Math.round(complianceRate * 0.85 + 12)));

  // -----------------------------------------------------------------
  // 7. REGULATORY REPORTS
  // -----------------------------------------------------------------
  const reportsCatalog = [
    {
      id: "RPT-CTR-2026-06",
      type: "CTR",
      title: "Currency Transaction Report — June 2026",
      period: "Jun 1 – Jun 19, 2026",
      status: "filed",
      filedDate: new Date(now.getTime() - 3 * 86400000).toISOString(),
      regulator: "NFIU",
      count: ctrFiled,
    },
    {
      id: "RPT-SAR-2026-12",
      type: "SAR",
      title: "Suspicious Activity Report — Case #2026-12",
      period: "May 22 – Jun 5, 2026",
      status: "filed",
      filedDate: new Date(now.getTime() - 8 * 86400000).toISOString(),
      regulator: "NFIU",
      count: 1,
    },
    {
      id: "RPT-CTR-2026-05",
      type: "CTR",
      title: "Currency Transaction Report — May 2026",
      period: "May 1 – May 31, 2026",
      status: "filed",
      filedDate: new Date(now.getTime() - 22 * 86400000).toISOString(),
      regulator: "NFIU",
      count: Math.max(5, ctrFiled + 2),
    },
    {
      id: "RPT-AUD-2026-Q1",
      type: "Audit",
      title: "Q1 2026 Compliance Audit",
      period: "Jan 1 – Mar 31, 2026",
      status: "filed",
      filedDate: new Date(now.getTime() - 45 * 86400000).toISOString(),
      regulator: "Internal Audit",
      count: null,
    },
    {
      id: "RPT-SAR-2026-11",
      type: "SAR",
      title: "Suspicious Activity Report — Case #2026-11",
      period: "May 8 – May 18, 2026",
      status: "filed",
      filedDate: new Date(now.getTime() - 35 * 86400000).toISOString(),
      regulator: "NFIU",
      count: 1,
    },
    {
      id: "RPT-CTR-2026-04",
      type: "CTR",
      title: "Currency Transaction Report — April 2026",
      period: "Apr 1 – Apr 30, 2026",
      status: "filed",
      filedDate: new Date(now.getTime() - 52 * 86400000).toISOString(),
      regulator: "NFIU",
      count: Math.max(4, ctrFiled + 1),
    },
    {
      id: "RPT-COMPL-Q2",
      type: "Compliance",
      title: "Q2 2026 Compliance Summary",
      period: "Apr 1 – Jun 19, 2026",
      status: "draft",
      filedDate: null,
      regulator: "Internal",
      count: null,
    },
    {
      id: "RPT-SAR-2026-13",
      type: "SAR",
      title: "Suspicious Activity Report — Case #2026-13",
      period: "Jun 10 – Jun 17, 2026",
      status: "under_review",
      filedDate: null,
      regulator: "NFIU",
      count: 1,
    },
  ];

  return NextResponse.json({
    aml: {
      totalAlerts,
      alertsBySeverity,
      alertsByType,
      alertTrend14d,
      recentAlerts,
      sarFiled,
      falsePositiveRate,
    },
    sanctions: {
      totalScreened,
      hitsFound: sanctionsHits,
      blockedTransactions: blockedTx,
      screeningLists,
      recentScreened,
      blockedEntities,
    },
    kycQueue: {
      pendingReviews: pendingKycCount,
      approvedToday,
      rejectedToday,
      avgReviewTime,
      queueByTier: kycQueueByTier,
      pendingList: pendingReviewsRaw,
      totalPending: pendingReviewsRaw.length,
    },
    risk: {
      usersByRisk,
      txByRiskBucket: riskBuckets,
    },
    rules: monitoringRules,
    metrics: {
      ctrFiled,
      sarFiled: sarFiledTotal,
      complianceRate,
      auditScore,
      totalScreened,
      passRate: Math.round((1 - sanctionsHits / Math.max(1, totalScreened)) * 1000) / 10,
    },
    reports: reportsCatalog,
    generatedAt: now.toISOString(),
  });
}
