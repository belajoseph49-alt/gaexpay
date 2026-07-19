// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// POST: Check which phone numbers/emails are GaexPay members
// Body: { contacts: [{ name, phone, email }] }
// Returns: { members: [{ name, phone, email, userId, firstName, lastName, avatar }], nonMembers: [{ name, phone }] }
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    const body = await req.json();
    const contacts: Array<{ name: string; phone?: string; email?: string }> = body.contacts || [];

    if (!contacts.length) {
      return NextResponse.json({ members: [], nonMembers: [] });
    }

    // Extract all phone numbers and emails to search
    const phones = contacts
      .map((c) => c.phone)
      .filter(Boolean)
      .map((p) => normalizePhone(p));
    const emails = contacts.map((c) => c.email).filter(Boolean).map((e) => e.toLowerCase());

    // Search for GaexPay users matching these phones or emails
    const users = await db.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { phone: { in: phones } },
              { email: { in: emails } },
            ],
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        username: true,
        kycStatus: true,
        avatar: true,
      },
    });

    // Build a lookup map
    const userByPhone = new Map(users.map((u) => [u.phone, u]));
    const userEmails = new Set(users.map((u) => u.email.toLowerCase()));

    const members: any[] = [];
    const nonMembers: any[] = [];

    for (const contact of contacts) {
      const normalizedPhone = contact.phone ? normalizePhone(contact.phone) : null;
      const matchedUser = normalizedPhone ? userByPhone.get(normalizedPhone) : null;
      const matchedByEmail = contact.email && userEmails.has(contact.email.toLowerCase());

      if (matchedUser || matchedByEmail) {
        const user = matchedUser || users.find((u) => u.email.toLowerCase() === contact.email?.toLowerCase());
        if (user) {
          members.push({
            contactName: contact.name,
            phone: contact.phone,
            email: contact.email,
            gaexpayUser: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              email: user.email,
              phone: user.phone,
              kycStatus: user.kycStatus,
              avatar: user.avatar,
            },
          });
        }
      } else {
        nonMembers.push({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
        });
      }
    }

    return NextResponse.json({
      members,
      nonMembers,
      totalChecked: contacts.length,
      memberCount: members.length,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// GET: Return saved beneficiaries + recent recipients (for display even without phone access)
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);

    const [beneficiaries, recentTx] = await Promise.all([
      db.beneficiary.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      db.transaction.findMany({
        where: { userId, direction: "debit", status: "completed" },
        distinct: ["counterpartyName"],
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          counterpartyName: true,
          counterpartyAccount: true,
          counterpartyBank: true,
          method: true,
          provider: true,
          createdAt: true,
        },
      }),
    ]);

    // Check which beneficiaries are GaexPay members
    const beneficiaryPhones = beneficiaries
      .map((b) => b.account)
      .filter((a) => a?.startsWith("+") || a?.match(/^\d{10,}$/))
      .map((a) => normalizePhone(a));

    const beneficiaryEmails = beneficiaries
      .map((b) => b.email)
      .filter(Boolean)
      .map((e) => e!.toLowerCase());

    const memberUsers = await db.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { phone: { in: beneficiaryPhones } },
              { email: { in: beneficiaryEmails } },
            ],
          },
        ],
      },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, username: true, kycStatus: true },
    });

    const memberPhoneSet = new Set(memberUsers.map((u) => u.phone));
    const memberEmailSet = new Set(memberUsers.map((u) => u.email.toLowerCase()));

    // Mark beneficiaries with GaexPay membership
    const enrichedBeneficiaries = beneficiaries.map((b) => {
      const normalizedPhone = b.account ? normalizePhone(b.account) : null;
      const isMember = (normalizedPhone && memberPhoneSet.has(normalizedPhone)) ||
        (b.email && memberEmailSet.has(b.email.toLowerCase()));
      const memberUser = isMember
        ? memberUsers.find((u) =>
            (normalizedPhone && u.phone === normalizedPhone) ||
            (b.email && u.email.toLowerCase() === b.email.toLowerCase())
          )
        : null;

      return {
        ...b,
        isGaexpayMember: isMember,
        gaexpayUser: memberUser ? {
          id: memberUser.id,
          firstName: memberUser.firstName,
          lastName: memberUser.lastName,
          username: memberUser.username,
          kycStatus: memberUser.kycStatus,
        } : null,
      };
    });

    return NextResponse.json({
      beneficiaries: enrichedBeneficiaries,
      recentRecipients: recentTx.map((t) => ({
        name: t.counterpartyName,
        account: t.counterpartyAccount,
        bank: t.counterpartyBank,
        method: t.method,
        provider: t.provider,
        lastSent: t.createdAt,
      })),
      gaexpayMembers: memberUsers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        phone: u.phone,
        email: u.email,
        kycStatus: u.kycStatus,
      })),
    });
  } catch (e) {
    return apiCatch(e);
  }
}

function normalizePhone(phone: string): string {
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, "");
  // If starts with 00, replace with +
  if (normalized.startsWith("00")) {
    normalized = "+" + normalized.slice(2);
  }
  // If starts with 0 and is 11 digits, assume Nigeria (+234)
  if (normalized.startsWith("0") && normalized.length === 11) {
    normalized = "+234" + normalized.slice(1);
  }
  return normalized;
}
