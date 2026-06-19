import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const year = month ? parseInt(month.split("-")[0]) : now.getFullYear();
  const mon = month ? parseInt(month.split("-")[1]) - 1 : now.getMonth();

  const startDate = new Date(year, mon, 1);
  const endDate = new Date(year, mon + 1, 1);

  // Get scheduled transfers with nextRunAt in this month
  const scheduled = await db.scheduledTransfer.findMany({
    where: {
      userId: DEMO_USER_ID,
      status: "active",
    },
    orderBy: { nextRunAt: "asc" },
  });

  // Filter to this month's runs
  const monthSchedules = scheduled.filter((s) => {
    const d = new Date(s.nextRunAt);
    return d >= startDate && d < endDate;
  });

  // Also get completed transactions this month (for calendar display)
  const transactions = await db.transaction.findMany({
    where: {
      userId: DEMO_USER_ID,
      createdAt: { gte: startDate, lt: endDate },
      status: "completed",
    },
    orderBy: { createdAt: "asc" },
  });

  // Build calendar days
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, mon, 1).getDay(); // 0 = Sunday

  const days: {
    date: number;
    schedules: any[];
    transactions: any[];
    totalOutflow: number;
    totalInflow: number;
    isToday: boolean;
  }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, mon, d);
    const dayStart = new Date(year, mon, d, 0, 0, 0);
    const dayEnd = new Date(year, mon, d, 23, 59, 59);

    const daySchedules = monthSchedules.filter((s) => {
      const sd = new Date(s.nextRunAt);
      return sd >= dayStart && sd <= dayEnd;
    });

    const dayTx = transactions.filter((t) => {
      const td = new Date(t.createdAt);
      return td >= dayStart && td <= dayEnd;
    });

    const isToday = date.toDateString() === now.toDateString();

    days.push({
      date: d,
      schedules: daySchedules.map((s) => ({
        id: s.id,
        recipientName: s.recipientName,
        amount: s.amount,
        currency: s.currency,
        frequency: s.frequency,
        method: s.method,
        note: s.note,
        time: new Date(s.nextRunAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
      })),
      transactions: dayTx.map((t) => ({
        id: t.id,
        description: t.description,
        counterpartyName: t.counterpartyName,
        amount: t.amount,
        currency: t.currency,
        direction: t.direction,
        type: t.type,
        time: new Date(t.createdAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
      })),
      totalOutflow: dayTx.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0) +
        daySchedules.reduce((s, sch) => s + sch.amount, 0),
      totalInflow: dayTx.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0),
      isToday,
    });
  }

  const monthName = startDate.toLocaleDateString("en", { month: "long", year: "numeric" });

  // Summary stats
  const totalScheduled = monthSchedules.reduce((s, sch) => s + sch.amount, 0);
  const totalSpent = transactions.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);
  const totalReceived = transactions.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);

  return NextResponse.json({
    days,
    firstDayOfWeek,
    monthName,
    year,
    month: mon,
    summary: {
      totalScheduled,
      scheduledCount: monthSchedules.length,
      totalSpent,
      totalReceived,
      txCount: transactions.length,
    },
  });
}
