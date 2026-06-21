/**
 * GET /api/features
 *
 * Return all ENABLED feature flags that apply to the authenticated user's
 * accountType + role.
 *
 * Visibility rules:
 *  - flag.enabled === true
 *  - flag.accountTypes (JSON array) includes the user's accountType
 *  - flag.roles (JSON array) includes the user's role
 *
 * Returns: { flags: { [key]: { key, name, description, category } } }
 * (a dictionary keyed by flag.key for O(1) lookup in the sidebar)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function parseArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string")
      ? (parsed as string[])
      : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { accountType: true, role: true, status: true },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);

    const accountType = user.accountType ?? "personal";
    const role = user.role ?? "user";

    const allFlags = await db.featureFlag.findMany({
      where: { enabled: true },
      select: {
        key: true,
        name: true,
        description: true,
        category: true,
        accountTypes: true,
        roles: true,
      },
    });

    const flags: Record<
      string,
      { key: string; name: string; description: string | null; category: string }
    > = {};

    for (const f of allFlags) {
      const accountTypes = parseArray(f.accountTypes);
      const roles = parseArray(f.roles);
      // Empty arrays = visible to everyone; non-empty = must match.
      const accountOk =
        accountTypes.length === 0 || accountTypes.includes(accountType);
      const roleOk = roles.length === 0 || roles.includes(role);
      if (accountOk && roleOk) {
        flags[f.key] = {
          key: f.key,
          name: f.name,
          description: f.description,
          category: f.category,
        };
      }
    }

    return NextResponse.json({ flags, accountType, role });
  } catch (e) {
    return apiCatch(e);
  }
}
