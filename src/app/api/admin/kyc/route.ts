import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { db as prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["admin", "super_admin", "kyc_manager"]);
    if ("error" in auth) return auth.error;

    // Parse filters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const kycDocuments = await prisma.kycDocument.findMany({
      where: { status },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, kycTier: true, kycStatus: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ documents: kycDocuments }, { status: 200 });

  } catch (error) {
    console.error("Admin GET KYC error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
