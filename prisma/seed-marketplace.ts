// @ts-nocheck
/**
 * prisma/seed-marketplace.ts
 *
 * Seeds the marketplace with 20 demo products across 8 categories, owned by
 * a mix of existing seeded users so the demo SPA can browse, filter, and buy
 * from real-looking sellers.
 *
 * Run:  bunx tsx prisma/seed-marketplace.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function img(seed: string) {
  return `https://picsum.photos/seed/${seed}/600/600`;
}

async function main() {
  console.log("Seeding Marketplace products + sample orders...");

  await db.order.deleteMany();
  await db.product.deleteMany();

  // Pick a stable set of seller accounts — try to find existing seeded users,
  // fall back to creating fresh demo sellers if needed.
  const existingUsers = await db.user.findMany({
    where: {
      email: {
        in: [
          "chinedu@gaexpay.com",
          "fatima@gaexpay.com",
          "kwame@gaexpay.com",
          "amina@gaexpay.com",
          "tunde@gaexpay.com",
          "grace@gaexpay.com",
          "yusuf@gaexpay.com",
          "lerato@gaexpay.com",
        ],
      },
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  let sellers = existingUsers;
  if (sellers.length < 4) {
    // Ensure we have at least 4 sellers
    const need = 4 - sellers.length;
    for (let i = 0; i < need; i++) {
      const s = await db.user.create({
        data: {
          email: `seller${i}@gaexpay.com`,
          phone: `+23480${Math.floor(rand(10000000, 99999999))}`,
          passwordHash: "seller_hash",
          firstName: pick(["Ibrahim", "Adebayo", "Chiamaka", "Musa", "Halima"]),
          lastName: pick(["Olawale", "Okafor", "Sani", "Bello", "Eze"]),
          username: `seller${i}`,
          country: "Nigeria",
          kycStatus: "verified",
          kycTier: 2,
          status: "active",
          accountType: "business",
          referralCode: `GXP-SELLER${i}`,
        },
      });
      sellers.push(s);
    }
  }

  console.log(`Using ${sellers.length} sellers`);

  // 20 demo products across 8 categories
  const products: Array<{
    name: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    images: string[];
    stock: number;
    status: string;
    rating: number;
    reviewCount: number;
    salesCount: number;
    createdAt: Date;
  }> = [
    // Electronics
    {
      name: "Wireless Bluetooth Earbuds Pro",
      description:
        "Premium noise-cancelling wireless earbuds with 32-hour battery life, IPX5 water resistance, and crystal-clear sound. Includes USB-C fast charging case.",
      category: "electronics",
      price: 28500,
      currency: "NGN",
      images: [img("earbuds-pro"), img("earbuds-pro-2"), img("earbuds-pro-3")],
      stock: 45,
      status: "active",
      rating: 4.7,
      reviewCount: 124,
      salesCount: 312,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18),
    },
    {
      name: "Smart Fitness Watch Series 7",
      description:
        "Heart-rate, SpO2, sleep tracking, 14-day battery, 50+ sport modes. Compatible with iOS and Android. Sleek aluminum body with AMOLED display.",
      category: "electronics",
      price: 64000,
      currency: "NGN",
      images: [img("fitwatch-7"), img("fitwatch-7-2"), img("fitwatch-7-3")],
      stock: 28,
      status: "active",
      rating: 4.5,
      reviewCount: 89,
      salesCount: 156,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
    },
    {
      name: "Portable Power Bank 20000mAh",
      description:
        "Fast-charge power bank with USB-C PD 20W, dual USB-A outputs, LED display, and durable aluminum shell. Charges a phone 4-5 times.",
      category: "electronics",
      price: 14500,
      currency: "NGN",
      images: [img("powerbank"), img("powerbank-2")],
      stock: 80,
      status: "active",
      rating: 4.6,
      reviewCount: 210,
      salesCount: 540,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
    },
    // Fashion
    {
      name: "African Print Ankara Dress",
      description:
        "Hand-tailored Ankara dress with modern cut. 100% cotton fabric. Available in S/M/L/XL. Made in Lagos by Adaeze Couture.",
      category: "fashion",
      price: 18500,
      currency: "NGN",
      images: [img("ankara-dress"), img("ankara-dress-2"), img("ankara-dress-3")],
      stock: 22,
      status: "active",
      rating: 4.9,
      reviewCount: 67,
      salesCount: 95,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    },
    {
      name: "Premium Leather Sneakers",
      description:
        "Italian full-grain leather sneakers with cushioned insole and rubber outsole. Timeless minimalist design. Unisex sizing.",
      category: "fashion",
      price: 42000,
      currency: "NGN",
      images: [img("sneakers-leather"), img("sneakers-leather-2")],
      stock: 15,
      status: "active",
      rating: 4.4,
      reviewCount: 38,
      salesCount: 64,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      name: "Designer Sunglasses (UV400)",
      description:
        "Polarized UV400 protection sunglasses with acetate frame and stainless-steel hinges. Includes hard case and microfiber cloth.",
      category: "fashion",
      price: 12800,
      currency: "NGN",
      images: [img("sunglasses"), img("sunglasses-2")],
      stock: 60,
      status: "active",
      rating: 4.3,
      reviewCount: 52,
      salesCount: 110,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16),
    },
    // Home
    {
      name: "Smart LED Bulb (4-Pack)",
      description:
        "Wi-Fi RGB smart bulbs, 16M colors, voice control with Alexa/Google, schedules, and energy-saving 9W design. E27 base.",
      category: "home",
      price: 16500,
      currency: "NGN",
      images: [img("smartbulb"), img("smartbulb-2")],
      stock: 50,
      status: "active",
      rating: 4.6,
      reviewCount: 144,
      salesCount: 280,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    },
    {
      name: "Bamboo Cutlery Travel Set",
      description:
        "Eco-friendly bamboo cutlery set (fork, knife, spoon, chopsticks, straw + brush) in a cotton pouch. Plastic-free, reusable, dishwasher-safe.",
      category: "home",
      price: 5500,
      currency: "NGN",
      images: [img("bamboo-cutlery")],
      stock: 120,
      status: "active",
      rating: 4.8,
      reviewCount: 76,
      salesCount: 198,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    },
    {
      name: "Scented Soy Candles Trio",
      description:
        "Hand-poured soy wax candles — Vanilla, Lavender, and Sandalwood. 45-hour burn time each. Cotton wicks, zero parabens.",
      category: "home",
      price: 9800,
      currency: "NGN",
      images: [img("candles"), img("candles-2")],
      stock: 40,
      status: "active",
      rating: 4.7,
      reviewCount: 41,
      salesCount: 72,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    },
    // Food
    {
      name: "Premium Honey 1L (Raw)",
      description:
        "100% raw unfiltered honey from the Jos Plateau. No additives, no preservatives. Sealed glass jar with tamper-proof lid.",
      category: "food",
      price: 7500,
      currency: "NGN",
      images: [img("honey-jar")],
      stock: 90,
      status: "active",
      rating: 4.9,
      reviewCount: 158,
      salesCount: 410,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 22),
    },
    {
      name: "Specialty Coffee Beans 1kg",
      description:
        "Single-origin Arabica beans from the Taraba highlands. Medium roast, notes of cocoa and citrus. Roasted to order.",
      category: "food",
      price: 11000,
      currency: "NGN",
      images: [img("coffee-beans"), img("coffee-beans-2")],
      stock: 65,
      status: "active",
      rating: 4.8,
      reviewCount: 93,
      salesCount: 145,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    },
    {
      name: "Spicy Pepper Sauce (3-Pack)",
      description:
        "Hand-crafted chili pepper sauce trio: Habanero, Scotch Bonnet, and Ghanaian Shito. No artificial colors. 250ml each.",
      category: "food",
      price: 6800,
      currency: "NGN",
      images: [img("pepper-sauce")],
      stock: 75,
      status: "active",
      rating: 4.5,
      reviewCount: 47,
      salesCount: 132,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
    },
    // Services
    {
      name: "Home Cleaning Service (4 hrs)",
      description:
        "Professional deep-cleaning service for apartments and homes. 2 trained cleaners, eco-friendly products, all areas covered. Lagos & Abuja only.",
      category: "services",
      price: 18000,
      currency: "NGN",
      images: [img("cleaning-service")],
      stock: 10,
      status: "active",
      rating: 4.7,
      reviewCount: 38,
      salesCount: 86,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
    {
      name: "Graphic Design — Logo Pack",
      description:
        "Custom logo design with 3 concepts, unlimited revisions, source files (AI, SVG, PNG), and brand color palette. Delivered in 5 days.",
      category: "services",
      price: 35000,
      currency: "NGN",
      images: [img("logo-design")],
      stock: 99,
      status: "active",
      rating: 4.9,
      reviewCount: 124,
      salesCount: 240,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11),
    },
    {
      name: "Car Wash & Detailing (Premium)",
      description:
        "Full interior + exterior car detailing with wax, vacuum, leather conditioning, and engine wash. Lagos only. Booking required.",
      category: "services",
      price: 15000,
      currency: "NGN",
      images: [img("car-detailing")],
      stock: 6,
      status: "active",
      rating: 4.6,
      reviewCount: 22,
      salesCount: 54,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
    // Digital
    {
      name: "Notion Productivity Template (Pro)",
      description:
        "All-in-one Notion dashboard: tasks, habits, finance tracker, goals, journaling, and weekly review. Instant download + lifetime updates.",
      category: "digital",
      price: 4500,
      currency: "NGN",
      images: [img("notion-template")],
      stock: 999,
      status: "active",
      rating: 4.9,
      reviewCount: 312,
      salesCount: 1240,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28),
    },
    {
      name: "E-book: Personal Finance for Africans",
      description:
        "240-page PDF guide on budgeting, saving, investing, and building wealth in African economies. By financial educator Adaeze Okonkwo.",
      category: "digital",
      price: 6500,
      currency: "NGN",
      images: [img("ebook-finance")],
      stock: 999,
      status: "active",
      rating: 4.8,
      reviewCount: 187,
      salesCount: 540,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35),
    },
    {
      name: "Photoshop Actions Pack (50 presets)",
      description:
        "50 professional Photoshop actions for portrait, wedding, and landscape photography. One-click installation. Compatible with PS CC 2018+.",
      category: "digital",
      price: 7200,
      currency: "NGN",
      images: [img("ps-actions")],
      stock: 999,
      status: "active",
      rating: 4.7,
      reviewCount: 64,
      salesCount: 132,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13),
    },
    // Health
    {
      name: "Digital Blood Pressure Monitor",
      description:
        "FDA-cleared automatic arm blood pressure monitor with 90-reading memory, irregular-heartbeat detector, and large LCD display.",
      category: "health",
      price: 22500,
      currency: "NGN",
      images: [img("bp-monitor"), img("bp-monitor-2")],
      stock: 35,
      status: "active",
      rating: 4.6,
      reviewCount: 58,
      salesCount: 92,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
    },
    {
      name: "Vitamin C + Zinc Immunity Pack",
      description:
        "60-day supply of vitamin C (1000mg) + zinc (15mg) effervescent tablets. Supports immune function. Pharmaceutical-grade.",
      category: "health",
      price: 8900,
      currency: "NGN",
      images: [img("vitamin-c")],
      stock: 70,
      status: "active",
      rating: 4.5,
      reviewCount: 103,
      salesCount: 215,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    },
    // Other
    {
      name: "Customized Gift Hamper",
      description:
        "Luxury gift hamper with assorted snacks, wine, chocolates, and a personalized card. Perfect for birthdays, anniversaries, and corporate gifts.",
      category: "other",
      price: 32000,
      currency: "NGN",
      images: [img("gift-hamper"), img("gift-hamper-2")],
      stock: 18,
      status: "active",
      rating: 4.8,
      reviewCount: 34,
      salesCount: 58,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17),
    },
  ];

  // Pick the demo user as a buyer for sample orders
  const demoUser = await db.user.findFirst({
    where: { email: "demo@gaexpay.com" },
    select: { id: true },
  });

  for (const [i, p] of products.entries()) {
    const seller = sellers[i % sellers.length];
    const product = await db.product.create({
      data: {
        sellerId: seller.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        currency: p.currency,
        images: JSON.stringify(p.images),
        stock: p.stock,
        status: p.status,
        rating: p.rating,
        reviewCount: p.reviewCount,
        salesCount: p.salesCount,
        createdAt: p.createdAt,
      },
    });

    // Create 2-4 sample orders per product from random buyers
    const orderCount = Math.floor(rand(2, 5));
    for (let j = 0; j < orderCount; j++) {
      const buyer =
        demoUser && j === 0
          ? demoUser
          : pick(sellers.filter((s) => s.id !== seller.id)) ?? sellers[0];
      if (!buyer) continue;
      const qty = Math.floor(rand(1, 4));
      const status = pick(["pending", "accepted", "shipped", "completed", "completed", "completed"]);
      await db.order.create({
        data: {
          productId: product.id,
          buyerId: buyer.id,
          quantity: qty,
          amount: product.price * qty,
          currency: product.currency,
          status,
          createdAt: new Date(
            Date.now() - Math.floor(rand(0, 1000 * 60 * 60 * 24 * 20)),
          ),
        },
      });
    }
  }

  const totalProducts = await db.product.count();
  const totalOrders = await db.order.count();
  console.log(`Seeded ${totalProducts} products and ${totalOrders} sample orders.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
