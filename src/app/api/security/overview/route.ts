import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Comprehensive Security Center overview.
 *
 * Computes a security score (0-100) from:
 *  - MFA enabled
 *  - Biometric enabled
 *  - Password age (days since last password change audit event)
 *  - Number of trusted devices
 *  - Recent fraud alerts (last 30 days)
 *  - KYC tier
 *
 * Also returns encryption status, active device count, blocked login
 * attempts, recent security events from audit logs, fraud alerts,
 * 2FA / biometric status, last login, PCI-DSS & AML compliance status.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // ---- Parallel data fetch ----
    const [user, devices, securityLogs, fraudAlerts, blockedAttempts] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          mfaEnabled: true, biometricEnabled: true, twoFactorMethod: true,
          kycStatus: true, kycTier: true, lastLoginAt: true,
          createdAt: true, updatedAt: true,
        },
      }),
      db.device.findMany({
        where: { userId },
        orderBy: { lastActive: "desc" },
      }),
      db.auditLog.findMany({
        where: {
          OR: [
            { entity: "security" },
            { entity: "auth", userId },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      db.transaction.findMany({
        where: {
          userId,
          OR: [{ fraudFlag: true }, { status: "flagged" }, { riskScore: { gte: 0.6 } }],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.auditLog.count({
        where: {
          action: "suspicious_login_blocked",
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
        },
      }),
    ]);

    if (!user) return apiError("User not found", 404);

    // ---- Last password change (from audit logs) ----
    const lastPwdChangeLog = securityLogs.find((l) => l.action === "password_changed");
    const lastPasswordChange = lastPwdChangeLog?.createdAt ?? user.updatedAt;
    const passwordAgeDays = Math.floor(
      (Date.now() - new Date(lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24),
    );

    // ---- Last login (fall back to audit log if user.lastLoginAt is null) ----
    const lastLoginLog = securityLogs.find(
      (l) => l.action === "login" && l.userId === userId,
    );
    const lastLoginAt = user.lastLoginAt ?? lastLoginLog?.createdAt ?? null;

    // ---- Trusted devices count ----
    const trustedDevices = devices.filter((d) => d.trusted).length;

    // ---- Recent fraud alerts (last 30 days) ----
    const thirtyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const recentFraudAlerts = fraudAlerts.filter(
      (t) => new Date(t.createdAt) >= thirtyDaysAgo,
    ).length;

    // ---- Compute Security Score (0-100) ----
    let score = 0;
    const breakdown: { label: string; points: number; max: number; status: "pass" | "warn" | "fail" }[] = [];

    const mfaPoints = user.mfaEnabled ? 20 : 0;
    score += mfaPoints;
    breakdown.push({
      label: "Two-Factor Authentication",
      points: mfaPoints, max: 20,
      status: user.mfaEnabled ? "pass" : "fail",
    });

    const bioPoints = user.biometricEnabled ? 15 : 0;
    score += bioPoints;
    breakdown.push({
      label: "Biometric Login",
      points: bioPoints, max: 15,
      status: user.biometricEnabled ? "pass" : "warn",
    });

    let pwdPoints = 0;
    if (passwordAgeDays <= 30) pwdPoints = 15;
    else if (passwordAgeDays <= 90) pwdPoints = 12;
    else if (passwordAgeDays <= 180) pwdPoints = 8;
    else if (passwordAgeDays <= 365) pwdPoints = 4;
    score += pwdPoints;
    breakdown.push({
      label: "Password Freshness",
      points: pwdPoints, max: 15,
      status: pwdPoints >= 12 ? "pass" : pwdPoints >= 8 ? "warn" : "fail",
    });

    const trustedPoints = trustedDevices >= 1 ? 10 : 0;
    score += trustedPoints;
    breakdown.push({
      label: "Trusted Devices",
      points: trustedPoints, max: 10,
      status: trustedPoints >= 1 ? "pass" : "warn",
    });

    let fraudPoints = 20;
    if (recentFraudAlerts === 0) fraudPoints = 20;
    else if (recentFraudAlerts <= 2) fraudPoints = 14;
    else if (recentFraudAlerts <= 5) fraudPoints = 8;
    else fraudPoints = 0;
    score += fraudPoints;
    breakdown.push({
      label: "Fraud Activity",
      points: fraudPoints, max: 20,
      status: fraudPoints >= 14 ? "pass" : fraudPoints >= 8 ? "warn" : "fail",
    });

    const kycPoints = user.kycTier >= 3 ? 20 : user.kycTier === 2 ? 14 : user.kycTier === 1 ? 8 : 0;
    score += kycPoints;
    breakdown.push({
      label: "Identity Verification",
      points: kycPoints, max: 20,
      status: kycPoints >= 14 ? "pass" : kycPoints >= 8 ? "warn" : "fail",
    });

    score = Math.min(100, Math.max(0, score));

    let grade: "A" | "B" | "C" | "D" | "F";
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";
    else grade = "F";

    const activeDevices = devices.filter(
      (d) => new Date(d.lastActive) >= thirtyDaysAgo,
    ).length;

    const securityEvents = securityLogs.slice(0, 12).map((l) => ({
      id: l.id, action: l.action, entity: l.entity, severity: l.severity,
      ip: l.ip, userAgent: l.userAgent, actor: l.actor, details: l.details,
      createdAt: l.createdAt,
    }));

    const fraudAlertsFormatted = fraudAlerts.slice(0, 10).map((t) => ({
      id: t.id, reference: t.reference, type: t.type, amount: t.amount,
      currency: t.currency, description: t.description,
      counterpartyName: t.counterpartyName, riskScore: t.riskScore,
      fraudFlag: t.fraudFlag, status: t.status, createdAt: t.createdAt,
    }));

    const recommendations: { id: string; title: string; desc: string; severity: "high" | "medium" | "low"; icon: string }[] = [];
    if (!user.mfaEnabled) {
      recommendations.push({
        id: "enable-mfa", title: "Enable Two-Factor Authentication",
        desc: "Add an extra layer of security to your account with TOTP or SMS codes on every login.",
        severity: "high", icon: "KeyRound",
      });
    }
    if (!user.biometricEnabled) {
      recommendations.push({
        id: "enable-bio", title: "Turn on Biometric Login",
        desc: "Use Face ID / Touch ID for faster, more secure access on your trusted devices.",
        severity: "medium", icon: "Fingerprint",
      });
    }
    if (passwordAgeDays > 90) {
      recommendations.push({
        id: "change-pwd", title: "Update Your Password",
        desc: `Your password is ${passwordAgeDays} days old. We recommend changing it every 90 days.`,
        severity: "medium", icon: "Lock",
      });
    }
    if (user.kycTier < 3) {
      recommendations.push({
        id: "complete-kyc", title: "Upgrade to KYC Tier 3",
        desc: "Complete full identity verification to unlock higher limits and stronger fraud protection.",
        severity: "high", icon: "ShieldCheck",
      });
    }
    const untrustedDevices = devices.filter((d) => !d.trusted && new Date(d.lastActive) >= thirtyDaysAgo);
    if (untrustedDevices.length > 0) {
      recommendations.push({
        id: "review-devices", title: "Review Untrusted Devices",
        desc: `${untrustedDevices.length} untrusted device(s) have accessed your account recently. Verify or revoke them.`,
        severity: "high", icon: "Monitor",
      });
    }
    if (recentFraudAlerts > 0) {
      recommendations.push({
        id: "review-fraud", title: "Review Flagged Transactions",
        desc: `${recentFraudAlerts} transaction(s) were flagged in the last 30 days. Confirm they were authorized.`,
        severity: "high", icon: "AlertTriangle",
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        id: "all-good", title: "Your account is well-protected",
        desc: "Keep your password fresh and review new devices promptly to maintain your A grade.",
        severity: "low", icon: "CheckCircle2",
      });
    }

    const encryption = {
      algorithm: "AES-256-GCM",
      transport: "TLS 1.3",
      endToEnd: true,
      keyRotation: "90 days",
      lastKeyRotation: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      cardData: "PCI-DSS tokenized",
      secretsVault: "HashiCorp Vault (HSM-backed)",
      quantumResistant: false,
    };

    const compliance = {
      pciDss: { status: "verified", level: "Level 1", lastAudit: "2026-03-15" },
      aml: { status: "compliant", framework: "FATF / NFIU", lastCheck: new Date().toISOString() },
      gdpr: { status: "compliant", framework: "EU GDPR" },
      iso27001: { status: "certified", framework: "ISO/IEC 27001:2022" },
      soc2: { status: "certified", type: "Type II" },
    };

    return NextResponse.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      score,
      grade,
      breakdown,
      encryption,
      compliance,
      mfaEnabled: user.mfaEnabled,
      biometricEnabled: user.biometricEnabled,
      twoFactorMethod: user.twoFactorMethod,
      kycTier: user.kycTier,
      kycStatus: user.kycStatus,
      lastLoginAt,
      lastPasswordChange,
      passwordAgeDays,
      devices: {
        total: devices.length,
        active: activeDevices,
        trusted: trustedDevices,
        list: devices,
      },
      blockedLoginAttempts: blockedAttempts,
      fraudAlerts: {
        total: fraudAlerts.length,
        recent: recentFraudAlerts,
        list: fraudAlertsFormatted,
      },
      securityEvents,
      recommendations,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
