"use client";

import { useState } from "react";
import {
  Download, Upload, Trash2, Database, HardDrive, Clock,
  CheckCircle2, Loader2, Archive, Settings as SettingsIcon, RefreshCw,
} from "lucide-react";
import { SectionHeader, apiAction, showError } from "./shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { useTranslation } from "@/hooks/use-translation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BackupSection() {
  const { t } = useTranslation();
  const { data, reload } = useFetch<any>("/api/admin/backup");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const backups = data?.backups ?? [];
  const settings = data?.settings ?? { autoBackup: false, frequency: "daily", maxBackups: 30 };

  async function createBackup(format: "sql" | "gzip" | "zip" = "gzip") {
    setCreating(true);
    try {
      const r = await apiAction(`/api/admin/backup?format=${format}&label=manual`, "POST", undefined, "Backup created");
      if (!r.ok) showError(r.error || "Failed");
      else reload();
    } finally {
      setCreating(false);
    }
  }

  async function deleteBackup(filename: string) {
    setDeleting(filename);
    try {
      const r = await apiAction(`/api/admin/backup?filename=${encodeURIComponent(filename)}`, "DELETE", undefined, "Backup deleted");
      if (!r.ok) showError(r.error || "Failed");
      else reload();
    } finally {
      setDeleting(null);
    }
  }

  async function downloadBackup(filename: string) {
    try {
      const res = await fetch(`/api/admin/backup/download?filename=${encodeURIComponent(filename)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  }

  async function updateSettings(key: string, value: any) {
    const body: any = {};
    body[key] = value;
    try {
      const r = await apiAction("/api/admin/backup", "PATCH", body, "Settings updated");
      if (!r.ok) showError(r.error || "Failed");
      else reload();
    } catch {}
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sauvegarde & Restauration"
        subtitle="Gérez les sauvegardes de la base de données"
        icon={Database}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{backups.length}</p>
              <p className="text-xs text-muted-foreground">Sauvegardes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-500">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {backups.reduce((s: number, b: any) => s + (b.size || 0), 0) > 1024 * 1024
                  ? `${(backups.reduce((s: number, b: any) => s + (b.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`
                  : `${(backups.reduce((s: number, b: any) => s + (b.size || 0), 0) / 1024).toFixed(0)} KB`}
              </p>
              <p className="text-xs text-muted-foreground">Espace utilisé</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{settings.autoBackup ? "ON" : "OFF"}</p>
              <p className="text-xs text-muted-foreground">Sauvegarde auto</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Create backup */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Créer une sauvegarde</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => createBackup("gzip")} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Sauvegarde compressée (GZIP)
          </Button>
          <Button variant="outline" onClick={() => createBackup("sql")} disabled={creating}>
            <Download className="h-4 w-4 mr-2" /> Export SQL
          </Button>
          <Button variant="outline" onClick={() => createBackup("zip")} disabled={creating}>
            <Download className="h-4 w-4 mr-2" /> Export ZIP
          </Button>
        </div>
      </Card>

      {/* Auto-backup settings */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" /> Planification automatique
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Sauvegarde automatique</p>
              <p className="text-xs text-muted-foreground">Crée des sauvegardes automatiquement selon la planification</p>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={(v) => updateSettings("autoBackup", v)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-xs">Fréquence</Label>
              <Select
                value={settings.frequency}
                onValueChange={(v) => updateSettings("frequency", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Toutes les heures</SelectItem>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs">Nombre maximum de sauvegardes</Label>
              <Select
                value={String(settings.maxBackups)}
                onValueChange={(v) => updateSettings("maxBackups", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 sauvegardes</SelectItem>
                  <SelectItem value="30">30 sauvegardes</SelectItem>
                  <SelectItem value="60">60 sauvegardes</SelectItem>
                  <SelectItem value="100">100 sauvegardes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Backups list */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Sauvegardes existantes</h3>
          <Button variant="ghost" size="sm" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
          </Button>
        </div>
        {backups.length === 0 ? (
          <div className="py-12 text-center">
            <Database className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Aucune sauvegarde. Créez-en une ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((b: any) => (
              <div key={b.filename} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  b.type === "gzip" ? "bg-emerald-500/15 text-emerald-500" :
                  b.type === "zip" ? "bg-violet-500/15 text-violet-500" :
                  "bg-sky-500/15 text-sky-500"
                )}>
                  {b.type === "gzip" ? <Archive className="h-5 w-5" /> :
                   b.type === "zip" ? <Archive className="h-5 w-5" /> :
                   <Database className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.filename}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{b.sizeFormatted}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">{b.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => downloadBackup(b.filename)} title="Download">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-8 w-8 p-0 text-rose-600"
                    onClick={() => deleteBackup(b.filename)}
                    disabled={deleting === b.filename}
                    title="Delete"
                  >
                    {deleting === b.filename ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
