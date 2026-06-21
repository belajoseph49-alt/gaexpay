import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — content settings (landing page text, email templates, FAQ, terms, privacy)
export async function GET(req: Request) {
  const auth = await requirePermission(req, "content.view");
  if ("error" in auth) return auth.error;

  const settings = await db.adminMetric.findMany({
    where: { category: "content" },
  });

  // Map to key->value (label holds the string content)
  const content: Record<string, string> = {};
  for (const s of settings) content[s.key] = s.label;

  // Default values if not set
  const defaults: Record<string, string> = {
    hero_title: "Send, Save & Spend Smarter with GaexPay",
    hero_subtitle: "The all-in-one digital wallet for Africa and beyond. Bank-grade security, multi-currency, instant transfers.",
    hero_cta: "Open Free Account",
    feature_1_title: "Multi-currency Wallets",
    feature_1_desc: "Hold 30+ currencies including NGN, USD, EUR, GHS, KES, XOF and cryptos.",
    feature_2_title: "Instant Transfers",
    feature_2_desc: "Send money to any bank, mobile money, or GaexPay user in seconds.",
    feature_3_title: "Bill Payments",
    feature_3_desc: "Pay electricity, water, internet, TV, school fees, taxes and more.",
    faq_content: "Frequently Asked Questions...",
    terms_content: "Terms and Conditions...",
    privacy_content: "Privacy Policy...",
    email_template_welcome: "Welcome to GaexPay! Your account is ready.",
    email_template_transaction: "You have a new transaction on your GaexPay account.",
    email_template_kyc_approved: "Congratulations! Your KYC verification has been approved.",
    email_template_kyc_rejected: "Your KYC submission was rejected. Please review and resubmit.",
    sms_template_otp: "Your GaexPay verification code is: {code}. Valid for 10 minutes.",
    sms_template_transaction: "You've sent {amount} {currency} to {recipient}.",
  };

  for (const [k, v] of Object.entries(defaults)) {
    if (!content[k]) content[k] = v;
  }

  return NextResponse.json({ content, defaults });
}

// PATCH — update content settings
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "content.edit");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { updates } = body as { updates?: Record<string, string> };

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "updates object required" }, { status: 400 });
  }

  // Each update stored as an AdminMetric entry with category=content (label holds text)
  for (const [key, value] of Object.entries(updates)) {
    await db.adminMetric.upsert({
      where: { key },
      update: { label: value, value: 0, category: "content" },
      create: { key, label: value, value: 0, category: "content" },
    });
  }

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "content.update",
      entity: "Content",
      severity: "info",
      details: JSON.stringify({ keys: Object.keys(updates) }),
    },
  });

  return NextResponse.json({ success: true, updated: Object.keys(updates) });
}
