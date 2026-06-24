import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Biller catalog metadata. The seed only persists `name` + `category` to keep
 * the schema lean; the rich per-biller UI hints (account label, min/max
 * amounts, fee, ETA, country) are derived from the category + name here so
 * the Bills tab can render a real, validated form without a schema migration.
 */
const CATEGORY_META: Record<
  string,
  { accountLabel: string; min: number; max: number; fee: number; eta: string }
> = {
  electricity: { accountLabel: "Meter Number", min: 100, max: 500000, fee: 100, eta: "Instant" },
  water: { accountLabel: "Account Number", min: 100, max: 200000, fee: 50, eta: "Instant" },
  gas: { accountLabel: "Account Number", min: 100, max: 200000, fee: 50, eta: "Instant" },
  internet: { accountLabel: "Account / User ID", min: 500, max: 200000, fee: 0, eta: "Instant" },
  tv: { accountLabel: "Smart Card / IUC Number", min: 500, max: 200000, fee: 0, eta: "Instant" },
  phone: { accountLabel: "Phone Number", min: 100, max: 100000, fee: 0, eta: "Instant" },
  taxes: { accountLabel: "Taxpayer ID / Reference", min: 100, max: 10000000, fee: 250, eta: "1-2 hrs" },
  customs: { accountLabel: "CNumber / Reference", min: 1000, max: 10000000, fee: 500, eta: "1-2 hrs" },
  fines: { accountLabel: "Fine / Ticket Number", min: 100, max: 500000, fee: 100, eta: "Instant" },
  permits: { accountLabel: "Application / Permit ID", min: 500, max: 1000000, fee: 200, eta: "1-24 hrs" },
  social: { accountLabel: "Social Security Number", min: 500, max: 500000, fee: 0, eta: "Instant" },
  education: { accountLabel: "Student / Reference Number", min: 500, max: 2000000, fee: 100, eta: "Instant" },
  university: { accountLabel: "Student / Matric Number", min: 500, max: 2000000, fee: 100, eta: "Instant" },
  college: { accountLabel: "Student / Reference Number", min: 500, max: 2000000, fee: 100, eta: "Instant" },
  school: { accountLabel: "Student / Reference Number", min: 500, max: 2000000, fee: 100, eta: "Instant" },
  exams: { accountLabel: "Registration / Exam Number", min: 500, max: 500000, fee: 100, eta: "Instant" },
  loan: { accountLabel: "Loan Account Number", min: 100, max: 5000000, fee: 0, eta: "Instant" },
  insurance: { accountLabel: "Policy Number", min: 100, max: 1000000, fee: 0, eta: "Instant" },
  mortgage: { accountLabel: "Mortgage Account Number", min: 100, max: 5000000, fee: 0, eta: "Instant" },
  fuel: { accountLabel: "Card / Account Number", min: 500, max: 200000, fee: 0, eta: "Instant" },
  toll: { accountLabel: "Tag / Reference", min: 100, max: 50000, fee: 0, eta: "Instant" },
  transport: { accountLabel: "Pass / Card Number", min: 100, max: 100000, fee: 0, eta: "Instant" },
  streaming: { accountLabel: "Account / Email", min: 500, max: 100000, fee: 0, eta: "Instant" },
  gaming: { accountLabel: "Account / Gamer Tag", min: 500, max: 100000, fee: 0, eta: "Instant" },
  health: { accountLabel: "Patient / Invoice Number", min: 100, max: 2000000, fee: 0, eta: "Instant" },
  gym: { accountLabel: "Member ID", min: 500, max: 200000, fee: 0, eta: "Instant" },
  betting: { accountLabel: "Account / User ID", min: 100, max: 500000, fee: 0, eta: "Instant" },
  donations: { accountLabel: "Reference (optional)", min: 100, max: 1000000, fee: 0, eta: "Instant" },
  rent: { accountLabel: "Tenant / Reference", min: 1000, max: 5000000, fee: 0, eta: "Instant" },
  government: { accountLabel: "Reference Number", min: 100, max: 10000000, fee: 200, eta: "1-2 hrs" },
  other: { accountLabel: "Reference Number", min: 100, max: 500000, fee: 0, eta: "Instant" },
};

const COUNTRY_BY_NAME: { match: string; country: string; flag: string }[] = [
  { match: "ikeja", country: "Nigeria", flag: "🇳🇬" },
  { match: "eko", country: "Nigeria", flag: "🇳🇬" },
  { match: "abuja", country: "Nigeria", flag: "🇳🇬" },
  { match: "lagos", country: "Nigeria", flag: "🇳🇬" },
  { match: "dstv", country: "Pan-Africa", flag: "🌍" },
  { match: "gotv", country: "Pan-Africa", flag: "🌍" },
  { match: "startimes", country: "Nigeria", flag: "🇳🇬" },
  { match: "jamb", country: "Nigeria", flag: "🇳🇬" },
  { match: "firs", country: "Nigeria", flag: "🇳🇬" },
  { match: "bet9ja", country: "Nigeria", flag: "🇳🇬" },
  { match: "sportybet", country: "Pan-Africa", flag: "🌍" },
  { match: "spectranet", country: "Nigeria", flag: "🇳🇬" },
  { match: "smile", country: "Nigeria", flag: "🇳🇬" },
  { match: "mtn", country: "Pan-Africa", flag: "🌍" },
  { match: "orange", country: "Cameroon", flag: "🇨🇲" },
  { match: "camwater", country: "Cameroon", flag: "🇨🇲" },
  { match: "enéo", country: "Cameroon", flag: "🇨🇲" },
  { match: "eneo", country: "Cameroon", flag: "🇨🇲" },
  { match: "ghana", country: "Ghana", flag: "🇬🇭" },
  { match: "ecg", country: "Ghana", flag: "🇬🇭" },
  { match: "nairobi", country: "Kenya", flag: "🇰🇪" },
  { match: "kplc", country: "Kenya", flag: "🇰🇪" },
];

function inferCountry(name: string): { country: string; flag: string } {
  const lower = name.toLowerCase();
  for (const c of COUNTRY_BY_NAME) {
    if (lower.includes(c.match)) return { country: c.country, flag: c.flag };
  }
  return { country: "Nigeria", flag: "🇳🇬" };
}

/**
 * GET /api/billers — list all active billers, grouped by category.
 *
 * Response shape:
 *   { billers: BillerDTO[], categories: { id, label, count }[] }
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const rows = await db.biller.findMany({
      where: { status: "active" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const billers = rows.map((b) => {
      const meta = CATEGORY_META[b.category] ?? CATEGORY_META.other;
      const { country, flag } = inferCountry(b.name);
      return {
        id: b.id,
        name: b.name,
        category: b.category,
        country,
        flag,
        logo: b.logo,
        accountLabel: meta.accountLabel,
        minAmount: meta.min,
        maxAmount: meta.max,
        fee: meta.fee,
        estimatedTime: meta.eta,
      };
    });

    // Build the category summary the UI grid renders.
    const catMap = new Map<string, number>();
    for (const b of billers) {
      catMap.set(b.category, (catMap.get(b.category) ?? 0) + 1);
    }
    const categories = Array.from(catMap.entries()).map(([id, count]) => ({ id, count }));

    return NextResponse.json({ billers, categories });
  } catch (e) {
    return apiCatch(e);
  }
}
