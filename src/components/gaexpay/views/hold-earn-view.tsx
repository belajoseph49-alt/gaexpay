"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Sparkles, Switch, ToggleLeft, ToggleRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export function HoldEarnView() {
  const { data } = useFetch<{ rate: number; totalEarned: number; history: any[]; eligibleBalance: number }>("/api/hold-earn");
  const { fmt } = useFormatMoney();
  const [autoCompound, setAutoCompound] = useState(true);

  const rate = data?.rate ?? 2; // % per week
  const totalEarned = data?.totalEarned ?? 0;
  const eligibleBalance = data?.eligibleBalance ?? 0;
  const history = data?.history ?? [
    { day: "Mon", amount: 12.5 },
    { day: "Tue", amount: 14.2 },
    { day: "Wed", amount: 13.8 },
    { day: "Thu", amount: 15.1 },
    { day: "Fri", amount: 16.3 },
    { day: "Sat", amount: 15.9 },
    { day: "Sun", amount: 17.2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hold & Earn</h1>
        <p className="text-sm text-muted-foreground">Earn daily rewards just for holding your balance — no locks, no hoops</p>
      </div>

      {/* Hero card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium text-white/80">Current Reward Rate</span>
          </div>
          <h2 className="text-4xl font-bold">{rate}% <span className="text-lg font-normal text-white/70">per week</span></h2>
          <p className="mt-2 text-sm text-white/70">That's ~{(rate / 7).toFixed(2)}% daily — auto-credited to your wallet every 24h</p>
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/10 backdrop-blur p-4">
              <p className="text-xs text-white/60 uppercase tracking-wider">Total Earned</p>
              <p className="text-2xl font-bold mt-1">${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-4">
              <p className="text-xs text-white/60 uppercase tracking-wider">Eligible Balance</p>
              <p className="text-2xl font-bold mt-1">${eligibleBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Auto-compound toggle */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Auto-Compounding</p>
              <p className="text-xs text-muted-foreground">Automatically reinvest your daily earnings</p>
            </div>
          </div>
          <SwitchUI checked={autoCompound} onCheckedChange={setAutoCompound} />
        </div>
      </Card>

      {/* Daily earnings chart */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Daily Earnings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
            <YAxis axisLine={false} tickLine={false} className="text-xs" width={40} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Area type="monotone" dataKey="amount" stroke="#8B5CF6" strokeWidth={2} fill="url(#earnGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* How it works */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">How it works</h3>
        <div className="space-y-3">
          {[
            { step: 1, title: "Hold your balance", desc: "Keep funds in your GaexPay wallet — stablecoins or fiat." },
            { step: 2, title: "Earn daily", desc: "Rewards are calculated every 24h based on your eligible balance." },
            { step: 3, title: "Auto-credited", desc: "Earnings are automatically added to your wallet — no claim needed." },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-500 text-sm font-bold">{item.step}</div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
