import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import QRCode from "qrcode";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Deterministic per-user address generator — produces realistic-looking
// addresses per coin using a tiny seeded PRNG so each demo user always
// gets the same deposit addresses (looks real, never collides with a
// live wallet because these are demo-only).

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABETS = {
  base58: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  hex: "0123456789abcdef",
  bech32: "qpzry9x8gf2tvdw0s3jn54khce6mua7l",
};

function pick(rand: () => number, alphabet: string, len: number) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return out;
}

function seedFromString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Realistic-looking per-coin address generator
const CRYPTO_ADDRESS_BUILDERS: Record<
  string,
  (rand: () => number) => { address: string; network: string; memo?: string }
> = {
  BTC: (r) => ({
    // Bech32 native segwit (bc1q…) — 42 chars
    address: "bc1q" + pick(r, ALPHABETS.bech32, 38),
    network: "Bitcoin (BTC) · SegWit",
  }),
  ETH: (r) => ({
    address: "0x" + pick(r, ALPHABETS.hex, 40),
    network: "Ethereum (ERC-20)",
  }),
  USDT: (r) => ({
    // TRC-20 TRON-style T… address
    address: "T" + pick(r, ALPHABETS.base58, 33),
    network: "TRON (TRC-20)",
    memo: "Recommended: TRC-20 (lowest fees). ERC-20 also supported.",
  }),
  USDC: (r) => ({
    address: "0x" + pick(r, ALPHABETS.hex, 40),
    network: "Ethereum (ERC-20) / Polygon / Solana",
  }),
  BNB: (r) => ({
    address: "bnb1" + pick(r, ALPHABETS.bech32, 38),
    network: "Binance Smart Chain (BEP-20)",
  }),
  SOL: (r) => ({
    // Solana base58, 44 chars
    address: pick(r, ALPHABETS.base58, 44),
    network: "Solana",
  }),
  PI: (r) => ({
    // Pi Network wallet — starts with G, 56 chars base58
    address: "G" + pick(r, ALPHABETS.base58, 55),
    network: "Pi Network (Mainnet)",
    memo: "Pi Network is pre-mainnet. Always confirm the recipient address.",
  }),
  TRX: (r) => ({
    address: "T" + pick(r, ALPHABETS.base58, 33),
    network: "TRON",
  }),
};

const CRYPTO_META: Record<string, { name: string; symbol: string; icon: string; color: string }> = {
  BTC: { name: "Bitcoin", symbol: "₿", icon: "🪙", color: "#F7931A" },
  ETH: { name: "Ethereum", symbol: "Ξ", icon: "💎", color: "#627EEA" },
  USDT: { name: "Tether USD", symbol: "₮", icon: "💵", color: "#26A17B" },
  USDC: { name: "USD Coin", symbol: "₮", icon: "💵", color: "#2775CA" },
  BNB: { name: "BNB", symbol: "⬡", icon: "🟡", color: "#F0B90B" },
  SOL: { name: "Solana", symbol: "◎", icon: "🌞", color: "#9945FF" },
  PI: { name: "Pi Network", symbol: "π", icon: "🟣", color: "#8B5CF6" },
  TRX: { name: "TRON", symbol: "Ṫ", icon: "🔴", color: "#FF060A" },
};

const SUPPORTED_PAYMENT_METHODS = [
  {
    id: "wallet",
    name: "GaexPay Wallet",
    description: "Instant transfer between GaexPay users",
    fee: "Free",
    time: "Instant",
    icon: "wallet",
    accent: "emerald",
    supports: ["p2p", "request", "qr"],
  },
  {
    id: "bank",
    name: "Bank Transfer",
    description: "Send to your GaexPay tag from any bank app",
    fee: "Bank fees apply",
    time: "1–3 business days",
    icon: "landmark",
    accent: "sky",
    supports: ["fiat"],
  },
  {
    id: "momo",
    name: "Mobile Money",
    description: "MTN, Orange, Airtel, M-PESA, Wave & more",
    fee: "Provider fees apply",
    time: "Instant",
    icon: "smartphone",
    accent: "amber",
    supports: ["fiat"],
    providers: ["MTN MoMo", "Orange Money", "Airtel Money", "M-PESA", "Wave", "Moov Money"],
  },
  {
    id: "crypto",
    name: "Crypto",
    description: "BTC, ETH, USDT, USDC, BNB, SOL, PI, TRX",
    fee: "Network fee only",
    time: "10–30 min",
    icon: "bitcoin",
    accent: "violet",
    supports: ["crypto"],
    coins: ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "PI", "TRX"],
  },
  {
    id: "qr",
    name: "QR Code",
    description: "Scan your QR to receive any supported payment",
    fee: "Free",
    time: "Instant",
    icon: "qr",
    accent: "teal",
    supports: ["qr"],
  },
  {
    id: "link",
    name: "Payment Link",
    description: "gaexpay.com/pay/@username — share anywhere",
    fee: "Free",
    time: "Instant",
    icon: "link",
    accent: "rose",
    supports: ["link"],
  },
];

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        username: true,
        referralCode: true,
        kycStatus: true,
        kycTier: true,
        country: true,
        city: true,
        avatar: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found. Run seed." }, { status: 404 });
    }

    const username = user.username || (user.email?.split("@")[0] ?? "user");
    const atHandle = `@${username}`;
    const gaexPayId = user.referralCode || `GXP-${username.toUpperCase()}`;
    const shareableLink = `https://gaexpay.com/pay/${atHandle}`;

    // Generate per-coin deposit addresses deterministically from the user id
    const seed = seedFromString(user.id);
    const rand = mulberry32(seed);
    const cryptoAddresses = Object.keys(CRYPTO_ADDRESS_BUILDERS).map((code) => {
      const built = CRYPTO_ADDRESS_BUILDERS[code](rand);
      const meta = CRYPTO_META[code];
      return {
        code,
        name: meta.name,
        symbol: meta.symbol,
        icon: meta.icon,
        color: meta.color,
        address: built.address,
        network: built.network,
        memo: built.memo,
      };
    });

    // Generate QR code data URL (encodes the shareable payment link)
    const qrDataUrl = await QRCode.toDataURL(shareableLink, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    // Also a "compact" QR that just encodes the @handle (for printed cards)
    const qrHandleDataUrl = await QRCode.toDataURL(atHandle, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    const fullName = `${user.firstName} ${user.lastName}`;
    const initials = (user.firstName[0] || "U") + (user.lastName[0] || "");

    // Fetch recent incoming payments (credits)
    const recentIncoming = await db.transaction.findMany({
      where: {
        userId,
        direction: "credit",
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        initials: initials.toUpperCase(),
        avatar: user.avatar,
        username,
        atHandle,
        email: user.email,
        phone: user.phone,
        gaexPayId,
        country: user.country,
        city: user.city,
        kycStatus: user.kycStatus,
        kycTier: user.kycTier,
        verified: user.kycStatus === "verified",
        status: user.status,
      },
      // The 4 unified addresses — all of them receive ALL payment types
      addresses: {
        atHandle: {
          value: atHandle,
          label: "@username",
          description: "Your GaexPay tag — receives every payment type",
          shareable: true,
        },
        email: {
          value: user.email,
          label: "Email",
          description: "Senders can pay to your registered email",
          shareable: true,
        },
        phone: {
          value: user.phone,
          label: "Phone",
          description: "Receives payments & mobile money",
          shareable: true,
        },
        gaexPayId: {
          value: gaexPayId,
          label: "GaexPay ID",
          description: "Your permanent GaexPay identifier",
          shareable: true,
        },
      },
      shareableLink,
      qrCode: {
        dataUrl: qrDataUrl,
        compactDataUrl: qrHandleDataUrl,
        payload: shareableLink,
        size: 512,
      },
      cryptoAddresses,
      supportedPaymentMethods: SUPPORTED_PAYMENT_METHODS,
      recentIncoming: recentIncoming.map((t) => ({
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        currency: t.currency,
        fee: t.fee,
        type: t.type,
        method: t.method,
        description: t.description,
        counterpartyName: t.counterpartyName,
        counterpartyAccount: t.counterpartyAccount,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
      stats: {
        totalIncoming: recentIncoming.length,
        lastReceivedAt: recentIncoming[0]?.createdAt ?? null,
        supportedCurrencies: 32,
        supportedCryptos: 8,
        supportedCountries: 40,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
