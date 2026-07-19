"use client";

import { motion } from "framer-motion";
import {
  MapPin, TrendingUp, Store, Globe, Navigation, Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatCompact } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

const COUNTRY_FLAGS: Record<string, string> = {
  Nigeria: "🇳🇬",
  "South Africa": "🇿🇦",
  Uganda: "🇺🇬",
  "Côte d'Ivoire": "🇨🇮",
  Kenya: "🇰🇪",
  Ghana: "🇬🇭",
};

export function SpendingMapView() {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { data } = useFetch<any>("/api/spending-map");

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { locations, cities, totalSpent, merchantCount, cityCount } = data;
  const maxSpent = Math.max(...locations.map((l: any) => l.totalSpent), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Spending Map</h1>
        <p className="text-sm text-muted-foreground">Where your money goes — by location & merchant</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-500 mb-3">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-xl font-bold tabular-nums">
            <AnimatedNumber value={totalSpent} prefix={symbol} decimals={2} />
          </p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-500 mb-3">
            <Store className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Merchants</p>
          <p className="text-xl font-bold tabular-nums">{merchantCount}</p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-500 mb-3">
            <Globe className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Cities</p>
          <p className="text-xl font-bold tabular-nums">{cityCount}</p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-500 mb-3">
            <Award className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">Top City</p>
          <p className="text-xl font-bold">{cities[0]?.city || "—"}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map visualization (simplified) */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold mb-1">Spending Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">By merchant — bar length represents spending volume</p>

          {locations.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No spending data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.slice(0, 10).map((loc: any, i: number) => {
                const pct = (loc.totalSpent / maxSpent) * 100;
                const colors = [
                  "from-violet-500 to-purple-600",
                  "from-amber-500 to-orange-600",
                  "from-violet-500 to-purple-600",
                  "from-sky-500 to-blue-600",
                  "from-rose-500 to-pink-600",
                  "from-purple-500 to-purple-600",
                ];
                const gradient = colors[i % colors.length];
                return (
                  <motion.div
                    key={loc.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{COUNTRY_FLAGS[loc.country] || "🌍"}</span>
                        <span className="text-sm font-medium truncate">{loc.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{loc.city}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{fmt(loc.totalSpent)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.05 + 0.2, duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{loc.txCount} transactions · {loc.category}</span>
                      <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% of top</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        {/* City breakdown */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">By City</h3>
          <p className="text-xs text-muted-foreground mb-4">Spending by location</p>
          <div className="space-y-3">
            {cities.map((city: any, i: number) => {
              const pct = (city.totalSpent / (cities[0]?.totalSpent || 1)) * 100;
              return (
                <div key={`${city.city}-${city.country}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{COUNTRY_FLAGS[city.country] || "🌍"}</span>
                      <div>
                        <p className="text-sm font-medium">{city.city}</p>
                        <p className="text-[10px] text-muted-foreground">{city.country} · {city.merchants} merchants</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCompact(city.totalSpent, "NGN")}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        i === 0 ? "bg-violet-500" : i === 1 ? "bg-amber-500" : "bg-sky-500",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Full merchant table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">All Merchants</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Merchant</th>
                <th className="pb-2 pr-3 font-medium">Location</th>
                <th className="pb-2 pr-3 font-medium">Category</th>
                <th className="pb-2 pr-3 font-medium text-right">Txns</th>
                <th className="pb-2 font-medium text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc: any, i: number) => (
                <tr key={loc.name} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 pr-3 font-medium">{loc.name}</td>
                  <td className="py-2.5 pr-3 text-xs">{COUNTRY_FLAGS[loc.country]} {loc.city}, {loc.country}</td>
                  <td className="py-2.5 pr-3 capitalize text-xs">{loc.category}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{loc.txCount}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{fmt(loc.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
