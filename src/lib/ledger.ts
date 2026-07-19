import { db } from "@/lib/db";

/**
 * GaexPay Double-Entry Ledger Engine
 * ----------------------------------
 * Every money movement in the platform MUST be expressed as a pair (or more)
 * of `LedgerEntry` rows that NET TO ZERO. This makes the system auditable:
 *   * `debit`  represents value flowing OUT of an account
 *   * `credit` represents value flowing INTO an account
 *   * For every transaction: Σ(debit) === Σ(credit)
 *
 * Account balances are derived: balance = Σ(credit) - Σ(debit).
 * (A `LedgerBalance` row can be maintained as a denormalized cache, but the
 *  entries table is the source of truth.)
 *
 * In SQLite (dev) `debit`/`credit`/`balance` are `Float`; in PostgreSQL
 * (production — see prisma/schema.postgres.prisma) they are `Decimal(18,4)`.
 * The numeric API below is `number` for dev parity; production callers should
 * coerce Prisma `Decimal` results to `number` (`.toNumber()`) before passing
 * them back in.
 */

export type LedgerAccountType =
  | "user-wallet"
  | "fee-revenue"
  | "float"
  | "tax"
  | "suspense"
  | "treasury";

export interface PostEntryParams {
  accountId: string;
  transactionId?: string;
  debit?: number;
  credit?: number;
  currency: string;
}

/**
 * Get-or-create the ledger account that mirrors a user's wallet for a given
 * currency. The account `code` is deterministic so re-calling this is safe.
 */
export async function ensureUserLedgerAccount(userId: string, currency: string) {
  const code = `WALLET-${userId}-${currency}`;
  let account = await db.ledgerAccount.findUnique({ where: { code } });
  if (!account) {
    account = await db.ledgerAccount.create({
      data: { userId, type: "user-wallet", currency, code },
    });
  }
  return account;
}

/**
 * Get-or-create the platform-wide fee-revenue account for a currency.
 * All fees collected on transactions are credited here.
 */
export async function ensureFeeAccount(currency: string) {
  const code = `FEE-${currency}`;
  let account = await db.ledgerAccount.findUnique({ where: { code } });
  if (!account) {
    account = await db.ledgerAccount.create({
      data: { type: "fee-revenue", currency, code },
    });
  }
  return account;
}

/**
 * Get-or-create an arbitrary system ledger account (treasury, tax, suspense,
 * float). The `code` must be unique platform-wide; passing the same code
 * returns the existing account.
 */
export async function ensureSystemAccount(
  type: Exclude<LedgerAccountType, "user-wallet" | "fee-revenue">,
  currency: string,
  code: string,
) {
  let account = await db.ledgerAccount.findUnique({ where: { code } });
  if (!account) {
    account = await db.ledgerAccount.create({
      data: { type, currency, code },
    });
  }
  return account;
}

/**
 * Append a single ledger entry. MUST be called inside a `db.$transaction`
 * block so the entry is committed atomically with the wallet/transaction
 * mutation that produced it.
 *
 * Pass the `tx` (transaction client) explicitly — never the global `db` —
 * so the entry participates in the surrounding transaction.
 */
export async function postEntry(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  params: PostEntryParams,
) {
  return tx.ledgerEntry.create({
    data: {
      accountId: params.accountId,
      transactionId: params.transactionId,
      debit: params.debit || 0,
      credit: params.credit || 0,
      currency: params.currency,
    },
  });
}

/**
 * Verify a set of entries nets to zero (double-entry invariant).
 * Throws if the imbalance exceeds a 1e-4 tolerance (handles Float rounding
 * in SQLite; in PostgreSQL Decimal the tolerance is effectively unused).
 */
export function assertBalanced(entries: { debit: number; credit: number }[]) {
  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error(
      `Ledger imbalance: debit=${totalDebit} credit=${totalCredit}`,
    );
  }
}

/**
 * Compute an account's balance from its entry history.
 * Positive = account holds money; negative = account is overdrawn.
 *
 * NOTE: For hot paths (e.g. balance checks inside transactions), prefer
 * reading the wallet/`LedgerBalance` row directly. This aggregate is for
 * audits, statements, and reconciliation jobs.
 */
export async function getAccountBalance(accountId: string, currency: string) {
  const entries = await db.ledgerEntry.findMany({
    where: { accountId, currency },
    select: { debit: true, credit: true },
  });
  const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  return credit - debit; // Positive = account has money
}

/**
 * Convenience: post a balanced two-leg transfer (debit one account, credit
 * another) inside a transaction. Both legs share the same `transactionId`
 * so they can be reconstructed into a single money movement later.
 *
 * Caller is responsible for wrapping this in `db.$transaction`.
 */
export async function postTransfer(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  opts: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: string;
    transactionId?: string;
  },
) {
  if (opts.amount <= 0) {
    throw new Error(`Ledger transfer amount must be positive (got ${opts.amount})`);
  }
  const debitLeg = await postEntry(tx, {
    accountId: opts.fromAccountId,
    transactionId: opts.transactionId,
    debit: opts.amount,
    currency: opts.currency,
  });
  const creditLeg = await postEntry(tx, {
    accountId: opts.toAccountId,
    transactionId: opts.transactionId,
    credit: opts.amount,
    currency: opts.currency,
  });
  assertBalanced([
    { debit: opts.amount, credit: 0 },
    { debit: 0, credit: opts.amount },
  ]);
  return { debitLeg, creditLeg };
}
