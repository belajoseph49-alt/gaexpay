import { Router } from 'express';
import { requireInternalAuth } from '../middlewares/auth.middleware';
import { LedgerService } from '../services/LedgerService';
import { z } from 'zod';
import { LedgerTransactionType } from '@prisma/client';

const router = Router();

// Zod schemas pour la validation stricte
const CreditDebitSchema = z.object({
  type: z.nativeEnum(LedgerTransactionType),
  amount: z.union([z.string(), z.number()]),
  currency: z.string().length(3),
  externalRef: z.string(),
  idempotencyKey: z.string(),
  description: z.string().optional(),
  metadata: z.any().optional()
});

router.post('/:userId/credit', requireInternalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const validated = CreditDebitSchema.parse(req.body);
    
    const result = await LedgerService.credit({
      ...validated,
      userId,
      initiatedBy: 'SYSTEM'
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

router.post('/:userId/debit', requireInternalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const validated = CreditDebitSchema.parse(req.body);
    
    const result = await LedgerService.debit({
      ...validated,
      userId,
      initiatedBy: 'SYSTEM'
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ error: 'INSUFFICIENT_FUNDS' });
    }
    next(error);
  }
});

router.post('/:userId/reverse', requireInternalAuth, async (req, res, next) => {
  try {
    const { transactionId, description } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });
    
    const result = await LedgerService.reverse(transactionId, 'ADMIN', description);
    res.status(200).json({ status: 'SUCCESS', transaction: result });
  } catch (error) {
    next(error);
  }
});

router.post('/:userId/freeze', requireInternalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    await LedgerService.freeze(userId, reason, 'ADMIN');
    res.status(200).json({ status: 'FROZEN' });
  } catch (error) {
    next(error);
  }
});

router.post('/:userId/unfreeze', requireInternalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { reason } = req.body;
    
    await LedgerService.unfreeze(userId, reason, 'ADMIN');
    res.status(200).json({ status: 'ACTIVE' });
  } catch (error) {
    next(error);
  }
});

export default router;
