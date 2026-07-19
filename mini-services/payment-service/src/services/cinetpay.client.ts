/**
 * mini-services/payment-service/src/services/cinetpay.client.ts
 *
 * Client HTTP pour CinetPay (PayIn, PayOut, et vérification de statut).
 * Inclut :
 *  - Timeouts de 10s max.
 *  - Circuit Breaker pour éviter de marteler CinetPay s'il est en panne.
 *  - Retry avec backoff exponentiel et jitter en cas d'erreurs temporaires (5xx, timeouts).
 *  - Mode Mock/Test automatique si les clés ne sont pas configurées ou sont en mode dev.
 */

import { encrypt } from "../lib/crypto";

// Configuration simple du Circuit Breaker
enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private failureThreshold = 5; // Nombre d'échecs avant ouverture
  private cooldownMs = 30000;   // Cooldown de 30 secondes
  private lastStateChange: number = Date.now();

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state === CircuitState.OPEN) {
      throw new Error("Circuit Breaker is OPEN. CinetPay API is currently unreachable.");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateState() {
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastStateChange;
      if (timeSinceLastFailure > this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = Date.now();
        console.warn("Circuit Breaker transitioned to HALF-OPEN. Trying a health-check request.");
      }
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      console.log("Circuit Breaker transitioned to CLOSED. CinetPay API is healthy.");
    }
    this.failureCount = 0;
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      console.error(`Circuit Breaker transitioned to OPEN. Threshold of ${this.failureThreshold} errors reached.`);
    }
  }
}

export interface CinetPayPayInParams {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerSurname: string;
  customerEmail?: string;
  customerPhone?: string;
  notifyUrl: string;
  returnUrl: string;
  channels?: string;
}

export interface CinetPayPayOutParams {
  transactionId: string;
  amount: number;
  currency: string;
  phone: string; // Mobile money phone number
  prefix: string; // Phone prefix (e.g. 237 for Cameroun)
  notifyUrl: string;
}

export class CinetPayClient {
  private apiKey: string;
  private siteId: string;
  private secretKey: string;
  private payoutPassword?: string; // Utilisé pour l'auth payout si requis
  private isMock: boolean;
  private breaker = new CircuitBreaker();

  private payInBaseUrl = "https://api-checkout.cinetpay.com/v2";
  private payOutBaseUrl = "https://client.cinetpay.com/v1";
  
  // Cache pour le jeton payout
  private payoutToken: string | null = null;
  private payoutTokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY || "mock_apikey";
    this.siteId = process.env.CINETPAY_SITE_ID || "mock_siteid";
    this.secretKey = process.env.CINETPAY_SECRET_KEY || "mock_secretkey";
    this.payoutPassword = process.env.CINETPAY_PAYOUT_PASSWORD || "mock_password";
    this.isMock =
      this.apiKey.startsWith("mock_") ||
      process.env.NODE_ENV === "test";
  }

  /**
   * Effectue une requête HTTP avec timeout strict de 10 secondes et retry exponentiel + jitter.
   */
  private async requestWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delayMs = 1000
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout strict

    const config = {
      ...options,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Si erreur 5xx ou 429, on tente un retry
      if ((response.status >= 500 || response.status === 429) && retries > 0) {
        // Backoff exponentiel avec jitter
        const jitter = Math.random() * 200;
        const nextDelay = delayMs * 2 + jitter;
        console.warn(`CinetPay API returned status ${response.status}. Retrying in ${nextDelay.toFixed(0)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, nextDelay));
        return this.requestWithRetry(url, options, retries - 1, nextDelay);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`CinetPay Request Failed [${response.status}]: ${body}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(`CinetPay API timeout (10s limit exceeded) for ${url}`);
      }

      if (retries > 0) {
        const jitter = Math.random() * 200;
        const nextDelay = delayMs * 2 + jitter;
        console.warn(`CinetPay Request Error: ${error.message}. Retrying in ${nextDelay.toFixed(0)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, nextDelay));
        return this.requestWithRetry(url, options, retries - 1, nextDelay);
      }

      throw error;
    }
  }

  /**
   * Authentification pour PayOut (CinetPay requiert un login pour générer un Bearer Token)
   */
  private async getPayoutToken(): Promise<string> {
    if (this.isMock) return "mock_bearer_token";

    if (this.payoutToken && Date.now() < this.payoutTokenExpiry) {
      return this.payoutToken;
    }

    const res = await this.requestWithRetry(`${this.payOutBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: this.apiKey,
        password: this.payoutPassword,
      }),
    });

    if (res.code !== 200 || !res.data?.token) {
      throw new Error(`Payout Login failed: ${res.message || "No token returned"}`);
    }

    this.payoutToken = res.data.token as string;
    // Expire dans 50 minutes (généralement 1 heure d'expiration CinetPay)
    this.payoutTokenExpiry = Date.now() + 50 * 60 * 1000;
    return this.payoutToken;
  }

  /**
   * 1. Initialise un PayIn (Paiement Mobile Money / Carte)
   */
  public async initiatePayment(params: CinetPayPayInParams): Promise<{
    paymentUrl: string;
    paymentToken: string;
    rawResponse: any;
  }> {
    if (this.isMock) {
      console.log(`[MOCK CINETPAY] Initiating PayIn for transaction ${params.transactionId}`);
      const mockToken = `mock_token_${Math.random().toString(36).substring(7)}`;
      return {
        paymentUrl: `https://mock-checkout.cinetpay.com/payment/${mockToken}`,
        paymentToken: mockToken,
        rawResponse: { mock: true, code: "201", message: "CREATED", data: { payment_token: mockToken } },
      };
    }

    return this.breaker.execute(async () => {
      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: params.transactionId,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        customer_name: params.customerName,
        customer_surname: params.customerSurname,
        customer_email: params.customerEmail || "customer@gaexpay.com",
        customer_phone_number: params.customerPhone,
        notify_url: params.notifyUrl,
        return_url: params.returnUrl,
        channels: params.channels || "ALL",
      };

      const res = await this.requestWithRetry(`${this.payInBaseUrl}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.code !== "201" || !res.data?.payment_url) {
        throw new Error(`CinetPay PayIn Initiation failed: ${res.message || "Unknown error"}`);
      }

      return {
        paymentUrl: res.data.payment_url,
        paymentToken: res.data.payment_token || "",
        rawResponse: res,
      };
    });
  }

  /**
   * 2. Vérifie le statut d'un PayIn (Double-Vérification / Pull actif)
   */
  public async checkPayInStatus(transactionId: string): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING";
    rawResponse: any;
  }> {
    if (this.isMock) {
      console.log(`[MOCK CINETPAY] Checking PayIn Status for transaction ${transactionId}`);
      // Simule un succès pour les tests ou le dev si requis
      return {
        status: "SUCCESS",
        rawResponse: { mock: true, code: "00", message: "SUCCES", data: { status: "ACCEPTED" } },
      };
    }

    return this.breaker.execute(async () => {
      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: transactionId,
      };

      const res = await this.requestWithRetry(`${this.payInBaseUrl}/payment/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let status: "SUCCESS" | "FAILED" | "PENDING" = "PENDING";
      const apiStatus = res.data?.status;

      if (apiStatus === "ACCEPTED") {
        status = "SUCCESS";
      } else if (apiStatus === "REFUSED" || apiStatus === "CANCEL" || apiStatus === "EXPIRED") {
        status = "FAILED";
      }

      return {
        status,
        rawResponse: res,
      };
    });
  }

  /**
   * 3. Initialise un PayOut (Transfert sortant)
   */
  public async initiatePayout(params: CinetPayPayOutParams): Promise<{
    status: "PROCESSING" | "SUCCESS" | "FAILED";
    rawResponse: any;
  }> {
    if (this.isMock) {
      console.log(`[MOCK CINETPAY] Initiating Payout for transaction ${params.transactionId}`);
      return {
        status: "SUCCESS",
        rawResponse: { mock: true, code: 200, message: "Payout successful in mock mode" },
      };
    }

    return this.breaker.execute(async () => {
      const token = await this.getPayoutToken();

      const payload = {
        prefix: params.prefix,
        phone: params.phone,
        amount: params.amount,
        client_transaction_id: params.transactionId,
        notify_url: params.notifyUrl,
      };

      const res = await this.requestWithRetry(`${this.payOutBaseUrl}/transfer/payout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // CinetPay Payout Codes: 200 OK or 201 Created usually indicates successful processing
      let status: "PROCESSING" | "SUCCESS" | "FAILED" = "PROCESSING";
      if (res.code === 200 || res.code === 201) {
        status = "SUCCESS"; // Si le transfert est synchrone ou directement exécuté
      } else if (res.code === 202) {
        status = "PROCESSING"; // Traitement asynchrone accepté
      } else {
        status = "FAILED";
      }

      return {
        status,
        rawResponse: res,
      };
    });
  }

  /**
   * 4. Vérifie le statut d'un PayOut (Double-Vérification / Pull actif)
   */
  public async checkPayOutStatus(transactionId: string): Promise<{
    status: "SUCCESS" | "FAILED" | "PROCESSING";
    rawResponse: any;
  }> {
    if (this.isMock) {
      console.log(`[MOCK CINETPAY] Checking Payout Status for transaction ${transactionId}`);
      return {
        status: "SUCCESS",
        rawResponse: { mock: true, code: 200, data: { status: "SUCCESS" } },
      };
    }

    return this.breaker.execute(async () => {
      const token = await this.getPayoutToken();

      const res = await this.requestWithRetry(`${this.payOutBaseUrl}/transfer/payout/${transactionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let status: "SUCCESS" | "FAILED" | "PROCESSING" = "PROCESSING";
      const apiStatus = res.data?.status;

      if (apiStatus === "SUCCESS" || apiStatus === "SUCCES") {
        status = "SUCCESS";
      } else if (apiStatus === "FAILED" || apiStatus === "ECHEC") {
        status = "FAILED";
      }

      return {
        status,
        rawResponse: res,
      };
    });
  }
}
