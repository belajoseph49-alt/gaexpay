// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db as prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if ("error" in auth) return auth.error;

    // Ensure the user owns a merchant profile
    const merchant = await prisma.merchant.findFirst();

    if (!merchant) {
      return NextResponse.json({ invoices: [] }, { status: 200 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error) {
    console.error("GET Invoices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if ("error" in auth) return auth.error;

    const merchant = await prisma.merchant.findFirst();

    if (!merchant) {
      return NextResponse.json({ error: "Merchant profile not found" }, { status: 404 });
    }

    const data = await request.json();
    const { amount, description, customerName, customerEmail, dueDate } = data;

    if (!amount || !description) {
      return NextResponse.json({ error: "Amount and description are required" }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        amount,
        description,
        customerName,
        customerEmail,
        dueDate: dueDate ? new Date(dueDate) : null,
      }
    });

    return NextResponse.json({ invoice, message: "Invoice created successfully" }, { status: 201 });
  } catch (error) {
    console.error("POST Invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
