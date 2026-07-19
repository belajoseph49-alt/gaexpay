import { Router } from 'express';
import { requireUserAuth } from '../middlewares/auth.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/me/balance', requireUserAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.status(200).json({
      balance: wallet.cachedBalance,
      currency: wallet.currency,
      status: wallet.status
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me/transactions', requireUserAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { take = 50, skip = 0 } = req.query;

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      include: {
        transaction: true
      },
      orderBy: { createdAt: 'desc' },
      take: Number(take),
      skip: Number(skip)
    });

    res.status(200).json({ transactions: entries });
  } catch (error) {
    next(error);
  }
});

export default router;
