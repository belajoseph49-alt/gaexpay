/**
 * mini-services/payment-service/src/routes/payment.routes.ts
 *
 * Routes et schémas de validation Zod pour le payment-service.
 * Corrections : z.object() (Zod correct), codes HTTP sémantiques améliorés,
 * route GET /history ajoutée, gestion d'erreur enrichie.
 */

import { Router, Response } from "express";
import { z } from "zod";
import { PaymentService } from "../services/payment.service";
import { requireAuth, requireInternalAuth, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { validateCinetPayWebhook, WebhookRequest } from "../middlewares/webhook.middleware";
import { db } from "../lib/db";

const router = Router();
const paymentService = new PaymentService();

// ---- Schémas de Validation Zod -----------------------------------------------

const PayInSchema = z.object({
  walletId: z.string().min(1),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format invalide. Décimal à max 2 chiffres."),
  currency: z.string().length(3),
  channel: z.enum(["MOBILE_MONEY", "CARD"]),
  customerName: z.string().min(1),
  customerSurname: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(4),
  idempotencyKey: z.string().min(1).max(128),
  notifyUrl: z.string().url(),
  returnUrl: z.string().url(),
});

const PayOutSchema = z.object({
  walletId: z.string().min(1),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Format invalide. Décimal à max 2 chiffres."),
  currency: z.string().length(3),
  phone: z.string().min(4),
  prefix: z.string().min(1).max(5),
  idempotencyKey: z.string().min(1).max(128),
  notifyUrl: z.string().url(),
});

// ---- Helper : mappage d'erreurs vers codes HTTP --------------------------------

function httpStatusFromError(message: string): number {
  if (message.includes("FRAUD_CHECK")) return 429;  // Too Many Requests
  if (message.includes("KYC_REQUIRED")) return 403; // Forbidden
  if (message.includes("CONFLICT")) return 409;      // Conflict
  if (message.includes("LOCKED")) return 202;      // Accepted (processing)
  return 500;
}

// ---- Endpoints -----------------------------------------------------------------

/**
 * 1. Dépôt (PayIn) — Authentifié
 */
router.post(
  "/api/payments/payin/initiate",
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = PayInSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
      }

      const payload = { ...parsed.data, userId: req.userId! };

      const { isNew, response } = await paymentService.acquireIdempotency(
        parsed.data.idempotencyKey,
        payload
      );

      if (!isNew) {
        return res.status(200).json(response);
      }

      try {
        const result = await paymentService.initiatePayIn(payload);
        await paymentService.releaseIdempotency(parsed.data.idempotencyKey, result);
        return res.status(201).json(result);
      } catch (err: any) {
        await paymentService.rollbackIdempotency(parsed.data.idempotencyKey);
        throw err;
      }
    } catch (error: any) {
      console.error("[PAYIN] Error:", error.message);
      return res.status(httpStatusFromError(error.message)).json({ error: error.message });
    }
  }
);

/**
 * 2. Retrait (PayOut) — Authentifié
 */
router.post(
  "/api/payments/payout/initiate",
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = PayOutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
      }

      const payload = {
        ...parsed.data,
        userId: req.userId!,
        // kycTier fourni par le JWT via le middleware, pas par le body client
        kycTier: req.kycTier ?? 0,
      };

      const { isNew, response } = await paymentService.acquireIdempotency(
        parsed.data.idempotencyKey,
        payload
      );

      if (!isNew) {
        return res.status(200).json(response);
      }

      try {
        const result = await paymentService.initiatePayOut(payload);
        await paymentService.releaseIdempotency(parsed.data.idempotencyKey, result);
        return res.status(201).json(result);
      } catch (err: any) {
        await paymentService.rollbackIdempotency(parsed.data.idempotencyKey);
        throw err;
      }
    } catch (error: any) {
      console.error("[PAYOUT] Error:", error.message);
      return res.status(httpStatusFromError(error.message)).json({ error: error.message });
    }
  }
);

/**
 * 3. Webhook CinetPay — Sécurisé (IP whitelist + HMAC signature)
 */
router.post(
  "/api/payments/webhooks/cinetpay",
  validateCinetPayWebhook as any,
  async (req: WebhookRequest, res: Response) => {
    try {
      const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const transactionRef = payload.cpm_trans_id || payload.transaction_id;

      if (!transactionRef) {
        return res.status(400).json({ error: "Missing transaction reference in payload" });
      }

      await paymentService.reconcileOrProcessWebhook(transactionRef, payload, "WEBHOOK");

      if (req.webhookEventId) {
        await db.webhookEvent.update({
          where: { id: req.webhookEventId },
          data: { processed: true },
        });
      }

      return res.status(200).json({ status: "ACK" });
    } catch (error: any) {
      console.error("[WEBHOOK] Processing error:", error.message);
      // Renvoie 500 → CinetPay réessaiera automatiquement
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * 4. Statut d'une transaction — Authentifié (propriétaire uniquement)
 */
router.get(
  "/api/payments/:transactionRef/status",
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionRef } = req.params;

      const transaction = await db.paymentTransaction.findUnique({
        where: { transactionRef },
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (transaction.userId !== req.userId && req.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Not your transaction" });
      }

      return res.status(200).json({
        transactionRef: transaction.transactionRef,
        direction: transaction.direction,
        status: transaction.status,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        createdAt: transaction.createdAt,
        confirmedAt: transaction.confirmedAt,
        failureReason: transaction.failureReason,
      });
    } catch (error: any) {
      console.error("[STATUS] Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * 5. Historique des transactions — Authentifié (paginé)
 */
router.get(
  "/api/payments/history",
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "20", 10)));
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        db.paymentTransaction.findMany({
          where: { userId: req.userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            transactionRef: true,
            direction: true,
            status: true,
            amount: true,
            currency: true,
            channel: true,
            createdAt: true,
            confirmedAt: true,
          },
        }),
        db.paymentTransaction.count({ where: { userId: req.userId } }),
      ]);

      return res.status(200).json({
        data: transactions.map((t: any) => ({ ...t, amount: String(t.amount) })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      console.error("[HISTORY] Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * 6. Réconciliation manuelle — Interne (S2S uniquement)
 */
router.post(
  "/internal/payments/reconcile",
  requireInternalAuth as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const pendingTxs = await db.paymentTransaction.findMany({
        where: {
          status: { in: ["PENDING", "PROCESSING"] },
          updatedAt: { lte: tenMinutesAgo },
        },
      });

      let count = 0;
      for (const tx of pendingTxs) {
        await paymentService.reconcileOrProcessWebhook(tx.transactionRef, null, "RECONCILIATION_JOB");
        count++;
      }

      return res.status(200).json({ message: "Reconciliation completed", processedCount: count });
    } catch (error: any) {
      console.error("[RECONCILE] Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }
);

export default router;
