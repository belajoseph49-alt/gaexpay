/**
 * prisma/seed-oauth-integrations.ts
 *
 * Seeds default (empty) OAuth + WhatsApp Business integration settings into
 * the SystemSetting table. An admin must fill in the actual credentials via
 * the API & Integrations admin section (or by PATCHing /api/admin/system-settings).
 *
 * Idempotent — uses upserts on unique keys so it can be safely re-run.
 *
 * Run with:
 *   bun run prisma/seed-oauth-integrations.ts
 *   # or
 *   bunx tsx prisma/seed-oauth-integrations.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OAUTH_SETTINGS: { key: string; description: string }[] = [
  { key: "google_client_id", description: "Google OAuth 2.0 Client ID (from Google Cloud Console)" },
  { key: "google_client_secret", description: "Google OAuth 2.0 Client Secret" },
  { key: "google_redirect_uri", description: "Google OAuth redirect URI (auto-filled by the admin section)" },
  { key: "facebook_app_id", description: "Facebook OAuth App ID (from Facebook for Developers)" },
  { key: "facebook_app_secret", description: "Facebook OAuth App Secret" },
  { key: "facebook_redirect_uri", description: "Facebook OAuth redirect URI (auto-filled by the admin section)" },
  { key: "whatsapp_access_token", description: "WhatsApp Business Cloud API access token" },
  { key: "whatsapp_phone_number_id", description: "WhatsApp Business phone number ID" },
  { key: "whatsapp_business_account_id", description: "WhatsApp Business account ID" },
  { key: "whatsapp_webhook_secret", description: "Webhook verification secret for WhatsApp Business webhooks" },
];

async function main() {
  console.log("🌱 Seeding default OAuth + WhatsApp integration settings...");

  for (const { key, description } of OAUTH_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: "",
        category: "integrations",
      },
    });
    console.log(`  ✓ ${key} — ${description}`);
  }

  console.log(`\n✅ Seeded ${OAUTH_SETTINGS.length} integration settings. All values are empty by default.`);
  console.log("   An admin must fill them in via the API & Integrations admin section.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
