"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plug, LayoutGrid, List, Activity, BarChart3, ScrollText } from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { OverviewDashboard } from "./api-management/overview-dashboard";
import { ApiListTab } from "./api-management/api-list-tab";
import { ApiEditModal } from "./api-management/edit-modal";
import { LogsViewer } from "./api-management/logs-viewer";
import { StatsTab } from "./api-management/stats-tab";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "overview" | "list" | "logs" | "stats";

const TABS: { id: Tab; label: string; icon: typeof Plug }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "list", label: "API Configs", icon: List },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "stats", label: "Statistics", icon: BarChart3 },
];

export function ApiManagementView() {
  const [tab, setTab] = useState<Tab>("overview");
  const [editConfig, setEditConfig] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: configsData, reload } = useFetch<{ configs: any[] }>("/api/admin/api-configs");
  const { data: statsData, reload: reloadStats } = useFetch<any>("/api/admin/api-configs/stats");

  const configs = configsData?.configs ?? [];
  const stats = statsData ?? {};

  const handleEdit = (config: any) => {
    setEditConfig(config);
    setEditOpen(true);
  };

  const handleSaved = () => {
    setEditOpen(false);
    setEditConfig(null);
    reload();
    reloadStats();
    toast.success("API configuration saved");
  };

  const handleTest = async (configId: string) => {
    const t = toast.loading("Testing connection...");
    try {
      const res = await fetch(`/api/admin/api-configs/${configId}/test`, { method: "POST" });
      const data = await res.json();
      toast.dismiss(t);
      if (data.success) {
        toast.success(`Connection OK · ${data.responseTimeMs}ms`);
      } else {
        toast.error(`Test failed: ${data.message || "Unknown error"}`);
      }
      reload();
    } catch {
      toast.dismiss(t);
      toast.error("Test failed: network error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" /> API Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure, test, and monitor all external service integrations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-lg bg-violet-500/10 px-2.5 py-1 font-medium text-violet-600">
            {configs.filter((c) => c.enabled).length} active
          </span>
          <span className="rounded-lg bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {configs.length} total
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "overview" && (
          <OverviewDashboard configs={configs} onEdit={handleEdit} onTest={handleTest} />
        )}
        {tab === "list" && (
          <ApiListTab configs={configs} onEdit={handleEdit} onTest={handleTest} reload={reload} />
        )}
        {tab === "logs" && <LogsViewer configs={configs} />}
        {tab === "stats" && <StatsTab stats={stats} loading={!statsData} />}
      </motion.div>

      {/* Edit Modal */}
      <ApiEditModal open={editOpen} config={editConfig} onClose={() => setEditOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
