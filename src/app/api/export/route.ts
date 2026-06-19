import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/export?format=csv|json&days=N&type=... — export the user's transactions. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const days = Number(searchParams.get("days") || 90);
    const type = searchParams.get("type");

    const where: { userId: string; createdAt?: { gte: Date }; type?: string } = { userId };
    if (days > 0) where.createdAt = { gte: new Date(Date.now() - days * 86400000) };
    if (type && type !== "all") where.type = type;

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      const headers = ["Date", "Reference", "Type", "Direction", "Description", "Counterparty", "Amount", "Fee", "Currency", "Status", "Method"];
      const rows = transactions.map((t) => [
        new Date(t.createdAt).toISOString(),
        t.reference,
        t.type,
        t.direction,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(t.counterpartyName || "").replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        t.fee.toFixed(2),
        t.currency,
        t.status,
        t.method || "",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="gaexpay-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({ transactions });
  } catch (e) {
    return apiCatch(e);
  }
}
