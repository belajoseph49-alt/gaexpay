import { NextResponse } from "next/server";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/products
 *
 * Returns the GaexPay marketplace catalog: brand stores, categories,
 * promotional offers and a searchable product list. The catalog is static
 * demo data — prices are expressed in NGN so the existing `useFormatMoney`
 * hook can convert them to the user's preferred display currency.
 *
 * No auth required: the marketplace is a public storefront.
 */

// ---- Types -----------------------------------------------------------------

export interface MarketplaceCategory {
  id: string;
  label: string;
  labelKey: string;
}

export interface MarketplacePromo {
  id: string;
  brand: string;
  brandEmoji: string;
  title: string;        // e.g. "15% Discount"
  percent: number;
  /** Tailwind gradient classes for the promo card background */
  gradient: string;
  cta: string;
  code: string;
}

export interface MarketplaceStore {
  id: string;
  name: string;
  emoji: string;
  /** Tailwind classes for the circular logo background */
  logoBg: string;
  category: string;
  availability: string;   // "Online & In-store"
  productCount: number;
  rating: number;
  /** Tailwind gradient classes for the hero banner background */
  banner: string;
  tagline: string;
}

export interface MarketplaceOffer {
  vendor: string;
  vendorEmoji: string;
  price: number;          // NGN
  shipping: string;       // "Free shipping" / "Free shipping (2-6 days)"
  inStock: boolean;
  etaDays?: string;
}

export interface MarketplaceProduct {
  id: string;
  storeId: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** Tailwind classes for the product image background */
  imageBg: string;
  category: string;
  subCategory: string;
  rating: number;
  reviews: number;
  priceNGN: number;
  oldPriceNGN?: number;
  popular: boolean;
  sizes?: string[];
  offers: MarketplaceOffer[];
}

export interface MarketplaceResponse {
  categories: MarketplaceCategory[];
  promos: MarketplacePromo[];
  stores: MarketplaceStore[];
  products: MarketplaceProduct[];
}

// ---- Static catalog --------------------------------------------------------

const categories: MarketplaceCategory[] = [
  { id: "popular", label: "Popular", labelKey: "marketplace.category.popular" },
  { id: "apparel", label: "Apparel", labelKey: "marketplace.category.apparel" },
  { id: "electronics", label: "Electronics", labelKey: "marketplace.category.electronics" },
  { id: "food", label: "Food & Drink", labelKey: "marketplace.category.food" },
  { id: "home", label: "Home", labelKey: "marketplace.category.home" },
  { id: "beauty", label: "Beauty", labelKey: "marketplace.category.beauty" },
];

const promos: MarketplacePromo[] = [
  {
    id: "p1",
    brand: "Nike",
    brandEmoji: "👟",
    title: "15% Discount",
    percent: 15,
    gradient: "from-[#6A11CB] to-[#9b5cff]",
    cta: "Pay with GaexPay",
    code: "GAEX15",
  },
  {
    id: "p2",
    brand: "Starbucks",
    brandEmoji: "☕",
    title: "10% Discount",
    percent: 10,
    gradient: "from-emerald-500 to-emerald-600",
    cta: "Pay with GaexPay",
    code: "GAEX10",
  },
];

const stores: MarketplaceStore[] = [
  {
    id: "nike",
    name: "Nike",
    emoji: "👟",
    logoBg: "from-[#6A11CB] to-[#9b5cff]",
    category: "Sport shoes",
    availability: "Online & In-store",
    productCount: 124,
    rating: 4.8,
    banner: "from-[#6A11CB] via-[#7d27d8] to-[#9b5cff]",
    tagline: "Just do it — with GaexPay rewards on every order.",
  },
  {
    id: "adidas",
    name: "Adidas",
    emoji: "👟",
    logoBg: "from-zinc-800 to-zinc-600",
    category: "Sneakers",
    availability: "Online & In-store",
    productCount: 98,
    rating: 4.7,
    banner: "from-zinc-800 via-zinc-700 to-zinc-500",
    tagline: "Impossible is nothing. Pay smarter with GaexPay.",
  },
  {
    id: "macys",
    name: "Macy's",
    emoji: "🛍️",
    logoBg: "from-rose-500 to-rose-600",
    category: "Department store",
    availability: "Online & In-store",
    productCount: 540,
    rating: 4.5,
    banner: "from-rose-500 via-rose-600 to-red-600",
    tagline: "The magic of Macy's, now payable with GaexPay.",
  },
  {
    id: "levis",
    name: "Levi's",
    emoji: "👖",
    logoBg: "from-red-600 to-red-700",
    category: "Apparel",
    availability: "Online & In-store",
    productCount: 76,
    rating: 4.6,
    banner: "from-red-600 via-red-700 to-rose-800",
    tagline: "Denim icons. Cashback when you pay with GaexPay.",
  },
  {
    id: "starbucks",
    name: "Starbucks",
    emoji: "☕",
    logoBg: "from-emerald-500 to-emerald-700",
    category: "Food & Drink",
    availability: "Online & In-store",
    productCount: 42,
    rating: 4.9,
    banner: "from-emerald-500 via-emerald-600 to-green-700",
    tagline: "Refuel and earn GaexPay rewards on every cup.",
  },
  {
    id: "puma",
    name: "Puma",
    emoji: "🐆",
    logoBg: "from-amber-500 to-orange-600",
    category: "Sport shoes",
    availability: "Online & In-store",
    productCount: 88,
    rating: 4.5,
    banner: "from-amber-500 via-orange-500 to-orange-700",
    tagline: "Forever faster — pay faster with GaexPay.",
  },
];

const products: MarketplaceProduct[] = [
  {
    id: "nike-air-max",
    storeId: "nike",
    title: "Nike Air Max 90",
    subtitle: "Men's lifestyle sneaker",
    emoji: "👟",
    imageBg: "from-violet-50 to-violet-100",
    category: "Sport shoes",
    subCategory: "Sneakers",
    rating: 4.5,
    reviews: 1284,
    priceNGN: 121680,    // ~$79 at 1540 NGN/USD
    oldPriceNGN: 154000,
    popular: true,
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 121680, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 184800, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "nike-blazer",
    storeId: "nike",
    title: "Nike Blazer Mid '77",
    subtitle: "Vintage court classic",
    emoji: "👟",
    imageBg: "from-orange-50 to-orange-100",
    category: "Sneakers",
    subCategory: "Sneakers",
    rating: 4.6,
    reviews: 842,
    priceNGN: 98560,
    oldPriceNGN: 123000,
    popular: true,
    sizes: ["39", "40", "41", "42", "43"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 98560, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 132000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "nike-dunk",
    storeId: "nike",
    title: "Nike Dunk Low Retro",
    subtitle: "Iconic colour blocking",
    emoji: "👟",
    imageBg: "from-sky-50 to-sky-100",
    category: "Sneakers",
    subCategory: "Sneakers",
    rating: 4.7,
    reviews: 2104,
    priceNGN: 139000,
    oldPriceNGN: 170000,
    popular: true,
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 139000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 205000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "nike-tech-fleece",
    storeId: "nike",
    title: "Nike Tech Fleece Hoodie",
    subtitle: "Engineered warmth",
    emoji: "🧥",
    imageBg: "from-zinc-50 to-zinc-100",
    category: "Apparel",
    subCategory: "Hoodies",
    rating: 4.4,
    reviews: 512,
    priceNGN: 88500,
    popular: false,
    sizes: ["S", "M", "L", "XL", "XXL"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 88500, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 110000, shipping: "Free shipping", inStock: false },
    ],
  },
  {
    id: "adidas-samba",
    storeId: "adidas",
    title: "Adidas Samba OG",
    subtitle: "Terrace culture staple",
    emoji: "👟",
    imageBg: "from-zinc-50 to-zinc-100",
    category: "Sneakers",
    subCategory: "Sneakers",
    rating: 4.7,
    reviews: 1832,
    priceNGN: 77000,
    oldPriceNGN: 99000,
    popular: true,
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 77000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 110000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "adidas-ultraboost",
    storeId: "adidas",
    title: "Adidas Ultraboost 22",
    subtitle: "Responsive running shoe",
    emoji: "👟",
    imageBg: "from-emerald-50 to-emerald-100",
    category: "Sport shoes",
    subCategory: "Running",
    rating: 4.6,
    reviews: 968,
    priceNGN: 165000,
    oldPriceNGN: 200000,
    popular: true,
    sizes: ["39", "40", "41", "42", "43", "44"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 165000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 220000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "adidas-track-jacket",
    storeId: "adidas",
    title: "Adidas Tiro Track Jacket",
    subtitle: "Stadium-ready essential",
    emoji: "🧥",
    imageBg: "from-slate-50 to-slate-100",
    category: "Apparel",
    subCategory: "Jackets",
    rating: 4.5,
    reviews: 441,
    priceNGN: 68000,
    popular: false,
    sizes: ["S", "M", "L", "XL"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 68000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 88000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "starbucks-tumbler",
    storeId: "starbucks",
    title: "Starbucks Cold Cup Tumbler",
    subtitle: "24oz reusable cup",
    emoji: "🥤",
    imageBg: "from-emerald-50 to-emerald-100",
    category: "Home",
    subCategory: "Drinkware",
    rating: 4.8,
    reviews: 1542,
    priceNGN: 24500,
    oldPriceNGN: 32000,
    popular: true,
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 24500, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 35000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "starbucks-gift-set",
    storeId: "starbucks",
    title: "Starbucks Coffee Gift Set",
    subtitle: "Whole bean assortment",
    emoji: "🎁",
    imageBg: "from-amber-50 to-amber-100",
    category: "Food & Drink",
    subCategory: "Gift sets",
    rating: 4.6,
    reviews: 312,
    priceNGN: 38500,
    popular: true,
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 38500, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 52000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "levis-501",
    storeId: "levis",
    title: "Levi's 501 Original Jeans",
    subtitle: "Straight-leg denim icon",
    emoji: "👖",
    imageBg: "from-blue-50 to-blue-100",
    category: "Apparel",
    subCategory: "Jeans",
    rating: 4.7,
    reviews: 2204,
    priceNGN: 92500,
    oldPriceNGN: 120000,
    popular: true,
    sizes: ["28", "30", "32", "34", "36", "38"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 92500, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 138000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "levs-trucker",
    storeId: "levis",
    title: "Levi's Trucker Jacket",
    subtitle: "Classic denim jacket",
    emoji: "🧥",
    imageBg: "from-indigo-50 to-indigo-100",
    category: "Apparel",
    subCategory: "Jackets",
    rating: 4.5,
    reviews: 658,
    priceNGN: 110000,
    popular: false,
    sizes: ["S", "M", "L", "XL", "XXL"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 110000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 156000, shipping: "Free shipping", inStock: false },
    ],
  },
  {
    id: "puma-rs-x",
    storeId: "puma",
    title: "Puma RS-X Reinvention",
    subtitle: "Chunky retro runner",
    emoji: "👟",
    imageBg: "from-amber-50 to-orange-100",
    category: "Sport shoes",
    subCategory: "Sneakers",
    rating: 4.4,
    reviews: 524,
    priceNGN: 81500,
    oldPriceNGN: 105000,
    popular: true,
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 81500, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 118000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "macys-watch",
    storeId: "macys",
    title: "Michael Kors Slim Watch",
    subtitle: "Stainless steel 42mm",
    emoji: "⌚",
    imageBg: "from-rose-50 to-rose-100",
    category: "Electronics",
    subCategory: "Watches",
    rating: 4.6,
    reviews: 412,
    priceNGN: 192000,
    oldPriceNGN: 260000,
    popular: true,
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 192000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 245000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "macys-perfume",
    storeId: "macys",
    title: "Calvin Klein Eternity EDP",
    subtitle: "100ml floral fragrance",
    emoji: "🌸",
    imageBg: "from-pink-50 to-pink-100",
    category: "Beauty",
    subCategory: "Fragrance",
    rating: 4.7,
    reviews: 824,
    priceNGN: 78000,
    oldPriceNGN: 98000,
    popular: true,
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 78000, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 102000, shipping: "Free shipping", inStock: true },
    ],
  },
  {
    id: "puma-t-shirt",
    storeId: "puma",
    title: "Puma Classic Logo Tee",
    subtitle: "Cotton crew-neck T-shirt",
    emoji: "👕",
    imageBg: "from-slate-50 to-slate-100",
    category: "Apparel",
    subCategory: "T-shirts",
    rating: 4.3,
    reviews: 286,
    priceNGN: 28500,
    popular: false,
    sizes: ["S", "M", "L", "XL", "XXL"],
    offers: [
      { vendor: "StockX", vendorEmoji: "📦", price: 28500, shipping: "Free shipping (2-6 days)", inStock: true, etaDays: "2-6" },
      { vendor: "Amazon", vendorEmoji: "🛒", price: 41000, shipping: "Free shipping", inStock: true },
    ],
  },
];

// ---- Route -----------------------------------------------------------------

export async function GET() {
  try {
    const body: MarketplaceResponse = {
      categories,
      promos,
      stores,
      products,
    };
    return NextResponse.json(body);
  } catch (e) {
    return apiCatch(e);
  }
}
