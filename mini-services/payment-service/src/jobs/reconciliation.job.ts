/**
 * mini-services/payment-service/src/jobs/reconciliation.job.ts
 *
 * Job planifié de réconciliation des transactions bloquées.
 * Détecte les transactions PENDING ou PROCESSING qui n'ont pas reçu de webhook,
 * effectue une double vérification (Pull) auprès de CinetPay, et alerte en cas de blocage.
 */

import { db } from "../lib/db";
import { PaymentService } from "../services/payment.service";

const paymentService = new PaymentService();

// Seuil d'ancienneté pour lancer la réconciliation active (ex: 10 minutes)
const RECONCILE_AGE_THRESHOLD_MS = 10 * 60 * 1000;
// Seuil d'alerte pour les transactions coincées (ex: 30 minutes)
const ALERT_AGE_THRESHOLD_MS = 30 * 60 * 1000;

export async function runReconciliationJob(): Promise<void> {
  console.log(`[JOB:RECONCILIATION] Starting reconciliation check at ${new Date().toISOString()}`);

  try {
    const now = new Date();
    const reconcileThresholdDate = new Date(Date.now() - RECONCILE_AGE_THRESHOLD_MS);

    // 0. Expire automatiquement les transactions dont expiresAt est dépassé
    const expiredResult = await db.paymentTransaction.updateMany({
      where: {
        status: { in: ["INITIATED", "PENDING"] },
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    if (expiredResult.count > 0) {
      console.log(`[JOB:RECONCILIATION] Expired ${expiredResult.count} stale transaction(s).`);
    }

    // 1. Récupère les transactions bloquées en PENDING ou PROCESSING depuis plus de 10 min
    const pendingTransactions = await db.paymentTransaction.findMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        updatedAt: { lte: reconcileThresholdDate },
      },
    });

    console.log(`[JOB:RECONCILIATION] Found ${pendingTransactions.length} transactions requiring active reconciliation.`);

    for (const tx of pendingTransactions) {
      console.log(`[JOB:RECONCILIATION] Reconciling transaction Ref: ${tx.transactionRef} (ID: ${tx.id})`);
      
      try {
        await paymentService.reconcileOrProcessWebhook(tx.transactionRef, null, "RECONCILIATION_JOB");
        
        // 2. Alerte de blocage persistant (> 30 min)
        const age = Date.now() - tx.createdAt.getTime();
        if (age > ALERT_AGE_THRESHOLD_MS) {
          console.error(
            `[ALERT] CRITICAL: Transaction ${tx.transactionRef} has been stuck in state ${tx.status} for ${(
              age /
              1000 /
              60
            ).toFixed(1)} minutes! Requires manual support intervention.`
          );
        }
      } catch (txError: any) {
        console.error(`[JOB:RECONCILIATION] Error during reconciliation of ${tx.transactionRef}: ${txError.message}`);
      }
    }

    console.log("[JOB:RECONCILIATION] Reconciliation job completed successfully.");
  } catch (error: any) {
    console.error(`[JOB:RECONCILIATION] Fatal Error in reconciliation job: ${error.message}`);
  }
}

// Lancement automatique du job toutes les 5 minutes si configuré en tâche de fond active
let jobInterval: NodeJS.Timeout | null = null;

export function startReconciliationScheduler(intervalMs = 5 * 60 * 1000): void {
  if (jobInterval) {
    console.warn("[JOB:RECONCILIATION] Scheduler already running.");
    return;
  }

  console.log(`[JOB:RECONCILIATION] Starting scheduler with interval of ${intervalMs / 1000 / 60} minutes.`);
  jobInterval = setInterval(async () => {
    await runReconciliationJob();
  }, intervalMs);
}

export function stopReconciliationScheduler(): void {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log("[JOB:RECONCILIATION] Scheduler stopped.");
  }
}
