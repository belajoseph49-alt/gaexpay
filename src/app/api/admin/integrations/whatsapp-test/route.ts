/**
 * POST /api/admin/integrations/whatsapp-test
 *
 * Send a test WhatsApp message via the WhatsApp Business Cloud API to verify
 * that the access token + phone number ID are configured correctly.
 *
 * Reads `whatsapp_access_token` and `whatsapp_phone_number_id` from the
 * SystemSetting table, then POSTs a template text message to the configured
 * phone number ID via the Graph API.
 *
 * Requires the `settings.edit` permission. Returns the Graph API response
 * on success (with the message id) or an error message on failure.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, "settings.edit");
    if ("error" in auth) return auth.error;

    // Optionally accept a custom recipient phone number in the body. If not
    // provided we just use the configured phone-number-id's own number
    // (which WhatsApp's test mode will accept).
    const body = await req.json().catch(() => ({})) as { to?: string };
    const to = body.to?.trim() || undefined;

    const [tokenRow, phoneNumberIdRow] = await Promise.all([
      db.systemSetting.findUnique({ where: { key: "whatsapp_access_token" } }),
      db.systemSetting.findUnique({ where: { key: "whatsapp_phone_number_id" } }),
    ]);
    const accessToken = tokenRow?.value?.trim() ?? "";
    const phoneNumberId = phoneNumberIdRow?.value?.trim() ?? "";

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp credentials are not configured. Set the Access Token and Phone Number ID first." },
        { status: 400 },
      );
    }

    // Send a test message via the WhatsApp Business Cloud API. We use the
    // `hello_world` template — it's pre-approved on every WhatsApp Business
    // account and is the easiest way to verify connectivity. If a recipient
    // is provided we fall back to a plain text message instead.
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const payload = to
      ? {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: "✅ GaexPay WhatsApp integration test — this message confirms your credentials are working." },
        }
      : {
          messaging_product: "whatsapp",
          to: phoneNumberId,
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } },
        };

    const apiRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const apiData = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) {
      const errMsg =
        (apiData?.error?.message as string | undefined) ||
        `WhatsApp API returned HTTP ${apiRes.status}`;
      return NextResponse.json(
        { ok: false, error: errMsg, status: apiRes.status },
        { status: 200 },
      );
    }

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "integrations.whatsapp.test",
        entity: "SystemSetting",
        entityId: "whatsapp_access_token",
        severity: "info",
        details: JSON.stringify({ messageId: apiData?.messages?.[0]?.id ?? null }),
      },
    });

    return NextResponse.json({
      ok: true,
      messageId: apiData?.messages?.[0]?.id ?? null,
      raw: apiData,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
