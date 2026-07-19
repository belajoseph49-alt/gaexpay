import { LedgerService } from '../src/services/LedgerService';
import { PrismaClient, LedgerTransactionType, WalletStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('LedgerService', () => {
  const userId = 'user_test_1';
  
  beforeEach(async () => {
    // Nettoyer la base de données pour les tests (Attention: à faire uniquement sur une base de test!)
    await prisma.ledgerEntry.deleteMany({});
    await prisma.ledgerTransaction.deleteMany({});
    await prisma.wallet.deleteMany({});
  });

  it('should credit a wallet and respect double-entry principle', async () => {
    const res = await LedgerService.credit({
      userId,
      type: LedgerTransactionType.DEPOSIT,
      amount: '100.50',
      currency: 'XAF',
      externalRef: 'ext_1',
      idempotencyKey: 'idemp_1',
      initiatedBy: 'SYSTEM'
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.newBalance.toString()).toBe('100.5');

    // Verify DB
    const tx = await prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: 'idemp_1' },
      include: { entries: { include: { wallet: true } } }
    });

    expect(tx).toBeDefined();
    expect(tx?.entries.length).toBe(2);

    const userEntry = tx?.entries.find(e => e.wallet.userId === userId);
    const systemEntry = tx?.entries.find(e => e.wallet.userId === 'SYSTEM_WALLET');

    expect(userEntry?.type).toBe('CREDIT');
    expect(userEntry?.amount.toString()).toBe('100.5');
    
    expect(systemEntry?.type).toBe('DEBIT');
    expect(systemEntry?.amount.toString()).toBe('100.5');
  });

  it('should prevent debit if insufficient funds', async () => {
    // Step 1: Credit 50
    await LedgerService.credit({
      userId,
      type: LedgerTransactionType.DEPOSIT,
      amount: '50',
      currency: 'XAF',
      externalRef: 'ext_2',
      idempotencyKey: 'idemp_2',
      initiatedBy: 'SYSTEM'
    });

    // Step 2: Try to withdraw 100
    await expect(LedgerService.debit({
      userId,
      type: LedgerTransactionType.WITHDRAWAL,
      amount: '100',
      currency: 'XAF',
      externalRef: 'ext_3',
      idempotencyKey: 'idemp_3',
      initiatedBy: 'SYSTEM'
    })).rejects.toThrow('INSUFFICIENT_FUNDS');
  });

  it('should enforce idempotency', async () => {
    const payload = {
      userId,
      type: LedgerTransactionType.DEPOSIT,
      amount: '50',
      currency: 'XAF',
      externalRef: 'ext_idem',
      idempotencyKey: 'idemp_idem',
      initiatedBy: 'SYSTEM'
    };

    const res1 = await LedgerService.credit(payload);
    const res2 = await LedgerService.credit(payload);

    expect(res1.status).toBe('SUCCESS');
    expect(res2.status).toBe('ALREADY_PROCESSED');
  });
  
  it('should reject operations on frozen wallet', async () => {
    await LedgerService.credit({
      userId,
      type: LedgerTransactionType.DEPOSIT,
      amount: '500',
      currency: 'XAF',
      externalRef: 'ext_freeze_1',
      idempotencyKey: 'idemp_freeze_1',
      initiatedBy: 'SYSTEM'
    });

    await LedgerService.freeze(userId, 'Suspicious', 'ADMIN');

    await expect(LedgerService.debit({
      userId,
      type: LedgerTransactionType.WITHDRAWAL,
      amount: '100',
      currency: 'XAF',
      externalRef: 'ext_freeze_2',
      idempotencyKey: 'idemp_freeze_2',
      initiatedBy: 'SYSTEM'
    })).rejects.toThrow('Wallet is frozen, cannot debit');
  });
});
