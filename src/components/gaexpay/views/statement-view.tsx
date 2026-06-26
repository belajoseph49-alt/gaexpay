"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, Receipt, ArrowDownRight, ArrowUpRight, Printer, Mail, FileDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDateTime } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

export function StatementView() {
  const { t } = useTranslation();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { data } = useFetch<any>(`/api/statement?month=${month}`);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { user, wallets, transactions, summary, categories, generatedAt } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("statement.title")}</h1>
          <p className="text-sm text-muted-foreground">{summary.monthName} · Generated {new Date(generatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Statement emailed")}>
            <Mail className="h-4 w-4 mr-1.5" /> Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            // Trigger browser print dialog (user can "Save as PDF")
            window.print();
            toast.success("Use 'Save as PDF' in the print dialog to download");
          }}>
            <FileDown className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Button size="sm" onClick={() => window.open(`/api/export?format=csv&days=90`, "_blank")}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Printable statement area */}
      <div className="printable-statement space-y-6">
      {/* Month navigator */}
      <Card className="flex items-center justify-between p-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{summary.monthName}</p>
          <p className="text-xs text-muted-foreground">{transactions.length} transactions</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} disabled={month >= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Card>

      {/* Account holder info */}
      <Card className="p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Account Holder</p>
            <p className="text-lg font-bold">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">{user.phone}</p>
            {user.address && <p className="text-xs text-muted-foreground mt-1">{user.address}, {user.country}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Wallets</p>
            <div className="space-y-1">
              {wallets.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between text-sm">
                  <span>{w.currency} · {w.label}</span>
                  <span className="font-medium tabular-nums">{formatMoney(w.balance, w.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500 mb-3">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Inflow</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">
            <AnimatedNumber value={summary.totalIn} prefix={symbol} decimals={2} />
          </p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-500 mb-3">
            <TrendingDown className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Outflow</p>
          <p className="text-xl font-bold text-rose-600 tabular-nums">
            <AnimatedNumber value={summary.totalOut} prefix={symbol} decimals={2} />
          </p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary mb-3">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Net Flow</p>
          <p className={cn("text-xl font-bold tabular-nums", summary.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
            <AnimatedNumber value={summary.net} prefix={symbol} decimals={2} />
          </p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-500 mb-3">
            <Receipt className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Fees Paid</p>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber value={summary.totalFees} prefix={symbol} decimals={2} />
          </p>
        </Card>
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Spending by Category</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c: any) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.count} transactions</p>
                </div>
                <span className="text-sm font-bold tabular-nums">{fmt(c.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transaction table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Transaction Details</h3>
        {transactions.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No transactions in {summary.monthName}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Reference</th>
                  <th className="pb-2 pr-3 font-medium">Description</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map((t: any) => {
                  const isCredit = t.direction === "credit";
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{t.reference.slice(0, 14)}</td>
                      <td className="py-2.5 pr-3 max-w-[200px] truncate">{t.counterpartyName || t.description}</td>
                      <td className="py-2.5 pr-3 capitalize text-xs">{t.type}</td>
                      <td className={cn("py-2.5 pr-3 text-right font-semibold tabular-nums", isCredit ? "text-emerald-600" : "")}>
                        {isCredit ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className={cn("text-[10px]",
                          t.status === "completed" ? "text-emerald-600" :
                          t.status === "failed" ? "text-rose-600" : "text-amber-600")}>
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length > 50 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Showing 50 of {transactions.length} transactions. Download CSV for full list.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Footer note */}
      <Card className="flex items-start gap-3 border-muted p-4">
        <FileText className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          This statement was generated by GaexPay on {new Date(generatedAt).toLocaleString()}. For discrepancies, please contact support within 30 days. Transaction details are subject to our Terms & Conditions.
        </p>
      </Card>
      </div>
    </div>
  );
}
