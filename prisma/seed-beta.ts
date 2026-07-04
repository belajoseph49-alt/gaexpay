import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Beta initial balance settings
  await prisma.systemSetting.upsert({
    where: { key: "signup_initial_balance" },
    update: {},
    create: { key: "signup_initial_balance", value: "50000", category: "beta" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "signup_initial_balance_currency" },
    update: {},
    create: { key: "signup_initial_balance_currency", value: "NGN", category: "beta" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "signup_initial_balance_label" },
    update: {},
    create: { key: "signup_initial_balance_label", value: "Beta Demo Balance", category: "beta" },
  });

  // Platform info
  await prisma.systemSetting.upsert({
    where: { key: "platform_name" },
    update: {},
    create: { key: "platform_name", value: "GaexPay", category: "general" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "platform_version" },
    update: {},
    create: { key: "platform_version", value: "1.0.0-beta", category: "general" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "support_email" },
    update: {},
    create: { key: "support_email", value: "support@gaexpay.com", category: "general" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "platform_timezone" },
    update: {},
    create: { key: "platform_timezone", value: "Africa/Lagos", category: "general" },
  });

  // Maintenance mode
  await prisma.systemSetting.upsert({
    where: { key: "maintenance_mode" },
    update: {},
    create: { key: "maintenance_mode", value: "false", category: "system" },
  });

  // Registration
  await prisma.systemSetting.upsert({
    where: { key: "allow_signup" },
    update: {},
    create: { key: "allow_signup", value: "true", category: "system" },
  });

  console.log("Beta settings seeded (7 settings)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
