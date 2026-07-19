/**
 * mini-services/payment-service/src/lib/internal-wallet.client.ts
 *
 * Client HTTP dédié pour la communication inter-service vers le wallet-service.
 * - Retry exponentiel (3 tentatives, backoff + jitter).
 * - Timeout strict 5 secondes par tentative.
 * - Logging structuré pour observabilité.
 * - Utilisé uniquement depuis payment.service.ts pour créditer/débiter le ledger.
 */

export type WalletDirection = "PAYIN" | "PAYOUT";

export interface WalletNotifyParams {
  userId: string;
  amount: string;       // Ex: "1500.00"
  currency: string;     // Ex: "XAF"
  externalRef: string;  // = transactionRef du payment-service
  idempotencyKey: string;
  direction: WalletDirection;
}

const WALLET_SERVICE_URL =
  process.env.WALLET_SERVICE_URL ?? "http://localhost:3001";
const INTERNAL_API_KEY =
  process.env.GXP_INTERNAL_API_KEY ?? "mock_internal_key";
const TIMEOUT_MS = 5_000;
const MAX_RETRIES = 3;

/**
 * Effectue une requête vers le wallet-service avec timeout + retry exponentiel + jitter.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retriesLeft = MAX_RETRIES,
  delayMs = 500
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    // Réessaye uniquement sur les erreurs transitoires (5xx, 429)
    if ((response.status >= 500 || response.status === 429) && retriesLeft > 0) {
      const jitter = Math.random() * 200;
      const nextDelay = delayMs * 2 + jitter;
      console.warn(
        `[WALLET_CLIENT] wallet-service returned ${response.status}. Retrying in ${nextDelay.toFixed(0)}ms (${retriesLeft} retries left).`
      );
      await new Promise((r) => setTimeout(r, nextDelay));
      return fetchWithRetry(url, options, retriesLeft - 1, nextDelay);
    }

    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new Error(`[WALLET_CLIENT] Request timeout after ${TIMEOUT_MS}ms: ${url}`);
    }

    if (retriesLeft > 0) {
      const jitter = Math.random() * 200;
      const nextDelay = delayMs * 2 + jitter;
      console.warn(
        `[WALLET_CLIENT] Network error: ${err.message}. Retrying in ${nextDelay.toFixed(0)}ms (${retriesLeft} retries left).`
      );
      await new Promise((r) => setTimeout(r, nextDelay));
      return fetchWithRetry(url, options, retriesLeft - 1, nextDelay);
    }

    throw err;
  }
}

/**
 * Notifie le wallet-service pour créditer (PAYIN) ou débiter (PAYOUT) le ledger.
 *
 * L'idempotencyKey transmis est le transactionRef du payment-service,
 * ce qui garantit que le wallet-service ne traitera jamais deux fois
 * la même opération même en cas de retry réseau.
 *
 * Throws si la notification échoue après tous les retries — l'appelant
 * doit gérer cette exception et déclencher une réconciliation manuelle.
 */
export async function notifyWalletService(params: WalletNotifyParams): Promise<void> {
  const ledgerType = params.direction === "PAYIN" ? "DEPOSIT" : "WITHDRAWAL";
  const endpoint =
    params.direction === "PAYIN"
      ? `${WALLET_SERVICE_URL}/internal/wallets/${params.userId}/credit`
      : `${WALLET_SERVICE_URL}/internal/wallets/${params.userId}/debit`;

  const body = JSON.stringify({
    type: ledgerType,
    amount: params.amount,
    currency: params.currency,
    externalRef: params.externalRef,
    idempotencyKey: params.idempotencyKey,
    description: `${ledgerType} via payment-service ref ${params.externalRef}`,
  });

  console.log(
    `[WALLET_CLIENT] Notifying wallet-service: userId=${params.userId} direction=${params.direction} amount=${params.amount} ${params.currency} ref=${params.externalRef}`
  );

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": INTERNAL_API_KEY,
    },
    body,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `[WALLET_CLIENT] wallet-service returned ${response.status} for ref ${params.externalRef}: ${errBody}`
    );
  }

  const data = await response.json().catch(() => ({})) as { status?: string };
  console.log(
    `[WALLET_CLIENT] wallet-service confirmed ledger entry. Status: ${data?.status ?? "OK"} | ref=${params.externalRef}`
  );
}
