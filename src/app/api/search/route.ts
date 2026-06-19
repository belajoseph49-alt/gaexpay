import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ transactions: [], beneficiaries: [], merchants: [], people: [] });
    }

    // Search transactions
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        OR: [
          { description: { contains: q } },
          { counterpartyName: { contains: q } },
          { reference: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, reference: true, description: true, counterpartyName: true, amount: true, currency: true, direction: true, status: true, createdAt: true, type: true },
    });

    // Search beneficiaries
    const beneficiaries = await db.beneficiary.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q } },
          { account: { contains: q } },
          { bank: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, name: true, account: true, bank: true, type: true },
    });

    // Search merchants
    const merchants = await db.merchant.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { category: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, name: true, category: true, rating: true, qrCode: true },
    });

    // Search other users (people) — exclude the authenticated user
    const people = await db.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          },
        ],
      },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, kycStatus: true },
    });

    return NextResponse.json({
      transactions: transactions.map((t) => ({ ...t, type: "transaction" as const })),
      beneficiaries: beneficiaries.map((b) => ({ ...b, type: "beneficiary" as const })),
      merchants: merchants.map((m) => ({ ...m, type: "merchant" as const })),
      people: people.map((p) => ({ ...p, type: "person" as const })),
    });
  } catch (e) {
    return apiCatch(e);
  }
}
