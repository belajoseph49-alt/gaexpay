"use client";

import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, CheckCircle2, XCircle, ShoppingBag, Receipt } from "lucide-react";
import { SectionHeader, StatusBadge, EmptyState } from "./shared";
import { toast } from "sonner";

export function ProductsSection() {
  const merchants = useFetch<{ merchants: any[] }>("/api/merchants");
  const billers = useFetch<{ billers: any[] }>("/api/billers");

  const merchantList = merchants.data?.merchants ?? [];
  const billerList = billers.data?.billers ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Products & Services"
        description="Manage billers, merchants, and product approvals"
        icon={ShoppingBag}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Billers */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber-600" /> Biller Categories ({billerList.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {billers.loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : billerList.length === 0 ? (
              <EmptyState message="No billers" icon={Receipt} />
            ) : (
              billerList.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-600 text-sm">
                    {b.logo || "🧾"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.category}</p>
                  </div>
                  <StatusBadge status={b.status} />
                  <Switch
                    checked={b.status === "active"}
                    onCheckedChange={(v) => toast.info(`Biller ${v ? "enabled" : "disabled"} (demo)`)}
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Merchants */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Store className="h-4 w-4 text-violet-600" /> Merchant Approvals ({merchantList.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {merchants.loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : merchantList.length === 0 ? (
              <EmptyState message="No merchants" icon={Store} />
            ) : (
              merchantList.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-600 text-sm">
                    {m.logo || m.name?.[0] || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.category} · ⭐ {m.rating}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-violet-600">Approved</Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600" onClick={() => toast.success("Merchant re-approved")}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => toast.success("Merchant disabled")}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
