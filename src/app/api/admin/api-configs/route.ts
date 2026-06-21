import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch, apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/api-configs
 * List all ApiConfig entries. Optional filters via query:
 *   ?service=payment      — filter by service category
 *   ?enabled=true         — filter enabled only
 *   ?search=stripe        — substring match on name / provider
 *
 * Requires permission: api.view
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "api.view");
    if ("error" in auth) return auth.error;

    const url = new URL(req.url);
    const service = url.searchParams.get("service") || undefined;
    const enabledParam = url.searchParams.get("enabled");
    const search = url.searchParams.get("search")?.trim() || undefined;

    const enabled =
      enabledParam === "true" ? true : enabledParam === "false" ? false : undefined;

    const where: Record<string, unknown> = {};
    if (service) where.service = service;
    if (enabled !== undefined) where.enabled = enabled;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { provider: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const configs = await db.apiConfig.findMany({
      where,
      orderBy: [{ service: "asc" }, { isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        service: true,
        name: true,
        provider: true,
        baseUrl: true,
        webhookUrl: true,
        environment: true,
        enabled: true,
        isDefault: true,
        rateLimitPerMin: true,
        rateLimitPerDay: true,
        description: true,
        category: true,
        icon: true,
        lastUsedAt: true,
        lastErrorAt: true,
        lastError: true,
        totalRequests: true,
        failedRequests: true,
        createdAt: true,
        updatedAt: true,
        // NOTE: credentials deliberately omitted from list responses
      },
    });

    return NextResponse.json({ configs });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * POST /api/admin/api-configs
 * Create a new ApiConfig.
 * Requires permission: api.create
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "api.create");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid JSON body", 400);

    const {
      service,
      name,
      provider,
      baseUrl,
      webhookUrl,
      environment,
      credentials,
      rateLimitPerMin,
      rateLimitPerDay,
      description,
      category,
      icon,
      enabled,
      isDefault,
    } = body;

    if (!service || typeof service !== "string") return apiError("service is required", 400);
    if (!name || typeof name !== "string") return apiError("name is required", 400);

    const validServices = [
      "payment", "blockchain", "kyc", "kyb", "sms", "email",
      "push", "geolocation", "ai", "exchange_rate", "cloud_storage", "auth", "other",
    ];
    if (!validServices.includes(service)) {
      return apiError(`service must be one of: ${validServices.join(", ")}`, 400);
    }

    // Serialize credentials to JSON string
    let credsJson = "{}";
    if (credentials) {
      if (typeof credentials === "string") {
        // Try to parse + re-stringify to validate
        try {
          credsJson = JSON.stringify(JSON.parse(credentials));
        } catch {
          return apiError("credentials must be valid JSON", 400);
        }
      } else if (typeof credentials === "object" && !Array.isArray(credentials)) {
        credsJson = JSON.stringify(credentials);
      } else {
        return apiError("credentials must be a JSON object", 400);
      }
    }

    const env = environment === "production" ? "production" : "sandbox";

    // Enforce only one default per service
    if (isDefault) {
      await db.apiConfig.updateMany({
        where: { service, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await db.apiConfig.create({
      data: {
        service,
        name,
        provider: provider || null,
        baseUrl: baseUrl || null,
        webhookUrl: webhookUrl || null,
        environment: env,
        credentials: credsJson,
        rateLimitPerMin: typeof rateLimitPerMin === "number" ? rateLimitPerMin : null,
        rateLimitPerDay: typeof rateLimitPerDay === "number" ? rateLimitPerDay : null,
        description: description || null,
        category: category || null,
        icon: icon || null,
        enabled: !!enabled,
        isDefault: !!isDefault,
      },
    });

    return NextResponse.json({ config: created }, { status: 201 });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/api-configs
 * Bulk update (e.g. toggle enabled). Body: { id, ...fields } or { ids: [], ...fields }
 * Requires permission: api.edit
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "api.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid JSON body", 400);

    const ids: string[] = Array.isArray(body.ids) && body.ids.length
      ? body.ids
      : body.id
        ? [body.id]
        : [];
    if (!ids.length) return apiError("id or ids is required", 400);

    const { enabled, isDefault } = body;
    const updateData: Record<string, unknown> = {};
    if (typeof enabled === "boolean") updateData.enabled = enabled;
    if (typeof isDefault === "boolean") updateData.isDefault = isDefault;

    if (isDefault) {
      // Get the service of the first config so we can clear other defaults
      const first = await db.apiConfig.findUnique({ where: { id: ids[0] }, select: { service: true } });
      if (first) {
        await db.apiConfig.updateMany({
          where: { service: first.service, isDefault: true, id: { notIn: ids } },
          data: { isDefault: false },
        });
      }
    }

    const result = await db.apiConfig.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({ updated: result.count });
  } catch (e) {
    return apiCatch(e);
  }
}
