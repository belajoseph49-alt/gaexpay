import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

export async function runConsistencyCheck() {
  console.log('[CONSISTENCY JOB] Starting ledger consistency check...');
  
  try {
    const wallets = await prisma.wallet.findMany();

    for (const wallet of wallets) {
      const entries = await prisma.ledgerEntry.findMany({
        where: { walletId: wallet.id }
      });

      let calculatedBalance = new Decimal(0);

      for (const entry of entries) {
        if (entry.type === 'CREDIT') {
          calculatedBalance = calculatedBalance.plus(new Decimal(entry.amount as any));
        } else if (entry.type === 'DEBIT') {
          calculatedBalance = calculatedBalance.minus(new Decimal(entry.amount as any));
        }
      }

      const cached = new Decimal(wallet.cachedBalance as any);
      
      if (!calculatedBalance.equals(cached)) {
        console.error(`[CRITICAL ALERT] Wallet ${wallet.id} (User: ${wallet.userId}) inconsistency!`);
        console.error(`Expected (Sum of entries): ${calculatedBalance.toString()}, but got cachedBalance: ${cached.toString()}`);
        
        // Ici, on pourrait envoyer une alerte Sentry / Slack.
        // NE PAS CORRIGER AUTOMATIQUEMENT, cela nécessite une investigation manuelle.
      }
    }
    
    console.log('[CONSISTENCY JOB] Check completed.');
  } catch (error) {
    console.error('[CONSISTENCY JOB] Error during execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Pour exécuter manuellement
if (require.main === module) {
  runConsistencyCheck();
}
