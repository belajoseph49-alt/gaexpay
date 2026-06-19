/**
 * src/lib/validations.ts
 *
 * Zod schemas for GaexPay API request bodies.
 *
 * Why centralise this:
 *  - Every money-moving endpoint validates with the SAME amount rule, so a
 *    negative amount can never slip through via a forgotten `if`.
 *  - Schemas double as TypeScript types (via `z.infer`), keeping route
 *    handlers type-safe end-to-end.
 *  - Rejection is automatic — `schema.safeParse(body)` returns either the
 *    typed value or a structured error we can surface to the client.
 *
 * NOTE: `z.string().alphanumeric()` was removed in zod v4; we use the
 * equivalent regex `^[a-zA-Z0-9]+$` everywhere an alphanumeric check is
 * needed.
 */

import { z } from "zod";

// ---------- Primitives ----------

/** Positive amount, capped at 1e9 to prevent integer-overflow / 1e308 abuse. */
export const amountSchema = z.number().positive().max(1e9);

/** 3-letter ISO 4217 currency code (e.g. NGN, USD, EUR). */
export const currencySchema = z.string().length(3).regex(/^[A-Z]{3}$/);

/** Short alphanumeric reference — used for external references we accept. */
export const referenceSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]+$/)
  .max(20);

/** RFC-5322-ish email — zod's built-in is good enough for our purposes. */
export const emailSchema = z.string().email().max(254);

/** E.164 phone number, e.g. `+2348012345678`. */
export const phoneSchema = z.string().regex(/^\+\d{10,15}$/);

/** Free text note — bounded to prevent log-injection / DoS-via-large-payload. */
export const noteSchema = z.string().max(200).optional();

/** Recipient of a transfer — name + account reference. */
export const recipientSchema = z.object({
  name: z.string().min(1).max(100),
  account: z.string().min(1).max(50),
  bank: z.string().max(100).optional(),
  phone: phoneSchema.optional(),
});

// ---------- Composed schemas ----------

/**
 * POST /api/transfer
 * Body shape:
 *   {
 *     amount: number,
 *     currency: "NGN",
 *     recipient: { name, account, bank?, phone? },
 *     method: "wallet" | "bank" | "momo",
 *     provider?: string,
 *     note?: string,
 *     category?: string,
 *   }
 */
export const transferSchema = z.object({
  amount: amountSchema,
  currency: currencySchema,
  recipient: recipientSchema,
  method: z.enum(["wallet", "bank", "momo"]),
  provider: z.string().max(50).optional(),
  note: noteSchema,
  category: z.string().max(40).optional(),
});

/**
 * POST /api/crypto/trade
 * Body shape:
 *   {
 *     action: "buy" | "sell",
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: number,
 *     amountType: "fiat" | "crypto",
 *   }
 */
export const tradeSchema = z.object({
  action: z.enum(["buy", "sell"]),
  crypto: z.string().min(2).max(10).regex(/^[a-zA-Z0-9]+$/),
  fiatCurrency: currencySchema,
  amount: amountSchema,
  amountType: z.enum(["fiat", "crypto"]),
});

/**
 * POST /api/crypto/cashout
 * Body shape:
 *   {
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: number,        // amount of crypto to cash out
 *   }
 */
export const cashoutSchema = z.object({
  crypto: z.string().min(2).max(10).regex(/^[a-zA-Z0-9]+$/),
  fiatCurrency: currencySchema,
  amount: amountSchema,
});

/**
 * POST /api/crypto/swap
 * Body shape:
 *   {
 *     fromCrypto: "BTC",
 *     toCrypto: "ETH",
 *     amount: number,
 *   }
 */
export const swapSchema = z.object({
  fromCrypto: z.string().min(2).max(10).regex(/^[a-zA-Z0-9]+$/),
  toCrypto: z.string().min(2).max(10).regex(/^[a-zA-Z0-9]+$/),
  amount: amountSchema,
});

// ---------- Type exports ----------

export type TransferInput = z.infer<typeof transferSchema>;
export type TradeInput = z.infer<typeof tradeSchema>;
export type CashoutInput = z.infer<typeof cashoutSchema>;
export type SwapInput = z.infer<typeof swapSchema>;

/**
 * Format a ZodError into a compact string suitable for an HTTP error body.
 * Returns the FIRST validation issue (the most actionable for the caller);
 * additional issues are dropped to keep responses small.
 */
export function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return "Invalid request body";
  const path = first.path.length > 0 ? first.path.join(".") : "value";
  return `Invalid ${path}: ${first.message}`;
}
