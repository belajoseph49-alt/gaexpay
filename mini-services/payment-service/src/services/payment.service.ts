/**
 * mini-services/payment-service/src/services/payment.service.ts
 *
 * Service principal gérant la logique métier des paiements.
 * - Idempotence stricte (détection de collision et réutilisation illicite).
 * - Machine à états transactionnelle (Prisma $transaction) pour la transition de statuts.
 * - Contrôles de vélocité anti-fraude (limites par heure et jour).
 * - Chiffrement des PII au repos.
 * - Double notification inter-services idempotente vers le wallet-service.
 */

import { db } from "../lib/db";
import { encrypt } from "../lib/crypto";
import { CinetPayClient } from "./cinetpay.client";
import { notifyWalletService } from "../lib/internal-wallet.client";
import { createHash } from "node:crypto";
import Decimal from "decimal.js";

export type PaymentDirection = "PAYIN" | "PAYOUT";
export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REVERSED";

export type PaymentChannel = "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER";

// Définition des transitions d'état valides
const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  INITIATED: ["PENDING", "FAILED", "CANCELLED"],
  PENDING: ["PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "EXPIRED"],
  PROCESSING: ["SUCCESS", "FAILED", "REVERSED"],
  SUCCESS: ["REVERSED"], // Terminal sauf si remboursement
  FAILED: [], // Terminal
  CANCELLED: [], // Terminal
  EXPIRED: [], // Terminal
  REVERSED: [], // Terminal
};

export class PaymentService {
  private cinetpay = new CinetPayClient();

  // Limites anti-fraude configurables
  private maxTxPerHour = 5;
  private maxAmountPerDay = new Decimal("1000000.00"); // ex: 1,000,000 XAF/XOF

  /**
   * Génère le hash SHA256 d'un objet de requête.
   */
  private hashPayload(payload: any): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  /**
   * Vérifie et réserve l'idempotence d'une requête.
   * Retourne la réponse existante si collision valide, ou lance une exception 409 en cas de fraude.
   */
  public async acquireIdempotency(
    key: string,
    payload: any
  ): Promise<{ isNew: boolean; response?: any }> {
    const hash = this.hashPayload(payload);
    
    // Utilise une transaction pour éviter les conditions de concurrence
    return await db.$transaction(async (tx: any) => {
      const record = await tx.idempotencyRecord.findUnique({
        where: { key },
      });

      if (record) {
        if (record.requestHash !== hash) {
          throw new Error("CONFLICT: Idempotency key reused with different payload");
        }
        if (record.responseSnapshot) {
          return { isNew: false, response: JSON.parse(record.responseSnapshot) };
        }
        // Requête déjà en cours de traitement par un autre thread/processus
        throw new Error("LOCKED: A request with this idempotency key is already processing");
      }

      // Création du record temporaire expira dans 24h
      await tx.idempotencyRecord.create({
        data: {
          key,
          requestHash: hash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { isNew: true };
    });
  }

  /**
   * Enregistre le snapshot de la réponse finale pour l'idempotence.
   */
  public async releaseIdempotency(key: string, response: any): Promise<void> {
    await db.idempotencyRecord.update({
      where: { key },
      data: {
        responseSnapshot: JSON.stringify(response),
      },
    });
  }

  /**
   * Supprime un jeton d'idempotence en cas d'erreur bloquante prématurée.
   */
  public async rollbackIdempotency(key: string): Promise<void> {
    await db.idempotencyRecord.deleteMany({
      where: { key },
    });
  }

  /**
   * Contrôles de vélocité (Anti-fraude)
   */
  private async checkVelocityLimits(userId: string, newAmount: Decimal): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Nombre de transactions dans la dernière heure
    const txCount = await db.paymentTransaction.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (txCount >= this.maxTxPerHour) {
      throw new Error(`FRAUD_CHECK: Velocity limit exceeded. Max ${this.maxTxPerHour} transactions per hour.`);
    }

    // 2. Montant cumulé dans les dernières 24 heures
    const dailyTxs = await db.paymentTransaction.findMany({
      where: {
        userId,
        status: { in: ["SUCCESS", "PENDING", "PROCESSING"] },
        createdAt: { gte: oneDayAgo },
      },
      select: { amount: true },
    });

    const aggregateAmount = dailyTxs.reduce(
      (acc: Decimal, tx: { amount: { toString(): string } }) => acc.plus(new Decimal(tx.amount.toString())),
      new Decimal(0)
    );

    if (aggregateAmount.plus(newAmount).greaterThan(this.maxAmountPerDay)) {
      throw new Error(`FRAUD_CHECK: Daily transaction limit of ${this.maxAmountPerDay.toString()} exceeded.`);
    }
  }

  /**
   * Machine à états transactionnelle (Prisma $transaction) pour la transition de statuts.
   */
  public async transitionTransactionStatus(
    id: string,
    toStatus: PaymentStatus,
    actor: string,
    note?: string
  ): Promise<any> {
    return await db.$transaction(async (tx: any) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new Error(`Transaction ${id} not found.`);
      }

      const currentStatus = transaction.status as PaymentStatus;

      // Validation de la transition
      const allowedTargets = VALID_TRANSITIONS[currentStatus];
      if (!allowedTargets.includes(toStatus) && currentStatus !== toStatus) {
        throw new Error(`Forbidden state transition from ${currentStatus} to ${toStatus}`);
      }

      if (currentStatus === toStatus) {
        return transaction; // No-op
      }

      // Mise à jour de la transaction
      const updatedTx = await tx.paymentTransaction.update({
        where: { id },
        data: {
          status: toStatus,
          confirmedAt: toStatus === "SUCCESS" ? new Date() : transaction.confirmedAt,
        },
      });

      // Création du log d'audit
      await tx.paymentAuditLog.create({
        data: {
          transactionId: id,
          previousStatus: currentStatus,
          newStatus: toStatus,
          actor,
          note,
        },
      });

      return updatedTx;
    });
  }

  /**
   * Appelle le wallet-service (via client dédié avec retry) pour créditer/débiter.
   */
  private async triggerWalletUpdate(
    userId: string,
    walletId: string,
    amount: Decimal,
    currency: string,
    transactionRef: string,
    direction: PaymentDirection
  ): Promise<void> {
    await notifyWalletService({
      userId,
      amount: amount.toFixed(2),
      currency,
      externalRef: transactionRef,
      idempotencyKey: transactionRef, // transactionRef est déjà unique et stable
      direction,
    });
  }

  /**
   * PayIn : Initiation de Dépôt
   */
  public async initiatePayIn(params: {
    userId: string;
    walletId: string;
    amount: string;
    currency: string;
    channel: PaymentChannel;
    customerName: string;
    customerSurname: string;
    customerEmail?: string;
    customerPhone: string; // MM Phone number
    idempotencyKey: string;
    notifyUrl: string;
    returnUrl: string;
  }): Promise<any> {
    const amountDec = new Decimal(params.amount);
    
    // 1. Contrôles de vélocité
    await this.checkVelocityLimits(params.userId, amountDec);

    // 2. Génération d'une référence propre (sans caractères spéciaux)
    const transactionRef = `GAEX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;

    // Chiffrement des données de paiement sensibles (numéro de téléphone)
    const encryptedPhone = encrypt(params.customerPhone);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Expire dans 15 min

    // 3. Création de la transaction en statut INITIATED
    const transaction = await db.paymentTransaction.create({
      data: {
        transactionRef,
        direction: "PAYIN",
        status: "INITIATED",
        channel: params.channel,
        amount: amountDec,
        currency: params.currency,
        userId: params.userId,
        walletId: params.walletId,
        idempotencyKey: params.idempotencyKey,
        expiresAt,
        metadata: JSON.stringify({
          customerPhone: encryptedPhone,
          customerName: params.customerName,
          customerSurname: params.customerSurname,
        }),
      },
    });

    await db.paymentAuditLog.create({
      data: {
        transactionId: transaction.id,
        newStatus: "INITIATED",
        actor: "SYSTEM",
        note: "Initialisation de transaction PayIn",
      },
    });

    try {
      // 4. Appel CinetPay pour obtenir le payment_url et le token
      const cinetpayRes = await this.cinetpay.initiatePayment({
        transactionId: transactionRef,
        amount: amountDec.toNumber(),
        currency: params.currency,
        description: `Dépôt GaexPay Ref: ${transactionRef}`,
        customerName: params.customerName,
        customerSurname: params.customerSurname,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        notifyUrl: params.notifyUrl,
        returnUrl: params.returnUrl,
        channels: params.channel === "CARD" ? "CREDIT_CARD" : "MOBILE_MONEY",
      });

      // 5. Passage en statut PENDING et sauvegarde du token
      const updatedTx = await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "PENDING",
          providerPaymentToken: cinetpayRes.paymentToken,
          providerRawResponse: encrypt(JSON.stringify(cinetpayRes.rawResponse)),
        },
      });

      await db.paymentAuditLog.create({
        data: {
          transactionId: transaction.id,
          previousStatus: "INITIATED",
          newStatus: "PENDING",
          actor: "SYSTEM",
          note: "Jeton de paiement généré par CinetPay",
        },
      });

      return {
        transactionRef,
        status: "PENDING",
        paymentUrl: cinetpayRes.paymentUrl,
        expiresAt,
      };
    } catch (error: any) {
      // En cas d'erreur d'appel CinetPay, transition vers FAILED
      await this.transitionTransactionStatus(
        transaction.id,
        "FAILED",
        "SYSTEM",
        `Échec de génération CinetPay: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * PayOut : Initiation de Retrait (Transfert sortant)
   */
  public async initiatePayOut(params: {
    userId: string;
    walletId: string;
    amount: string;
    currency: string;
    phone: string; // Phone number destination
    prefix: string; // ex: 237
    idempotencyKey: string;
    notifyUrl: string;
    kycTier: number; // Fourni par identity-service via JWT ou API
  }): Promise<any> {
    const amountDec = new Decimal(params.amount);

    // 1. Contrôle KYC : payout requis tier >= 1
    if (params.kycTier < 1) {
      throw new Error("KYC_REQUIRED: Payout requires KYC verification (Tier 1 minimum).");
    }

    // 2. Contrôles de vélocité
    await this.checkVelocityLimits(params.userId, amountDec);

    // 3. Création référence transactionnelle unique
    const transactionRef = `GAEX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;

    const encryptedPhone = encrypt(params.phone);

    const transaction = await db.paymentTransaction.create({
      data: {
        transactionRef,
        direction: "PAYOUT",
        status: "INITIATED",
        channel: "MOBILE_MONEY",
        amount: amountDec,
        currency: params.currency,
        userId: params.userId,
        walletId: params.walletId,
        idempotencyKey: params.idempotencyKey,
        metadata: JSON.stringify({
          phone: encryptedPhone,
          prefix: params.prefix,
        }),
      },
    });

    await db.paymentAuditLog.create({
      data: {
        transactionId: transaction.id,
        newStatus: "INITIATED",
        actor: "SYSTEM",
        note: "Initialisation de transaction PayOut",
      },
    });

    try {
      // 4. Appel de transfert CinetPay
      const cinetpayRes = await this.cinetpay.initiatePayout({
        transactionId: transactionRef,
        amount: amountDec.toNumber(),
        currency: params.currency,
        phone: params.phone,
        prefix: params.prefix,
        notifyUrl: params.notifyUrl,
      });

      // 5. Mise à jour statut suivant réponse
      const newStatus = cinetpayRes.status as PaymentStatus;
      const updatedTx = await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          providerRawResponse: encrypt(JSON.stringify(cinetpayRes.rawResponse)),
        },
      });

      await db.paymentAuditLog.create({
        data: {
          transactionId: transaction.id,
          previousStatus: "INITIATED",
          newStatus,
          actor: "SYSTEM",
          note: `Statut initial CinetPay: ${newStatus}`,
        },
      });

      // 6. Si le statut de retour de CinetPay est direct SUCCESS, on notifie immédiatement le wallet
      if (newStatus === "SUCCESS") {
        await this.triggerWalletUpdate(
          transaction.userId,
          transaction.walletId,
          amountDec,
          transaction.currency,
          transactionRef,
          "PAYOUT"
        );
      }

      return {
        transactionRef,
        status: newStatus,
      };
    } catch (error: any) {
      await this.transitionTransactionStatus(
        transaction.id,
        "FAILED",
        "SYSTEM",
        `Échec initiation transfert CinetPay: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Traitement final d'un Webhook ou d'une réconciliation (Reconciliation / Double-Vérification)
   */
  public async reconcileOrProcessWebhook(
    transactionRef: string,
    rawPayload: any,
    actor: "WEBHOOK" | "RECONCILIATION_JOB"
  ): Promise<void> {
    const transaction = await db.paymentTransaction.findUnique({
      where: { transactionRef },
    });

    if (!transaction) {
      console.warn(`Reconciliation: Transaction ref ${transactionRef} not found in database.`);
      return;
    }

    const currentStatus = transaction.status as PaymentStatus;

    if (currentStatus === "SUCCESS" || currentStatus === "FAILED" || currentStatus === "EXPIRED" || currentStatus === "REVERSED") {
      // Déjà dans un état terminal
      return;
    }

    // Effectue une double-vérification active (Pull) auprès de CinetPay
    let verifyRes: { status: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING"; rawResponse: any };
    try {
      if (transaction.direction === "PAYIN") {
        verifyRes = await this.cinetpay.checkPayInStatus(transactionRef);
      } else {
        verifyRes = await this.cinetpay.checkPayOutStatus(transactionRef);
      }
    } catch (err: any) {
      console.error(`Reconciliation: Active verification call failed for ${transactionRef}: ${err.message}`);
      return;
    }

    const nextStatus = verifyRes.status as PaymentStatus;

    if (nextStatus === currentStatus) {
      return; // Pas de changement
    }

    // Met à jour la transaction et notifie le service de wallet si SUCCESS
    await db.$transaction(async (tx: any) => {
      // Verrouillage optimiste de sécurité
      const freshTx = await tx.paymentTransaction.findUnique({
        where: { id: transaction.id },
      });

      if (!freshTx || freshTx.status !== currentStatus) {
        throw new Error("CONCURRENCY_ERROR: Transaction status updated by another execution");
      }

      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: nextStatus,
          confirmedAt: nextStatus === "SUCCESS" ? new Date() : transaction.confirmedAt,
          providerRawResponse: encrypt(JSON.stringify(verifyRes.rawResponse)),
        },
      });

      await tx.paymentAuditLog.create({
        data: {
          transactionId: transaction.id,
          previousStatus: currentStatus,
          newStatus: nextStatus,
          actor,
          note: `Mise à jour via double-vérification. Payload source : ${actor}`,
        },
      });
    });

    // Si transition vers SUCCESS, notification au service wallet
    if (nextStatus === "SUCCESS") {
      const amountDec = new Decimal(transaction.amount.toString());
      await this.triggerWalletUpdate(
        transaction.userId,
        transaction.walletId,
        amountDec,
        transaction.currency,
        transaction.transactionRef,
        transaction.direction as PaymentDirection
      );
    }
  }
}
