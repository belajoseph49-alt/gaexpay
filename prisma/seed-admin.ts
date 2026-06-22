/**
 * prisma/seed-admin.ts
 *
 * Super-admin seeder. Creates a single super admin account on first deploy.
 * Idempotent — safe to run multiple times. If a super admin already exists
 * (any user with `role === "super_admin"`), the script exits without changes.
 *
 * Run with:
 *   bun run prisma/seed-admin.ts
 *   # or
 *   bunx tsx prisma/seed-admin.ts
 *
 * Default credentials (override via env vars):
 *   email:    ADMIN_EMAIL     (default: admin@gaexpay.com)
 *   password: ADMIN_PASSWORD  (default: Admin@2025)
 *   phone:    ADMIN_PHONE     (default: +2347000000000)
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gaexpay.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2025";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+2347000000000";

async function main() {
  console.log("🌱 Seeding super admin...");

  // 1. Already have a super_admin? Nothing to do.
  const existingSuper = await prisma.user.findFirst({
    where: { role: "super_admin" },
  });

  if (existingSuper) {
    console.log(`✅ Super admin already exists: ${existingSuper.email}`);
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  // 2. Is there already a user at the target email (e.g. an old demo admin)?
  //    Upgrade them to super_admin instead of failing the unique constraint.
  const existingByEmail = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingByEmail) {
    console.log(
      `   Found existing user at ${ADMIN_EMAIL} (role=${existingByEmail.role}). Upgrading to super_admin...`,
    );
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        role: "super_admin",
        accountType: existingByEmail.accountType || "personal",
        kycStatus: "verified",
        kycTier: 3,
        kycVerifiedAt: existingByEmail.kycVerifiedAt ?? new Date(),
        status: "active",
        permissions: JSON.stringify(["*"]),
        currency: existingByEmail.currency || "NGN",
        // Only overwrite password if it was empty/missing (keep existing hash otherwise)
        passwordHash: existingByEmail.passwordHash || passwordHash,
        username: existingByEmail.username || "superadmin",
      },
    });

    // Ensure wallet exists
    const wallet = await prisma.wallet.findFirst({
      where: { userId: existingByEmail.id, currency: "NGN", type: "primary" },
    });
    if (!wallet) {
      await prisma.wallet.create({
        data: {
          userId: existingByEmail.id,
          currency: "NGN",
          type: "primary",
          label: "Admin Wallet",
          balance: 0,
          isDefault: true,
        },
      });
    }

    console.log(`✅ Upgraded existing user to super_admin: ${ADMIN_EMAIL}`);
    console.log(`   ID:       ${existingByEmail.id}`);
    console.log("   ⚠️  Existing password retained. Reset via admin UI if needed.");
    return;
  }

  // 3. Otherwise create a brand new super admin.
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      username: "superadmin",
      role: "super_admin",
      accountType: "personal",
      kycStatus: "verified",
      kycTier: 3,
      kycVerifiedAt: new Date(),
      status: "active",
      permissions: JSON.stringify(["*"]), // wildcard — all permissions
      currency: "NGN",
      country: "Nigeria",
    },
  });

  // Create a default primary wallet for the admin
  await prisma.wallet.create({
    data: {
      userId: admin.id,
      currency: "NGN",
      type: "primary",
      label: "Admin Wallet",
      balance: 0,
      isDefault: true,
    },
  });

  console.log("✅ Super admin created successfully:");
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Phone:    ${admin.phone}`);
  console.log(`   Username: ${admin.username}`);
  console.log(`   Role:     ${admin.role}`);
  console.log(`   ID:       ${admin.id}`);
  console.log("");
  console.log("   ⚠️  Default password: Admin@2025");
  console.log("   ⚠️  Change this immediately after first login!");
}

main()
  .catch((err) => {
    console.error("❌ Super admin seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
