import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await db.user.findUnique({
      where: { id: DEMO_USER_ID },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        username: true, country: true, city: true, address: true, dob: true,
        gender: true, kycStatus: true, kycTier: true, mfaEnabled: true,
        biometricEnabled: true, twoFactorMethod: true, language: true,
        currency: true, themePreference: true, emailNotif: true, pushNotif: true,
        smsNotif: true, status: true, role: true, referralCode: true,
        referralEarnings: true, referralCount: true, rewardPoints: true,
        lastLoginAt: true, createdAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found. Run seed." }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
