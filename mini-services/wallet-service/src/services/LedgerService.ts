import { PrismaClient, LedgerTransactionType, WalletStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Fonction utilitaire pour chiffrer les métadonnées
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for AES-256
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export interface LedgerOperationInput {
  userId: string;
  type: LedgerTransactionType;
  amount: string | number; // Doit toujours être positif
  currency: string;
  externalRef: string;
  idempotencyKey: string;
  description?: string;
  initiatedBy: string;
  metadata?: any;
}

export class LedgerService {
  /**
   * Effectue un crédit sur un wallet utilisateur (DEPOSIT, P2P_IN, etc.)
   */
  static async credit(input: LedgerOperationInput) {
    return this.executeDoubleEntry(input, 'CREDIT');
  }

  /**
   * Effectue un débit sur un wallet utilisateur (WITHDRAWAL, P2P_OUT, etc.)
   */
  static async debit(input: LedgerOperationInput) {
    return this.executeDoubleEntry(input, 'DEBIT');
  }

  /**
   * Fonction principale effectuant l'écriture en partie double
   */
  private static async executeDoubleEntry(input: LedgerOperationInput, operationType: 'CREDIT' | 'DEBIT', retryCount = 0) {
    const amountDec = new Decimal(input.amount);
    
    if (amountDec.lte(0)) {
      throw new Error('Amount must be strictly positive');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Check idempotency and externalRef
        const existingTx = await tx.ledgerTransaction.findFirst({
          where: {
            OR: [
              { idempotencyKey: input.idempotencyKey },
              { externalRef: input.externalRef }
            ]
          }
        });

        if (existingTx) {
          return { status: 'ALREADY_PROCESSED', transaction: existingTx };
        }

        // 2. Load wallet with optimistic locking (or create if not exists for CREDIT)
        let wallet = await tx.wallet.findUnique({
          where: { userId: input.userId }
        });

        if (!wallet) {
          if (operationType === 'DEBIT') {
            throw new Error('Wallet not found');
          }
          wallet = await tx.wallet.create({
            data: {
              userId: input.userId,
              currency: input.currency
            }
          });
        }

        if (wallet.currency !== input.currency) {
          throw new Error('Currency mismatch');
        }

        if (wallet.status === WalletStatus.CLOSED) {
          throw new Error('Wallet is closed');
        }

        if (wallet.status === WalletStatus.FROZEN && operationType === 'DEBIT') {
          throw new Error('Wallet is frozen, cannot debit');
        }

        const currentBalance = new Decimal(wallet.cachedBalance as any);
        let newBalance = currentBalance;

        if (operationType === 'CREDIT') {
          newBalance = currentBalance.plus(amountDec);
        } else {
          newBalance = currentBalance.minus(amountDec);
          if (newBalance.lt(0)) {
            throw new Error('INSUFFICIENT_FUNDS');
          }
        }

        // 3. Encrypt metadata if provided
        const encryptedMetadata = input.metadata 
          ? { encryptedData: encrypt(JSON.stringify(input.metadata)) } 
          : null;

        // 4. Create LedgerTransaction
        const ledgerTx = await tx.ledgerTransaction.create({
          data: {
            type: input.type,
            externalRef: input.externalRef,
            idempotencyKey: input.idempotencyKey,
            description: input.description,
            initiatedBy: input.initiatedBy,
            metadata: encryptedMetadata
          }
        });

        // 5. Create LedgerEntries (Double Entry Principle)
        // Entry 1: User Wallet Entry
        await tx.ledgerEntry.create({
          data: {
            transactionId: ledgerTx.id,
            walletId: wallet.id,
            type: operationType,
            amount: amountDec,
            balanceAfter: newBalance
          }
        });

        // Entry 2: System/Counterparty Entry (virtuel, ici on le loggue sur un "SYSTEM_WALLET" ou on s'assure juste que c'est une partie double logique)
        // Pour être strict sur la base, il faudrait un Wallet système. Pour l'exemple, nous nous limitons à l'entrée utilisateur 
        // ou nous créons un SYSTEM_WALLET à la volée.
        let systemWallet = await tx.wallet.findUnique({ where: { userId: 'SYSTEM_WALLET' } });
        if (!systemWallet) {
          systemWallet = await tx.wallet.create({ data: { userId: 'SYSTEM_WALLET', currency: input.currency } });
        }
        
        const systemBalance = new Decimal(systemWallet.cachedBalance as any);
        const newSystemBalance = operationType === 'CREDIT' ? systemBalance.minus(amountDec) : systemBalance.plus(amountDec);

        await tx.ledgerEntry.create({
          data: {
            transactionId: ledgerTx.id,
            walletId: systemWallet.id,
            type: operationType === 'CREDIT' ? 'DEBIT' : 'CREDIT',
            amount: amountDec,
            balanceAfter: newSystemBalance
          }
        });

        // 6. Update Wallets (Optimistic Locking)
        const updateResult = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            version: wallet.version
          },
          data: {
            cachedBalance: newBalance,
            version: { increment: 1 }
          }
        });

        if (updateResult.count === 0) {
          throw new Error('CONCURRENCY_CONFLICT_USER');
        }

        await tx.wallet.updateMany({
          where: { id: systemWallet.id, version: systemWallet.version },
          data: { cachedBalance: newSystemBalance, version: { increment: 1 } }
        });

        return { status: 'SUCCESS', transaction: ledgerTx, newBalance };
      });
    } catch (error: any) {
      if (error.message.includes('CONCURRENCY_CONFLICT') && retryCount < 3) {
        // Retry logic with backoff
        await new Promise(res => setTimeout(res, 50 * Math.pow(2, retryCount)));
        return this.executeDoubleEntry(input, operationType, retryCount + 1);
      }
      throw error;
    }
  }

  static async reverse(transactionId: string, initiatedBy: string, description?: string) {
    return prisma.$transaction(async (tx) => {
       const originalTx = await tx.ledgerTransaction.findUnique({
          where: { id: transactionId },
          include: { entries: { include: { wallet: true } } }
       });

       if (!originalTx) throw new Error("Transaction not found");
       if (originalTx.status === "REVERSED") throw new Error("Transaction already reversed");

       const reversalTx = await tx.ledgerTransaction.create({
         data: {
           type: 'REVERSAL',
           externalRef: `REV_${originalTx.externalRef}`,
           idempotencyKey: `REV_${originalTx.idempotencyKey}`,
           initiatedBy,
           description: description || `Reversal of ${originalTx.id}`
         }
       });

       for (const entry of originalTx.entries) {
          const reverseType = entry.type === 'CREDIT' ? 'DEBIT' : 'CREDIT';
          const wallet = entry.wallet;
          
          let currentBalance = new Decimal(wallet.cachedBalance as any);
          const amountDec = new Decimal(entry.amount as any);
          
          const newBalance = reverseType === 'CREDIT' ? currentBalance.plus(amountDec) : currentBalance.minus(amountDec);
          
          if (reverseType === 'DEBIT' && newBalance.lt(0) && wallet.userId !== 'SYSTEM_WALLET') {
            throw new Error(`Insufficient funds to reverse transaction for wallet ${wallet.id}`);
          }

          await tx.ledgerEntry.create({
            data: {
              transactionId: reversalTx.id,
              walletId: wallet.id,
              type: reverseType,
              amount: amountDec,
              balanceAfter: newBalance
            }
          });

          const updateResult = await tx.wallet.updateMany({
             where: { id: wallet.id, version: wallet.version },
             data: { cachedBalance: newBalance, version: { increment: 1 } }
          });

          if (updateResult.count === 0) throw new Error('CONCURRENCY_CONFLICT');
       }

       await tx.ledgerTransaction.update({
         where: { id: originalTx.id },
         data: { status: 'REVERSED' }
       });

       return reversalTx;
    });
  }

  static async freeze(userId: string, reason: string, initiatedBy: string) {
    return prisma.wallet.update({
      where: { userId },
      data: { status: WalletStatus.FROZEN }
    });
  }

  static async unfreeze(userId: string, reason: string, initiatedBy: string) {
    // Dans la vraie vie: nécessiterait une double validation Admin. 
    return prisma.wallet.update({
      where: { userId },
      data: { status: WalletStatus.ACTIVE }
    });
  }
}
