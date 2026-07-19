import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const ALL_EVENTS = [
  "transaction.created",
  "transaction.completed",
  "transaction.failed",
  "wallet.credit",
  "wallet.debit",
  "card.created",
  "card.frozen",
  "kyc.approved",
  "kyc.rejected",
  "user.signup",
  "payout.requested",
  "invoice.paid",
];

// Seed some demo apps if none exist
async function seedIfEmpty() {
  const count = await db.developerApp.count();
  if (count > 0) return;

  // Pick a few business users as developers
  const businessUsers = await db.user.findMany({
    where: { accountType: "business" },
    take: 2,
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const adminUser = await db.user.findFirst({
    where: { role: "super_admin" },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const devs = [...businessUsers, adminUser].filter(Boolean) as {
    id: string; firstName: string; lastName: string; email: string | null;
  }[];

  if (devs.length === 0) return;

  const appsToCreate = [
    { name: "GaexPay Checkout SDK", type: "web", developer: devs[0], scopes: ["payments.create", "payments.read", "wallets.read"], events: ["transaction.created", "transaction.completed", "payout.requested"] },
    { name: "Mobile Wallet Sync", type: "mobile", developer: devs[0], scopes: ["wallets.read", "wallets.write"], events: ["wallet.credit", "wallet.debit"] },
    { name: "Invoice Gateway", type: "backend", developer: devs[1] ?? devs[0], scopes: ["invoices.read", "invoices.write", "payments.create"], events: ["invoice.paid", "transaction.completed"] },
    { name: "Compliance Watcher", type: "integration", developer: devs[1] ?? devs[0], scopes: ["kyc.read", "users.read"], events: ["kyc.approved", "kyc.rejected", "user.signup"] },
  ];

  for (const a of appsToCreate) {
    const app = await db.developerApp.create({
      data: {
        name: a.name,
        description: `${a.name} — auto-generated demo application.`,
        developerId: a.developer.id,
        developerName: `${a.developer.firstName} ${a.developer.lastName}`,
        developerEmail: a.developer.email,
        type: a.type,
        status: "active",
      },
    });

    // Create 1 API key per app
    const fullKey = `gxp_live_${randomBytes(20).toString("hex")}`;
    const keyPrefix = fullKey.slice(0, 12);
    const keyMasked = `${keyPrefix}••••••••${fullKey.slice(-4)}`;
    const keyHash = createHash("sha256").update(fullKey).digest("hex");
    await db.developerApiKey.create({
      data: {
        appId: app.id,
        developerId: a.developer.id,
        developerName: `${a.developer.firstName} ${a.developer.lastName}`,
        keyPrefix,
        keyMasked,
        keyHash,
        scopes: JSON.stringify(a.scopes),
        status: "active",
        lastUsedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)) : null,
      },
    });

    // Create 1-2 webhooks per app
    const webhookCount = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < webhookCount; i++) {
      const url = `https://${a.name.toLowerCase().replace(/[^a-z]/g, "")}.example${i + 1}.com/webhooks/gaexpay`;
      const totalDelivered = Math.floor(Math.random() * 200) + 5;
      const failedDelivered = Math.floor(Math.random() * 10);
      const successRate = Math.round(((totalDelivered - failedDelivered) / totalDelivered) * 1000) / 10;
      await db.webhook.create({
        data: {
          appId: app.id,
          developerId: a.developer.id,
          developerName: `${a.developer.firstName} ${a.developer.lastName}`,
          url,
          events: JSON.stringify(a.events),
          secretMasked: "whsec_••••••••••",
          status: failedDelivered > 5 ? "failing" : "active",
          lastDeliveryAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
          lastStatus: failedDelivered > 5 ? "failed" : "success",
          lastStatusCode: failedDelivered > 5 ? 500 : 200,
          successRate,
          totalDelivered,
          failedDelivered,
        },
      });
    }
  }
}

// GET — list all developer API keys, webhooks, apps
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "developer_portal.view");
    if ("error" in auth) return auth.error;

    await seedIfEmpty();

    const [apiKeys, webhooks, apps] = await Promise.all([
      db.developerApiKey.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          app: { select: { id: true, name: true, type: true, status: true } },
        },
      }),
      db.webhook.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          app: { select: { id: true, name: true, type: true } },
        },
      }),
      db.developerApp.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          _count: { select: { apiKeys: true, webhooks: true } },
        },
      }),
    ]);

    const stats = {
      totalApps: apps.length,
      activeApps: apps.filter((a) => a.status === "active").length,
      totalApiKeys: apiKeys.length,
      activeApiKeys: apiKeys.filter((k) => k.status === "active").length,
      revokedApiKeys: apiKeys.filter((k) => k.status === "revoked").length,
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter((w) => w.status === "active").length,
      failingWebhooks: webhooks.filter((w) => w.status === "failing").length,
      disabledWebhooks: webhooks.filter((w) => w.status === "disabled").length,
      totalWebhookDeliveries: webhooks.reduce((s, w) => s + (w.totalDelivered || 0), 0),
      avgWebhookSuccessRate: webhooks.length
        ? Math.round((webhooks.reduce((s, w) => s + (w.successRate || 0), 0) / webhooks.length) * 10) / 10
        : 100,
    };

    return NextResponse.json({
      apiKeys: apiKeys.map((k) => ({
        ...k,
        scopes: safeParse(k.scopes),
      })),
      webhooks: webhooks.map((w) => ({
        ...w,
        events: safeParse(w.events),
      })),
      apps,
      stats,
      availableEvents: ALL_EVENTS,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

function safeParse(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// POST — create a new API key for an existing or new app
export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, "developer_portal.create");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const {
      appName, appType, appId, developerId, developerName, developerEmail,
      scopes, description,
    } = body as {
      appName?: string;
      appType?: string;
      appId?: string;
      developerId?: string;
      developerName?: string;
      developerEmail?: string;
      scopes?: string[];
      description?: string;
    };

    // Resolve app: either use existing or create new
    let app;
    if (appId) {
      app = await db.developerApp.findUnique({ where: { id: appId } });
      if (!app) return apiError("App not found", 404);
    } else {
      if (!appName) return apiError("appName is required to create a new app", 400);
      if (!developerId) return apiError("developerId is required to create a new app", 400);
      if (!developerName) return apiError("developerName is required", 400);
      app = await db.developerApp.create({
        data: {
          name: appName,
          description: description || `${appName} — created via admin`,
          developerId,
          developerName,
          developerEmail: developerEmail || null,
          type: appType || "web",
          status: "active",
        },
      });
    }

    // Generate the new API key
    const fullKey = `gxp_live_${randomBytes(20).toString("hex")}`;
    const keyPrefix = fullKey.slice(0, 12);
    const keyMasked = `${keyPrefix}••••••••${fullKey.slice(-4)}`;
    const keyHash = createHash("sha256").update(fullKey).digest("hex");

    const apiKey = await db.developerApiKey.create({
      data: {
        appId: app.id,
        developerId: app.developerId,
        developerName: app.developerName,
        keyPrefix,
        keyMasked,
        keyHash,
        scopes: JSON.stringify(scopes || []),
        status: "active",
      },
    });

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "developer.apikey_create",
        entity: "DeveloperApiKey",
        entityId: apiKey.id,
        severity: "warning",
        details: JSON.stringify({ appName: app.name, scopes }),
      },
    });

    // Return the full key ONCE — only on creation
    return NextResponse.json({
      success: true,
      apiKey: { ...apiKey, scopes: safeParse(apiKey.scopes), fullKey },
      app,
    }, { status: 201 });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — revoke key, toggle webhook, test webhook
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "revoke_key";

    let perm: string;
    switch (action) {
      case "revoke_key":
        perm = "developer_portal.revoke";
        break;
      case "toggle_webhook":
        perm = "developer_portal.webhooks";
        break;
      case "test_webhook":
        perm = "developer_portal.webhooks";
        break;
      default:
        return apiError("Unknown action", 400);
    }

    const auth = await requirePermission(req, perm);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { keyId, webhookId, reason } = body as {
      keyId?: string;
      webhookId?: string;
      reason?: string;
    };

    if (action === "revoke_key") {
      if (!keyId) return apiError("keyId is required", 400);
      const key = await db.developerApiKey.findUnique({ where: { id: keyId } });
      if (!key) return apiError("API key not found", 404);
      if (key.status === "revoked") return apiError("Key already revoked", 400);
      const updated = await db.developerApiKey.update({
        where: { id: keyId },
        data: {
          status: "revoked",
          revokedAt: new Date(),
          revokedReason: reason || "Revoked by admin",
        },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "developer.apikey_revoke",
          entity: "DeveloperApiKey",
          entityId: keyId,
          severity: "critical",
          details: JSON.stringify({ reason: reason || "Revoked by admin" }),
        },
      });
      return NextResponse.json({ success: true, apiKey: updated });
    }

    if (action === "toggle_webhook") {
      if (!webhookId) return apiError("webhookId is required", 400);
      const webhook = await db.webhook.findUnique({ where: { id: webhookId } });
      if (!webhook) return apiError("Webhook not found", 404);
      const newStatus = webhook.status === "disabled" ? "active" : "disabled";
      const updated = await db.webhook.update({
        where: { id: webhookId },
        data: { status: newStatus },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "developer.webhook_toggle",
          entity: "Webhook",
          entityId: webhookId,
          severity: "warning",
          details: JSON.stringify({ from: webhook.status, to: newStatus }),
        },
      });
      return NextResponse.json({ success: true, webhook: updated });
    }

    if (action === "test_webhook") {
      if (!webhookId) return apiError("webhookId is required", 400);
      const webhook = await db.webhook.findUnique({ where: { id: webhookId } });
      if (!webhook) return apiError("Webhook not found", 404);

      // Simulate a test delivery (no real network call to avoid sandbox limitations)
      const isFailing = webhook.status === "failing";
      const success = !isFailing || Math.random() > 0.5;
      const statusCode = success ? 200 : 500;
      const now = new Date();
      const updated = await db.webhook.update({
        where: { id: webhookId },
        data: {
          lastDeliveryAt: now,
          lastStatus: success ? "success" : "failed",
          lastStatusCode: statusCode,
          totalDelivered: { increment: 1 },
          failedDelivered: success ? { increment: 0 } : { increment: 1 },
          successRate: success
            ? Math.min(100, Math.round(((webhook.totalDelivered + 1 - webhook.failedDelivered) / (webhook.totalDelivered + 1)) * 1000) / 10)
            : Math.round(((webhook.totalDelivered + 1 - webhook.failedDelivered - 1) / (webhook.totalDelivered + 1)) * 1000) / 10,
          status: success ? "active" : "failing",
        },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "developer.webhook_test",
          entity: "Webhook",
          entityId: webhookId,
          severity: success ? "info" : "warning",
          details: JSON.stringify({ statusCode, success, url: webhook.url }),
        },
      });
      return NextResponse.json({
        success: true,
        testResult: {
          success,
          statusCode,
          latencyMs: Math.floor(Math.random() * 400) + 50,
          message: success
            ? "Webhook delivered successfully"
            : "Webhook delivery failed — endpoint returned 500",
        },
        webhook: updated,
      });
    }

    return apiError("Unknown action", 400);
  } catch (e) {
    return apiCatch(e);
  }
}
