import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import {
  getSetting,
  setSetting,
  ensureSetting,
  DEFAULT_TEMPLATES,
} from "@/lib/system-settings";

export const dynamic = "force-dynamic";

// GET — list all email/SMS/push templates
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "templates.view");
    if ("error" in auth) return auth.error;

    const [email, sms, push] = await Promise.all([
      ensureSetting("templates.email", DEFAULT_TEMPLATES.email, "templates"),
      ensureSetting("templates.sms", DEFAULT_TEMPLATES.sms, "templates"),
      ensureSetting("templates.push", DEFAULT_TEMPLATES.push, "templates"),
    ]);

    return NextResponse.json({ email, sms, push });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — edit a single template (body: { channel, id, updates })
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "templates.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { channel, id, updates } = body as {
      channel: "email" | "sms" | "push";
      id: string;
      updates: Record<string, unknown>;
    };

    if (!channel || !id) {
      return NextResponse.json({ error: "channel and id required" }, { status: 400 });
    }

    const settingKey = `templates.${channel}`;
    const list = (await getSetting<any[]>(settingKey)) ?? [];
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    list[idx] = { ...list[idx], ...updates, id: list[idx].id };
    await setSetting(settingKey, list, "templates");

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "template.update",
        entity: "SystemSetting",
        entityId: id,
        severity: "info",
        details: JSON.stringify({ channel, id, fields: Object.keys(updates) }),
      },
    });

    return NextResponse.json({ success: true, template: list[idx] });
  } catch (e) {
    return apiCatch(e);
  }
}

// POST — create a new template (body: { channel, ...fields })
export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, "templates.create");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { channel, ...fields } = body as {
      channel: "email" | "sms" | "push";
      [k: string]: unknown;
    };

    if (!channel) return NextResponse.json({ error: "channel required" }, { status: 400 });

    const settingKey = `templates.${channel}`;
    const list = (await getSetting<any[]>(settingKey)) ?? [];
    const newTpl = {
      id: `tpl_${channel}_${Date.now()}`,
      status: "active",
      variables: [],
      ...fields,
    };
    const next = [...list, newTpl];
    await setSetting(settingKey, next, "templates");

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "template.create",
        entity: "SystemSetting",
        entityId: newTpl.id,
        severity: "info",
        details: JSON.stringify({ channel, name: (fields as any).name }),
      },
    });

    return NextResponse.json({ success: true, template: newTpl });
  } catch (e) {
    return apiCatch(e);
  }
}
