"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Code2, ArrowUpRight, Star, Loader2, Sparkles,
  Puzzle, ShoppingBag, Gamepad2, Wrench, Users, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "utilities", label: "Utilities", icon: Wrench },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "social", label: "Social", icon: Users },
];

const COLOR_MAP: Record<string, string> = {
  violet: "from-violet-500 to-purple-600",
  emerald: "from-emerald-500 to-teal-600",
  rose: "from-rose-500 to-pink-600",
  amber: "from-amber-500 to-orange-600",
  sky: "from-sky-500 to-blue-600",
  teal: "from-teal-500 to-cyan-600",
  orange: "from-orange-500 to-red-600",
  purple: "from-purple-500 to-violet-600",
  indigo: "from-indigo-500 to-blue-600",
  slate: "from-slate-600 to-slate-800",
};

export function MiniAppsView() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<{ apps: any[]; featured: any[] }>("/api/mini-apps");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const apps = data?.apps ?? [];
  const featured = data?.featured ?? [];

  const filtered = apps.filter((a) => {
    if (category !== "all" && a.category !== category) return false;
    if (search && !`${a.name} ${a.description} ${a.developer}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openApp = (app: any) => {
    toast.success(`Opening ${app.name}...`, {
      description: app.url ? `Launching ${app.url}` : "Demo mode — apps coming soon",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mini Apps</h1>
          <p className="text-sm text-muted-foreground">
            Discover third-party apps built on the GaexPay platform.
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info("Developer portal coming soon")}>
          <Code2 className="h-4 w-4 mr-1.5" /> Build your app
        </Button>
      </div>

      {/* Featured carousel */}
      {!loading && featured.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h3 className="font-semibold">Featured Apps</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
            {featured.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="shrink-0 w-72"
              >
                <Card className="relative overflow-hidden border-0 p-0 h-40">
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", COLOR_MAP[a.color] || "from-violet-500 to-purple-600")} />
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-xl" />
                  <div className="relative h-full p-4 text-white flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{a.icon}</span>
                      <Badge className="bg-white/20 text-white border-0">Featured</Badge>
                    </div>
                    <div>
                      <h4 className="font-bold text-base leading-tight">{a.name}</h4>
                      <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{a.description}</p>
                      <button
                        onClick={() => openApp(a)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-medium backdrop-blur hover:bg-white/30 transition"
                      >
                        Open <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps, developers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                category === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apps grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Puzzle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No apps match your search.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group p-4 card-lift">
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl shadow",
                    COLOR_MAP[a.color] || "from-violet-500 to-purple-600",
                  )}>
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold truncate">{a.name}</h4>
                      {a.featured && <Badge variant="outline" className="text-[9px] text-violet-600 border-violet-500/30 shrink-0">★</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{a.developer}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {a.rating.toFixed(1)}
                      </span>
                      <span>·</span>
                      <span>{(a.installs / 1000).toFixed(1)}k installs</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">{a.description}</p>
                <Button size="sm" className="w-full" onClick={() => openApp(a)}>
                  Open <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Developer CTA */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-violet-950 to-purple-900 p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/30 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-md">
            <Badge className="bg-violet-500/30 text-violet-200 border-0 mb-2">
              <Code2 className="h-3 w-3 mr-1" /> For Developers
            </Badge>
            <h3 className="font-bold text-lg mb-1">Build your own Mini App</h3>
            <p className="text-sm text-white/70">
              Reach 1M+ GaexPay users. Use our payments, identity, and wallet APIs to launch your app in days.
            </p>
          </div>
          <Button variant="secondary" className="bg-white text-violet-700 hover:bg-white/90">
            <Code2 className="h-4 w-4 mr-1.5" /> Start Building
          </Button>
        </div>
      </Card>
    </div>
  );
}
