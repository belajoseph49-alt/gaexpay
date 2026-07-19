// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "GHS", "KES"];
const RATES: Record<string, number> = {
  NGN: 1,
  USD: 0.00065,
  EUR: 0.0006,
  GBP: 0.00051,
  GHS: 0.0098,
  KES: 0.084,
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function main() {
  console.log("Seeding GaexPay database...");

  // Clean
  await db.auditLog.deleteMany();
  await db.supportMessage.deleteMany();
  await db.supportTicket.deleteMany();
  await db.notification.deleteMany();
  await db.kycDocument.deleteMany();
  await db.beneficiary.deleteMany();
  await db.card.deleteMany();
  await db.transaction.deleteMany();
  await db.wallet.deleteMany();
  await db.device.deleteMany();
  await db.exchangeRate.deleteMany();
  await db.merchant.deleteMany();
  await db.biller.deleteMany();
  await db.adminMetric.deleteMany();
  await db.user.deleteMany();

  // ---- Demo Users ----
  const demoUser = await db.user.create({
    data: {
      id: "cmqk4on7w0000l54pde5vpp0q", // matches DEMO_USER_ID in lib/gaexpay.ts
      email: "demo@gaexpay.com",
      phone: "+2348012345678",
      passwordHash: "demo_hash_secure",
      firstName: "Adaeze",
      lastName: "Okonkwo",
      username: "adaeze",
      country: "Nigeria",
      city: "Lagos",
      address: "12 Adeola Odeku St, Victoria Island, Lagos",
      dob: "1994-05-21",
      gender: "female",
      kycStatus: "verified",
      kycTier: 3,
      kycVerifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      mfaEnabled: true,
      twoFactorMethod: "authenticator",
      biometricEnabled: true,
      pinHash: "pin_hash_demo",
      language: "en",
      currency: "NGN",
      referralCode: "GXP-ADAEZE",
      referralEarnings: 12500,
      referralCount: 14,
      rewardPoints: 2840,
      status: "active",
      role: "user",
      avatar: undefined,
    },
  });


  const adminUser = await db.user.create({
    data: {
      email: "admin@gaexpay.com",
      phone: "+2348000000000",
      passwordHash: "admin_hash_secure",
      firstName: "System",
      lastName: "Admin",
      username: "admin",
      country: "Nigeria",
      kycStatus: "verified",
      kycTier: 3,
      role: "admin",
      status: "active",
      referralCode: "GXP-ADMIN",
    },
  });

  // extra users for admin / p2p
  const otherUsers = [];
  const names = [
    ["Chinedu", "Eze", "chinedu@gaexpay.com"],
    ["Fatima", "Bello", "fatima@gaexpay.com"],
    ["Kwame", "Mensah", "kwame@gaexpay.com"],
    ["Amina", "Hassan", "amina@gaexpay.com"],
    ["Tunde", "Adeyemi", "tunde@gaexpay.com"],
    ["Grace", "Mwangi", "grace@gaexpay.com"],
    ["Yusuf", "Omar", "yusuf@gaexpay.com"],
    ["Lerato", "Dube", "lerato@gaexpay.com"],
    ["Emeka", "Nwosu", "emeka@gaexpay.com"],
    ["Zainab", "Ibrahim", "zainab@gaexpay.com"],
    ["David", "Okafor", "david@gaexpay.com"],
    ["Aisha", "Mohammed", "aisha@gaexpay.com"],
  ];
  for (const [fn, ln, em] of names) {
    const u = await db.user.create({
      data: {
        email: em,
        phone: "+23480" + Math.floor(rand(10000000, 99999999)).toString(),
        passwordHash: "hash",
        firstName: fn,
        lastName: ln,
        username: (fn + ln).toLowerCase(),
        country: pick(["Nigeria", "Ghana", "Kenya", "Uganda"]),
        kycStatus: pick(["verified", "verified", "pending", "unverified"]),
        kycTier: pick([0, 1, 2, 3]),
        status: pick(["active", "active", "active", "suspended"]),
        referralCode: "GXP-" + (fn + ln).toUpperCase().slice(0, 6),
        rewardPoints: Math.floor(rand(0, 5000)),
        referralCount: Math.floor(rand(0, 30)),
        referralEarnings: rand(0, 50000),
        createdAt: new Date(Date.now() - rand(1000 * 60 * 60 * 24 * 5, 1000 * 60 * 60 * 24 * 120)),
      },
    });
    otherUsers.push(u);
  }

  // ---- Wallets ----
  const walletNGN = await db.wallet.create({
    data: {
      userId: demoUser.id,
      currency: "NGN",
      balance: 845230.55,
      ledgerBalance: 845230.55,
      type: "primary",
      label: "Main Wallet",
      isDefault: true,
    },
  });
  const walletUSD = await db.wallet.create({
    data: {
      userId: demoUser.id,
      currency: "USD",
      balance: 4280.75,
      ledgerBalance: 4280.75,
      type: "primary",
      label: "USD Wallet",
    },
  });
  const walletEUR = await db.wallet.create({
    data: {
      userId: demoUser.id,
      currency: "EUR",
      balance: 1820.4,
      ledgerBalance: 1820.4,
      type: "primary",
      label: "Euro Wallet",
    },
  });
  const walletGHS = await db.wallet.create({
    data: {
      userId: demoUser.id,
      currency: "GHS",
      balance: 3200.0,
      ledgerBalance: 3200.0,
      type: "savings",
      label: "Savings (GHS)",
    },
  });
  const walletKES = await db.wallet.create({
    data: {
      userId: demoUser.id,
      currency: "KES",
      balance: 28450.0,
      ledgerBalance: 28450.0,
      type: "primary",
      label: "KES Wallet",
    },
  });
  const walletGBP = await db.wallet.create({
    data: {
      userId: demoUser.id,
      currency: "GBP",
      balance: 940.2,
      ledgerBalance: 940.2,
      type: "primary",
      label: "GBP Wallet",
    },
  });

  // wallets for other users
  for (const u of otherUsers) {
    await db.wallet.create({
      data: {
        userId: u.id,
        currency: pick(["NGN", "USD", "GHS", "KES"]),
        balance: rand(1000, 900000),
        ledgerBalance: rand(1000, 900000),
        type: "primary",
        label: "Main Wallet",
        isDefault: true,
      },
    });
  }

  // ---- Exchange Rates ----
  const pairs: [string, string][] = [
    ["NGN", "USD"], ["NGN", "EUR"], ["NGN", "GBP"], ["NGN", "GHS"], ["NGN", "KES"],
    ["USD", "EUR"], ["USD", "GBP"], ["USD", "GHS"], ["USD", "KES"],
    ["EUR", "GBP"], ["GHS", "KES"],
  ];
  for (const [base, quote] of pairs) {
    const rate = RATES[quote] / RATES[base];
    await db.exchangeRate.create({
      data: {
        base,
        quote,
        rate,
        buy: rate * 0.995,
        sell: rate * 1.005,
        source: "internal",
      },
    });
  }

  // ---- Transactions (90 days) ----
  const txTypes = [
    { type: "transfer", direction: "debit", cat: "p2p", method: "wallet" },
    { type: "transfer", direction: "credit", cat: "p2p", method: "wallet" },
    { type: "deposit", direction: "credit", cat: "income", method: "bank" },
    { type: "withdrawal", direction: "debit", cat: "general", method: "momo" },
    { type: "payment", direction: "debit", cat: "shopping", method: "qr" },
    { type: "payment", direction: "debit", cat: "food", method: "qr" },
    { type: "bill", direction: "debit", cat: "general", method: "wallet" },
    { type: "airtime", direction: "debit", cat: "general", method: "wallet" },
    { type: "exchange", direction: "debit", cat: "general", method: "wallet" },
    { type: "card", direction: "debit", cat: "shopping", method: "card" },
    { type: "referral", direction: "credit", cat: "income", method: "wallet" },
  ];
  const counterparties = [
    "Chinedu Eze", "Fatima Bello", "Kwame Mensah", "Amina Hassan",
    "Tunde Adeyemi", "Grace Mwangi", "Spencer Supermarket", "Chicken Republic",
    "DSTV Nigeria", "Ikeja Electric", "Glo Airtime", "Jumia Stores",
    "UBA Bank", "MTN MoMo", "Orange Money", "Airtel Money",
  ];
  const descriptions = [
    "Lunch split", "Rent contribution", "Freelance payment", "Salary",
    "Groceries", "Uber ride", "Electricity bill", "Data topup",
    "Movie tickets", "Online order", "Coffee", "Pharmacy",
    "Mobile money cashout", "Referral bonus", "Currency exchange",
  ];

  const transactions = [];
  for (let i = 0; i < 140; i++) {
    const t = pick(txTypes);
    const daysAgo = Math.floor(rand(0, 90));
    const hoursAgo = Math.floor(rand(0, 24));
    const date = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);
    const amount = Math.round(rand(500, 250000) * 100) / 100;
    const isFlagged = Math.random() < 0.04;
    const status = isFlagged ? "flagged" : Math.random() < 0.05 ? "failed" : "completed";
    const cp = pick(counterparties);
    transactions.push({
      reference: ref(),
      userId: demoUser.id,
      senderId: t.direction === "debit" ? demoUser.id : pick(otherUsers).id,
      type: t.type,
      direction: t.direction,
      status,
      amount,
      fee: t.type === "transfer" ? Math.round(amount * 0.005 * 100) / 100 : 0,
      currency: pick(["NGN", "NGN", "NGN", "USD", "EUR"]),
      description: pick(descriptions),
      category: t.cat,
      counterpartyName: cp,
      method: t.method,
      provider: t.method === "momo" ? pick(["mtn", "orange", "airtel", "moov"]) : null,
      walletId: walletNGN.id,
      riskScore: isFlagged ? rand(0.7, 0.99) : rand(0, 0.3),
      fraudFlag: isFlagged,
      createdAt: date,
      completedAt: status === "completed" ? date : null,
    });
  }
  await db.transaction.createMany({ data: transactions });

  // ---- Cards ----
  await db.card.create({
    data: {
      userId: demoUser.id,
      type: "virtual",
      brand: "visa",
      nickname: "Online Card",
      maskedNumber: "**** **** **** 4827",
      fullNumberEnc: "enc_4827",
      expiryMonth: "08",
      expiryYear: "27",
      cvvEnc: "enc_cvv",
      holderName: "ADAEZE OKONKWO",
      currency: "USD",
      balance: 4280.75,
      limit: 10000,
      spending: 1840.2,
      status: "active",
      color: "emerald",
      isDefault: true,
    },
  });
  await db.card.create({
    data: {
      userId: demoUser.id,
      type: "physical",
      brand: "mastercard",
      nickname: "Everyday Card",
      maskedNumber: "**** **** **** 9152",
      fullNumberEnc: "enc_9152",
      expiryMonth: "11",
      expiryYear: "28",
      cvvEnc: "enc_cvv2",
      holderName: "ADAEZE OKONKWO",
      currency: "NGN",
      balance: 845230.55,
      limit: 500000,
      spending: 234560.8,
      status: "active",
      color: "midnight",
    },
  });
  await db.card.create({
    data: {
      userId: demoUser.id,
      type: "virtual",
      brand: "verve",
      nickname: "Subscriptions",
      maskedNumber: "**** **** **** 3041",
      fullNumberEnc: "enc_3041",
      expiryMonth: "03",
      expiryYear: "26",
      cvvEnc: "enc_cvv3",
      holderName: "ADAEZE OKONKWO",
      currency: "NGN",
      balance: 845230.55,
      limit: 200000,
      spending: 45200,
      status: "frozen",
      color: "sunset",
    },
  });

  // ---- Beneficiaries ----
  const benes = [
    { name: "Chinedu Eze", account: "0123456789", bank: "Access Bank", type: "bank", provider: "access" },
    { name: "Fatima Bello", account: "+2348031234567", bank: "MTN MoMo", type: "momo", provider: "mtn" },
    { name: "Kwame Mensah", account: "0244556677", bank: "Orange Money", type: "momo", provider: "orange" },
    { name: "Grace Mwangi", account: "gaexpay@grace", bank: "GaexPay", type: "gaexpay", provider: "gaexpay" },
    { name: "Tunde Adeyemi", account: "9876543210", bank: "GTBank", type: "bank", provider: "gtbank" },
    { name: "Aisha Mohammed", account: "+2348055551234", bank: "Airtel Money", type: "momo", provider: "airtel" },
  ];
  for (const b of benes) {
    await db.beneficiary.create({
      data: { userId: demoUser.id, ...b, currency: "NGN" },
    });
  }

  // ---- Notifications ----
  const notifs = [
    { title: "Transfer successful", message: "You sent ₦25,000 to Chinedu Eze.", type: "transaction" },
    { title: "New device login", message: "Login from iPhone 15 Pro in Lagos.", type: "security" },
    { title: "Referral bonus earned", message: "You earned ₦500 from a referral.", type: "promo" },
    { title: "KYC verified", message: "Your identity has been verified. Tier 3 unlocked.", type: "success" },
    { title: "Card delivered", message: "Your physical Mastercard is on the way.", type: "info" },
    { title: "Bill due reminder", message: "Ikeja Electric bill of ₦18,500 is due in 3 days.", type: "warning" },
    { title: "Exchange rate alert", message: "USD/NGN dropped below ₦1,540. Good time to buy.", type: "info" },
    { title: "Suspicious activity", message: "A transaction was flagged for review.", type: "warning" },
  ];
  for (let i = 0; i < notifs.length; i++) {
    await db.notification.create({
      data: {
        userId: demoUser.id,
        ...notifs[i],
        channel: i % 3 === 0 ? "email" : i % 3 === 1 ? "sms" : "push",
        isRead: i > 3,
        createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 6),
      },
    });
  }

  // ---- Support ticket ----
  const ticket = await db.supportTicket.create({
    data: {
      userId: demoUser.id,
      subject: "Delayed transfer to bank account",
      category: "transaction",
      priority: "high",
      status: "in_progress",
      assignedTo: "Support Agent #4",
    },
  });
  await db.supportMessage.createMany({
    data: [
      { ticketId: ticket.id, userId: demoUser.id, senderType: "user", content: "Hi, I sent money to my Access Bank account 2 hours ago and it hasn't reflected yet. Reference GXP-AB1234.", createdAt: new Date(Date.now() - 1000 * 60 * 120) },
      { ticketId: ticket.id, senderType: "agent", content: "Hello Adaeze, thank you for reaching out. I'm checking the transaction now. Please bear with me for 2 minutes.", createdAt: new Date(Date.now() - 1000 * 60 * 115) },
      { ticketId: ticket.id, senderType: "agent", content: "I can see the transfer was initiated but the receiving bank is undergoing maintenance. It should reflect within the next 30 minutes. I'll keep monitoring.", createdAt: new Date(Date.now() - 1000 * 60 * 110) },
    ],
  });

  // ---- KYC Documents ----
  await db.kycDocument.createMany({
    data: [
      { userId: demoUser.id, type: "national_id", documentNumber: "A12345678", status: "approved", reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      { userId: demoUser.id, type: "selfie", status: "approved", reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      { userId: demoUser.id, type: "utility_bill", status: "approved", reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
    ],
  });

  // ---- Devices ----
  await db.device.createMany({
    data: [
      { userId: demoUser.id, name: "iPhone 15 Pro", type: "mobile", os: "iOS 17.4", browser: "GaexPay App", location: "Lagos, Nigeria", ip: "102.89.23.10", trusted: true, lastActive: new Date() },
      { userId: demoUser.id, name: "MacBook Pro", type: "desktop", os: "macOS 14.4", browser: "Chrome 124", location: "Lagos, Nigeria", ip: "102.89.23.10", trusted: true, lastActive: new Date(Date.now() - 1000 * 60 * 60 * 5) },
      { userId: demoUser.id, name: "iPad Air", type: "tablet", os: "iPadOS 17.4", browser: "Safari", location: "Abuja, Nigeria", ip: "105.112.44.2", trusted: false, lastActive: new Date(Date.now() - 1000 * 60 * 60 * 48) },
    ],
  });

  // ---- Merchants ----
  const merchants = [
    { name: "Spencer Supermarket", category: "retail", qrCode: "GXP-MER-001", account: "100001", phone: "+2348010000001" },
    { name: "Chicken Republic", category: "food", qrCode: "GXP-MER-002", account: "100002", phone: "+2348010000002" },
    { name: "Uber Lagos", category: "transport", qrCode: "GXP-MER-003", account: "100003", phone: "+2348010000003" },
    { name: "FilmHouse Cinema", category: "entertainment", qrCode: "GXP-MER-004", account: "100004", phone: "+2348010000004" },
    { name: "HealthPlus Pharmacy", category: "health", qrCode: "GXP-MER-005", account: "100005", phone: "+2348010000005" },
    { name: "Jumia Pickup Hub", category: "retail", qrCode: "GXP-MER-006", account: "100006", phone: "+2348010000006" },
  ];
  for (const m of merchants) {
    await db.merchant.create({ data: { ...m, rating: rand(3.8, 5.0) } });
  }

  // ---- Billers ----
  const billers = [
    { name: "Ikeja Electric", category: "electricity" },
    { name: "Eko Electric (EKEDC)", category: "electricity" },
    { name: "Abuja Electricity", category: "electricity" },
    { name: "Lagos Water Corp", category: "water" },
    { name: "Spectranet", category: "internet" },
    { name: "Smile Communications", category: "internet" },
    { name: "DSTV", category: "tv" },
    { name: "GOtv", category: "tv" },
    { name: "Startimes", category: "tv" },
    { name: "JAMB", category: "education" },
    { name: "Bet9ja", category: "betting" },
    { name: "SportyBet", category: "betting" },
    { name: "FIRS", category: "government" },
  ];
  for (const b of billers) {
    await db.biller.create({ data: { ...b, fields: JSON.stringify(["account", "amount"]) } });
  }

  // ---- Audit Logs ----
  const auditActions = [
    ["login", "auth", "info"], ["logout", "auth", "info"],
    ["transfer_initiated", "transaction", "info"], ["transfer_completed", "transaction", "info"],
    ["kyc_submitted", "kyc", "info"], ["kyc_approved", "kyc", "info"],
    ["card_created", "card", "info"], ["card_frozen", "card", "warning"],
    ["password_changed", "security", "info"], ["mfa_enabled", "security", "info"],
    ["suspicious_login_blocked", "security", "critical"],
    ["beneficiary_added", "beneficiary", "info"],
    ["withdrawal_initiated", "transaction", "info"],
  ];
  for (let i = 0; i < 60; i++) {
    const [action, entity, severity] = pick(auditActions);
    await db.auditLog.create({
      data: {
        userId: i % 5 === 0 ? adminUser.id : demoUser.id,
        actor: i % 5 === 0 ? "admin" : "user",
        action,
        entity,
        entityId: ref(),
        ip: "102.89.23." + Math.floor(rand(1, 254)),
        userAgent: pick(["iPhone / GaexPay 4.2", "MacOS / Chrome 124", "Android / GaexPay 4.2"]),
        severity,
        createdAt: new Date(Date.now() - rand(0, 1000 * 60 * 60 * 24 * 30)),
      },
    });
  }

  // ---- Admin Metrics ----
  const metrics = [
    { key: "total_users", label: "Total Users", value: 184320, category: "growth" },
    { key: "active_users", label: "Active Users (30d)", value: 142890, category: "growth" },
    { key: "transaction_volume", label: "Transaction Volume", value: 4.82e9, category: "revenue" },
    { key: "revenue", label: "Revenue (MTD)", value: 38.4e6, category: "revenue" },
    { key: "fee_revenue", label: "Fee Revenue", value: 12.1e6, category: "revenue" },
    { key: "flagged_tx", label: "Flagged Transactions", value: 142, category: "fraud" },
    { key: "blocked_accounts", label: "Blocked Accounts", value: 38, category: "fraud" },
    { key: "pending_kyc", label: "Pending KYC", value: 1240, category: "compliance" },
    { key: "open_tickets", label: "Open Tickets", value: 87, category: "support" },
    { key: "avg_resolution", label: "Avg Resolution (hrs)", value: 4.2, category: "support" },
  ];
  for (const m of metrics) {
    await db.adminMetric.create({ data: m });
  }

  console.log("Seed complete.");
  console.log(`Demo user: ${demoUser.email} / ${demoUser.id}`);
  console.log(`Admin user: ${adminUser.email} / ${adminUser.id}`);
  console.log(`Transactions created: ${transactions.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
