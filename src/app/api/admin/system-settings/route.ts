import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import {
  getSetting,
  setSetting,
  DEFAULT_GENERAL_SETTINGS,
} from "@/lib/system-settings";

export const dynamic = "force-dynamic";

// GET — all system settings grouped by category
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "settings.view");
    if ("error" in auth) return auth.error;

    // Ensure defaults exist (lazy seed)
    const defaults = Object.entries(DEFAULT_GENERAL_SETTINGS).map(([key, value]) => ({
      key,
      value,
      category: key.split(".")[0],
    }));
    for (const d of defaults) {
      const existing = await getSetting(d.key);
      if (existing === null) {
        await db.systemSetting.create({ data: { key: d.key, value: d.value, category: d.category } });
      }
    }

    const rows = await db.systemSetting.findMany({ orderBy: { category: "asc" } });

    // Group by category
    const grouped: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = {};
      grouped[row.category][row.key] = row.value;
    }

    return NextResponse.json({ settings: grouped });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — update one or more settings (body: { updates: { key: value, ... } } OR { key, value })
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "settings.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { key, value, updates } = body as {
      key?: string;
      value?: unknown;
      updates?: Record<string, unknown>;
    };

    if (!key && !updates) {
      return NextResponse.json({ error: "key or updates required" }, { status: 400 });
    }

    const entries: { key: string; value: unknown; category?: string }[] = [];
    if (key) entries.push({ key, value, category: key.split(".")[0] });
    if (updates) {
      for (const [k, v] of Object.entries(updates)) {
        entries.push({ key: k, value: v, category: k.split(".")[0] });
      }
    }

    for (const e of entries) {
      await setSetting(e.key, e.value, e.category);
    }

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "settings.update",
        entity: "SystemSetting",
        entityId: entries.map((e) => e.key).join(","),
        severity: "warning",
        details: JSON.stringify({ keys: entries.map((e) => e.key) }),
      },
    });

    return NextResponse.json({ success: true, updated: entries.length });
  } catch (e) {
    return apiCatch(e);
  }
}
