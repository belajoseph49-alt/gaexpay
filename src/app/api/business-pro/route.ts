import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// Deterministic pseudo-random generator (seeded) so mock values are stable across requests.
function seededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const rand = seededRandom(20260619);

// Product catalogue for the merchant (mock — mapped to a small business inventory)
const PRODUCT_CATALOGUE = [
  { name: "Premium Subscription", category: "Digital Services", basePrice: 15000, baseSold: 320 },
  { name: "Smartphone X Pro Case", category: "Accessories", basePrice: 8500, baseSold: 540 },
  { name: "Wireless Earbuds Pro", category: "Electronics", basePrice: 42000, baseSold: 180 },
  { name: "USB-C Fast Charger", category: "Electronics", basePrice: 12000, baseSold: 410 },
  { name: "Coffee Voucher (10x)", category: "Food & Beverage", basePrice: 6500, baseSold: 720 },
  { name: "Gym Monthly Pass", category: "Health & Wellness", basePrice: 18000, baseSold: 240 },
  { name: "Office Notebook Set", category: "Stationery", basePrice: 4500, baseSold: 980 },
  { name: "Bluetooth Speaker Mini", category: "Electronics", basePrice: 28000, baseSold: 95 },
  { name: "Data Bundle 50GB", category: "Digital Services", basePrice: 11000, baseSold: 615 },
  { name: "Designer Tote Bag", category: "Fashion", basePrice: 35000, baseSold: 130 },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Digital Services": "#10b981",
  "Accessories": "#f59e0b",
  "Electronics": "#06b6d4",
  "Food & Beverage": "#ec4899",
  "Health & Wellness": "#8b5cf6",
  "Stationery": "#14b8a6",
  "Fashion": "#f97316",
};

// Mock staff roster (5 members)
const STAFF_ROSTER = [
  { id: "s1", name: "Amara Diallo", role: "Store Manager", avatar: "AD", color: "from-emerald-500 to-teal-600" },
  { id: "s2", name: "Kwame Mensah", role: "Senior Cashier", avatar: "KM", color: "from-amber-500 to-orange-600" },
  { id: "s3", name: "Fatima Bello", role: "Sales Associate", avatar: "FB", color: "from-violet-500 to-fuchsia-600" },
  { id: "s4", name: "Joseph Mwangi", role: "Sales Associate", avatar: "JM", color: "from-sky-500 to-cyan-600" },
  { id: "s5", name: "Zainab Omar", role: "Inventory Lead", avatar: "ZO", color: "from-rose-500 to-pink-600" },
];

// Mock bank accounts for settlements
const BANK_ACCOUNTS = [
  { id: "ba1", bank: "Access Bank", accountName: "GaexPay Pro Merchants", accountNumber: "0123456789", currency: "NGN", primary: true },
  { id: "ba2", bank: "GTBank", accountName: "GaexPay Pro Merchants", accountNumber: "0098765432", currency: "NGN", primary: false },
  { id: "ba3", bank: "Kuda Bank", accountName: "Ada Merchant LLC", accountNumber: "2011122334", currency: "NGN", primary: false },
];

export async function GET() {
  // Use the same merchant as the merchant-dashboard route
  const merchant =
    (await db.merchant.findFirst({ where: { id: "cmqk5ptrr0005l5wvi2x3wc4l" } })) ??
    (await db.merchant.findFirst());

  if (!merchant) {
    return NextResponse.json({ error: "No merchant found" }, { status: 404 });
  }

  // Pull all completed payment transactions for the demo user (incoming merchant payments)
  const payments = await db.transaction.findMany({
    where: { userId: DEMO_USER_ID, type: "payment", status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const todayPayments = payments.filter((p) => new Date(p.createdAt) >= todayStart);
  const weekPayments = payments.filter((p) => new Date(p.createdAt) >= weekStart);
  const monthPayments = payments.filter((p) => new Date(p.createdAt) >= monthStart);
  const yearPayments = payments.filter((p) => new Date(p.createdAt) >= yearStart);

  const todayRevenue = todayPayments.reduce((s, p) => s + p.amount, 0);
  const weekRevenue = weekPayments.reduce((s, p) => s + p.amount, 0);
  const monthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);
  const yearRevenue = yearPayments.reduce((s, p) => s + p.amount, 0);
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

  const totalCount = payments.length;
  const avgOrderValue = totalCount > 0 ? totalRevenue / totalCount : 0;

  // Refund rate: derive from flagged payment tx (mock baseline added)
  const refundCount = payments.filter((p) => p.fraudFlag).length;
  const refundRate = totalCount > 0 ? (refundCount / totalCount) * 100 + 0.4 : 1.2;

  // Customers — derive from counterpartyName + counterpartyAccount
  const customerMap: Record<
    string,
    { name: string; account: string; count: number; total: number; lastOrder: Date }
  > = {};
  for (const p of payments) {
    const key = p.counterpartyAccount || p.counterpartyName || "walk-in";
    const name = p.counterpartyName || "Walk-in Customer";
    const last = new Date(p.createdAt);
    if (!customerMap[key]) {
      customerMap[key] = { name, account: p.counterpartyAccount || "", count: 0, total: 0, lastOrder: last };
    }
    customerMap[key].count += 1;
    customerMap[key].total += p.amount;
    if (last > customerMap[key].lastOrder) customerMap[key].lastOrder = last;
  }

  const customerCount = Object.keys(customerMap).length || 1;
  const repeatCustomers = Object.values(customerMap).filter((c) => c.count >= 2).length;
  const repeatCustomerRate = customerCount > 0 ? (repeatCustomers / customerCount) * 100 : 0;

  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((c, i) => ({
      rank: i + 1,
      name: c.name,
      account: c.account,
      orderCount: c.count,
      totalSpend: c.total,
      lastOrderDate: c.lastOrder.toISOString(),
    }));

  // 14-day revenue trend (area chart)
  const revenueTrend: { date: string; label: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start.getTime() + 86400000);
    const dayTx = payments.filter((p) => {
      const t = new Date(p.createdAt);
      return t >= start && t < end;
    });
    revenueTrend.push({
      date: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en", { month: "short", day: "numeric" }),
      revenue: dayTx.reduce((s, p) => s + p.amount, 0),
      orders: dayTx.length,
    });
  }

  // Sales by category — distribute the monthRevenue across the PRODUCT_CATALOGUE categories
  const totalCatalogueValue = PRODUCT_CATALOGUE.reduce((s, p) => s + p.baseSold * p.basePrice, 0);
  const categoryAgg: Record<string, number> = {};
  for (const p of PRODUCT_CATALOGUE) {
    const share = (p.baseSold * p.basePrice) / totalCatalogueValue;
    const cat = p.category;
    categoryAgg[cat] = (categoryAgg[cat] || 0) + monthRevenue * share;
  }
  const salesByCategory = Object.entries(categoryAgg)
    .map(([name, value]) => ({ name, value: Math.round(value), color: CATEGORY_COLORS[name] || "#94a3b8" }))
    .sort((a, b) => b.value - a.value);

  // Sales by payment method (QR, card, bank, momo, crypto)
  const methodAgg: Record<string, number> = { QR: 0, Card: 0, Bank: 0, MoMo: 0, Crypto: 0 };
  for (const p of payments) {
    const m = (p.method || "wallet").toLowerCase();
    if (m === "qr") methodAgg.QR += p.amount;
    else if (m === "card") methodAgg.Card += p.amount;
    else if (m === "bank") methodAgg.Bank += p.amount;
    else if (m === "momo" || m === "mobile") methodAgg.MoMo += p.amount;
    else if (m === "crypto") methodAgg.Crypto += p.amount;
    else methodAgg.QR += p.amount;
  }
  const totalMethod = Object.values(methodAgg).reduce((s, v) => s + v, 0);
  if (totalMethod === 0) {
    const shares: Record<string, number> = { QR: 0.42, MoMo: 0.24, Bank: 0.18, Card: 0.11, Crypto: 0.05 };
    for (const k of Object.keys(methodAgg)) {
      methodAgg[k] = Math.round(monthRevenue * shares[k]);
    }
  }
  const methodColors: Record<string, string> = {
    QR: "#10b981", Card: "#8b5cf6", Bank: "#06b6d4", MoMo: "#f59e0b", Crypto: "#ec4899",
  };
  const salesByMethod = Object.entries(methodAgg).map(([name, value]) => ({
    name,
    value: Math.round(value),
    color: methodColors[name],
  }));

  // Top 10 products/services
  const topProducts = PRODUCT_CATALOGUE.map((p, i) => {
    const sold = Math.round(p.baseSold * (0.85 + rand() * 0.3));
    const revenue = Math.round(sold * p.basePrice);
    const growth = Math.round((rand() * 40 - 8) * 10) / 10;
    return {
      rank: i + 1,
      name: p.name,
      category: p.category,
      color: CATEGORY_COLORS[p.category] || "#10b981",
      sold,
      revenue,
      growth,
      share: revenue / totalCatalogueValue,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Hourly sales heatmap (7 days × 24 hours)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmap: { day: string; hour: number; value: number; revenue: number }[] = [];
  const bucket: Record<string, number> = {};
  for (const p of payments) {
    const t = new Date(p.createdAt);
    const dayIdx = (t.getDay() + 6) % 7;
    const hour = t.getHours();
    bucket[`${dayIdx}-${hour}`] = (bucket[`${dayIdx}-${hour}`] || 0) + p.amount;
  }
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const peak1 = Math.exp(-Math.pow(h - 12.5, 2) / 12);
      const peak2 = Math.exp(-Math.pow(h - 19.5, 2) / 10);
      const weekend = d >= 5 ? 1.35 : 1;
      const nightDip = h < 6 || h > 23 ? 0.15 : 1;
      const noise = 0.7 + rand() * 0.6;
      const intensity = (peak1 * 0.6 + peak2 * 0.8) * weekend * nightDip * noise;
      const realVal = bucket[`${d}-${h}`] || 0;
      const baseAvgOrder = avgOrderValue || 12000;
      const value = realVal > 0 ? realVal : Math.round(intensity * baseAvgOrder * (3 + rand() * 4));
      heatmap.push({
        day: dayLabels[d],
        hour: h,
        value,
        revenue: value,
      });
    }
  }

  // Staff performance (mock)
  const staffShares = [0.27, 0.22, 0.2, 0.17, 0.14];
  const staff = STAFF_ROSTER.map((s, i) => {
    const salesCount = Math.max(20, Math.round((monthPayments.length || 240) * staffShares[i] * (0.9 + rand() * 0.2)));
    const revenue = Math.round(monthRevenue * staffShares[i] * (0.9 + rand() * 0.2));
    const rating = Math.round((4.2 + rand() * 0.7) * 10) / 10;
    const target = Math.round(revenue / 0.85);
    const attainment = Math.round((revenue / target) * 100);
    return {
      ...s,
      salesCount,
      revenue,
      rating,
      target,
      attainment,
      avgTicket: salesCount > 0 ? revenue / salesCount : 0,
    };
  });

  // Pending invoices (mock — 5 invoices)
  const invoiceCustomers = [
    "Apex Logistics Ltd", "Greenfield Holdings", "Nova Industries",
    "Summit Traders LLC", "Bluewave Enterprises",
  ];
  const statuses = ["pending", "pending", "overdue", "paid", "pending"];
  const invoices = invoiceCustomers.map((name, i) => {
    const amount = Math.round((50000 + rand() * 450000) / 1000) * 1000;
    const due = new Date(now.getTime() + (i - 2) * 5 * 86400000);
    const created = new Date(due.getTime() - 14 * 86400000);
    return {
      id: `INV-${2026}-${String(1042 + i).padStart(5, "0")}`,
      customer: name,
      amount,
      dueDate: due.toISOString(),
      createdAt: created.toISOString(),
      status: statuses[i],
      items: Math.round(1 + rand() * 6),
      tax: Math.round(amount * 0.075),
    };
  });

  // Settlement history (mock)
  const settlementStatuses = ["completed", "completed", "completed", "pending", "processing", "completed"];
  const settlements = settlementStatuses.map((status, i) => {
    const amount = Math.round((100000 + rand() * 900000) / 1000) * 1000;
    const date = new Date(now.getTime() - i * 2 * 86400000 - Math.floor(rand() * 86400000));
    const bank = BANK_ACCOUNTS[i % BANK_ACCOUNTS.length];
    return {
      id: `STL-${String(8801 + i).padStart(5, "0")}`,
      reference: `GXP-STL-${String(45120 + i).padStart(7, "0")}`,
      date: date.toISOString(),
      amount,
      fee: Math.round(amount * 0.005),
      net: Math.round(amount * 0.995),
      bank: bank.bank,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      status,
    };
  });

  // Business insights (AI-generated tips)
  const repeatRate = repeatCustomerRate;
  const insights = [
    {
      type: "positive",
      icon: "trending-up",
      title: "Revenue momentum is strong",
      message: `Month-to-date revenue is ${formatMoney(monthRevenue)} NGN across ${monthPayments.length} orders. Your average order value of ${formatMoney(avgOrderValue)} NGN is ${avgOrderValue > 15000 ? "above" : "near"} the industry benchmark for ${merchant.category} merchants.`,
      metric: `${((monthRevenue / Math.max(weekRevenue, 1)) * 1).toFixed(1)}× week`,
    },
    {
      type: "warning",
      icon: "alert-triangle",
      title: "Refund rate needs attention",
      message: `Your refund rate is ${refundRate.toFixed(2)}%. The healthy benchmark is under 2%. Review your top refunded product categories and consider tightening quality checks.`,
      metric: `${refundRate.toFixed(2)}% refund rate`,
    },
    {
      type: "positive",
      icon: "users",
      title: "Repeat customers are growing",
      message: `${repeatCustomers} of ${customerCount} customers (${repeatRate.toFixed(1)}%) have ordered 2+ times. Consider launching a loyalty program to convert more first-time buyers into repeat customers.`,
      metric: `${repeatRate.toFixed(1)}% repeat rate`,
    },
    {
      type: "info",
      icon: "clock",
      title: "Peak sales window identified",
      message: `Your highest sales intensity is between 11:00–14:00 and 18:00–21:00 local time. Schedule your top-performing staff (${staff[0]?.name || "Store Manager"}) during these windows to maximize conversion.`,
      metric: "11am–2pm, 6pm–9pm",
    },
    {
      type: "info",
      icon: "lightbulb",
      title: "Settlement cadence recommendation",
      message: `You have ${formatMoney(monthRevenue * 0.18)} NGN in pending settlements. Settling to your primary bank (${BANK_ACCOUNTS[0].bank}) every 3 days reduces idle capital and improves cash-flow forecasting.`,
      metric: "Settle every 3 days",
    },
    {
      type: "positive",
      icon: "sparkles",
      title: "Top product is outperforming",
      message: `"${topProducts[0]?.name}" is your best seller with ${topProducts[0]?.sold} units sold and ${topProducts[0]?.growth > 0 ? "+" : ""}${topProducts[0]?.growth}% growth. Bundle it with "${topProducts[3]?.name}" to lift average order value further.`,
      metric: `+${topProducts[0]?.growth}% growth`,
    },
  ];

  // Customer retention metrics
  const churnRate = Math.max(2, Math.round(15 - repeatRate * 0.2));
  const retention = {
    newCustomers30d: Math.round(customerCount * 0.35),
    returningCustomers30d: repeatCustomers,
    churnRate,
    retentionRate: Math.round(100 - churnRate),
    avgLifetimeValue: avgOrderValue * 4.2,
    avgOrdersPerCustomer: customerCount > 0 ? totalCount / customerCount : 0,
  };

  // Growth recommendations
  const recommendations = [
    {
      priority: "high",
      title: "Launch a 7-day flash sale on top 3 products",
      impact: "Projected +18% revenue",
      effort: "Medium",
      timeline: "1 week",
      icon: "zap",
    },
    {
      priority: "high",
      title: "Introduce a tiered loyalty program",
      impact: "+22% repeat purchase rate",
      effort: "High",
      timeline: "3 weeks",
      icon: "crown",
    },
    {
      priority: "medium",
      title: "Extend operating hours on weekends",
      impact: "+12% weekend sales",
      effort: "Low",
      timeline: "2 weeks",
      icon: "clock",
    },
    {
      priority: "medium",
      title: "Accept crypto payments to reach new segments",
      impact: "+8% new customers",
      effort: "Low",
      timeline: "1 week",
      icon: "bitcoin",
    },
    {
      priority: "low",
      title: "Optimize inventory turnover for slow movers",
      impact: "-15% holding cost",
      effort: "Medium",
      timeline: "1 month",
      icon: "package",
    },
  ];

  // Summary cards for invoices tab
  const outstandingAmount = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);

  // Settlement summary for settlements tab
  const availableBalance = Math.round(monthRevenue * 0.45);
  const pendingSettlements = settlements
    .filter((s) => s.status === "pending" || s.status === "processing")
    .reduce((s, x) => s + x.amount, 0);
  const settledThisMonth = settlements
    .filter((s) => s.status === "completed")
    .reduce((s, x) => s + x.amount, 0);

  return NextResponse.json({
    merchant,
    kpis: {
      todayRevenue,
      todayOrders: todayPayments.length,
      weekRevenue,
      weekOrders: weekPayments.length,
      monthRevenue,
      monthOrders: monthPayments.length,
      yearRevenue,
      yearOrders: yearPayments.length,
      totalRevenue,
      totalOrders: totalCount,
      avgOrderValue,
      refundRate,
      customerCount,
      repeatCustomerRate,
      newCustomers30d: retention.newCustomers30d,
    },
    revenueTrend,
    salesByCategory,
    salesByMethod,
    topProducts,
    topCustomers,
    heatmap,
    staff,
    invoices: {
      summary: {
        outstanding: outstandingAmount,
        overdue: overdueAmount,
        paidThisMonth,
        totalCount: invoices.length,
        pendingCount: invoices.filter((i) => i.status === "pending").length,
        overdueCount: invoices.filter((i) => i.status === "overdue").length,
      },
      list: invoices,
    },
    settlements: {
      summary: {
        availableBalance,
        pendingSettlements,
        settledThisMonth,
        nextSettlementDate: new Date(now.getTime() + 2 * 86400000).toISOString(),
      },
      history: settlements,
      bankAccounts: BANK_ACCOUNTS,
    },
    insights,
    retention,
    recommendations,
    generatedAt: new Date().toISOString(),
  });
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(amount));
}
