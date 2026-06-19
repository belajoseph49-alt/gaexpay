import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q || q.length < 2) {
    return NextResponse.json({ transactions: [], beneficiaries: [], merchants: [], people: [] });
  }

  const query = q.toLowerCase();

  // Search transactions
  const transactions = await db.transaction.findMany({
    where: {
      userId: DEMO_USER_ID,
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
      userId: DEMO_USER_ID,
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

  // Search other users (people) - simulate by searching in all users except demo
  const people = await db.user.findMany({
    where: {
      AND: [
        { id: { not: DEMO_USER_ID } },
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
    transactions: transactions.map((t) => ({
      ...t,
      type: "transaction" as const,
    })),
    beneficiaries: beneficiaries.map((b) => ({
      ...b,
      type: "beneficiary" as const,
    })),
    merchants: merchants.map((m) => ({
      ...m,
      type: "merchant" as const,
    })),
    people: people.map((p) => ({
      ...p,
      type: "person" as const,
    })),
  });
}
