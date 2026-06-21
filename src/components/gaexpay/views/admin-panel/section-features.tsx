"use client";

import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { Boxes, Power } from "lucide-react";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  const { data, loading, reload } = useFetch<{ features: any[] }>("/api/admin/features");
  const features = data?.features ?? [];

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const f of features) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Modules & Features"
        description={`${features.length} feature flags · toggle modules on/off per category`}
        icon={Boxes}
      />

      {loading ? <LoadingTable rows={5} /> : features.length === 0 ? (
        <EmptyState message="No feature flags configured" icon={Boxes} />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, list]) => (
            <Card key={category} className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                <span className="capitalize">{category}</span>
                <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Visible To</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((f) => (
                      <TableRow key={f.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-medium text-sm font-mono">{f.key}</p>
                          <p className="text-xs text-muted-foreground">{f.name}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {safeParse(f.accountTypes).map((t: string) => (
                              <Badge key={`at-${t}`} variant="outline" className="text-[9px] capitalize">{t}</Badge>
                            ))}
                            {safeParse(f.roles).map((r: string) => (
                              <Badge key={`r-${r}`} variant="outline" className="text-[9px] capitalize bg-primary/5">{r}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={f.enabled}
                            onCheckedChange={async (v) => {
                              const r = await apiAction(`/api/admin/features`, "PATCH", { id: f.id, enabled: v }, v ? "Feature enabled" : "Feature disabled");
                              if (!r.ok) showError(r.error || "Failed"); else reload();
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function safeParse(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const r = JSON.parse(s);
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}
