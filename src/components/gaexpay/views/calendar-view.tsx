"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight,
  Repeat, Clock, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CalendarView() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { data } = useFetch<any>(`/api/calendar?month=${month}`);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(null);
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { days, firstDayOfWeek, monthName, summary } = data;
  const selectedDayData = selectedDay ? days.find((d: any) => d.date === selectedDay) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Calendar</h1>
          <p className="text-sm text-muted-foreground">Scheduled transfers & transaction history</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-500 mb-3">
            <Repeat className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Scheduled This Month</p>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber value={summary.totalScheduled} prefix={symbol} decimals={2} />
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{summary.scheduledCount} upcoming transfers</p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-500 mb-3">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber value={summary.totalSpent} prefix={symbol} decimals={2} />
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{summary.txCount} transactions</p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500 mb-3">
            <ArrowDownRight className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Received</p>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber value={summary.totalReceived} prefix={symbol} decimals={2} />
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">inflow this month</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="p-5 lg:col-span-2">
          {/* Month navigator */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{monthName}</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Days */}
            {days.map((day: any) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                className={cn(
                  "relative aspect-square rounded-lg border p-1.5 text-left transition hover:border-primary/40 hover:bg-muted/30",
                  day.isToday && "border-primary ring-1 ring-primary/30",
                  selectedDay === day.date && "border-primary bg-primary/10",
                  day.schedules.length === 0 && day.transactions.length === 0 && "opacity-50",
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  day.isToday && "text-primary font-bold",
                )}>
                  {day.date}
                </span>
                {/* Scheduled indicator */}
                {day.schedules.length > 0 && (
                  <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                )}
                {/* Transaction indicators */}
                {day.transactions.length > 0 && (
                  <div className="absolute bottom-1 left-1 flex gap-0.5">
                    {day.totalInflow > 0 && <div className="h-1 w-1 rounded-full bg-emerald-500" />}
                    {day.totalOutflow > 0 && <div className="h-1 w-1 rounded-full bg-rose-500" />}
                  </div>
                )}
                {/* Amount preview */}
                {(day.totalOutflow > 0 || day.schedules.length > 0) && (
                  <span className="absolute bottom-1 right-1 text-[8px] font-medium text-muted-foreground">
                    {day.schedules.length > 0
                      ? `⏰${day.schedules.length}`
                      : `₦${(day.totalOutflow / 1000).toFixed(0)}k`}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Scheduled</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Inflow</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Outflow</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-primary" /> Today</span>
          </div>
        </Card>

        {/* Day detail panel */}
        <Card className="p-5">
          {selectedDayData ? (
            <div>
              <h3 className="font-semibold mb-1">
                {MONTHS[data.month]} {selectedDayData.date}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {selectedDayData.schedules.length + selectedDayData.transactions.length} items
              </p>

              {selectedDayData.schedules.length === 0 && selectedDayData.transactions.length === 0 ? (
                <div className="grid place-items-center py-12 text-center">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No activity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {/* Scheduled transfers */}
                  {selectedDayData.schedules.map((s: any) => (
                    <div key={s.id} className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-500">
                          <Repeat className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{s.recipientName}</p>
                            <span className="text-sm font-semibold tabular-nums">{formatMoney(s.amount, s.currency)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {s.time}
                            </span>
                            <Badge variant="outline" className="text-[9px] capitalize">{s.frequency}</Badge>
                          </div>
                          {s.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.note}</p>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Completed transactions */}
                  {selectedDayData.transactions.map((t: any) => (
                    <div key={t.id} className="flex items-start gap-2 p-2">
                      <div className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        t.direction === "credit" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500",
                      )}>
                        {t.direction === "credit" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{t.counterpartyName || t.description}</p>
                          <span className={cn("text-sm font-semibold tabular-nums", t.direction === "credit" && "text-emerald-600")}>
                            {t.direction === "credit" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {t.time}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{t.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid place-items-center py-16 text-center">
              <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Select a day to view details</p>
              <p className="text-xs text-muted-foreground mt-1">Click any date on the calendar</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
