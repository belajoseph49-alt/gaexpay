import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { db as prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ["admin", "super_admin", "kyc_manager"]);
    if ("error" in auth) return auth.error;
    const { user: admin } = auth;

    const { id: documentId } = await params;
    const body = await request.json();
    const { status, reviewNote } = body; // status should be 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const document = await prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: { user: true }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Transaction for atomic update of Document and User
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Document
      const updatedDoc = await tx.kycDocument.update({
        where: { id: documentId },
        data: {
          status,
          reviewNote,
          reviewedAt: new Date(),
          reviewedBy: `${admin.id}`, // Mocking name with ID for now
        }
      });

      // 2. Update User Profile
      let kycTier = document.user.kycTier;
      let kycStatus = document.user.kycStatus;

      if (status === "approved") {
        kycStatus = "verified";
        kycTier = Math.max(kycTier, 2); // Upgrade to Tier 2 on approval
      } else {
        kycStatus = "rejected";
      }

      await tx.user.update({
        where: { id: document.userId },
        data: {
          kycStatus,
          kycTier,
          kycVerifiedAt: status === "approved" ? new Date() : null,
          kycRejectionReason: status === "rejected" ? reviewNote : null,
        }
      });

      // 3. Trigger Notification to User
      await tx.notification.create({
        data: {
          userId: document.userId,
          title: status === "approved" ? "KYC Approved" : "KYC Rejected",
          message: status === "approved" 
            ? "Your identity document has been approved! You are now a Tier 2 user." 
            : `Your KYC document was rejected. Reason: ${reviewNote}`,
          type: "security",
        }
      });

      return updatedDoc;
    });

    return NextResponse.json({ message: `Document ${status} successfully`, document: result }, { status: 200 });

  } catch (error) {
    console.error("Admin PATCH KYC error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
