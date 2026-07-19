import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");

export async function GET(req: Request) {
  const auth = await requirePermission(req, "settings.view");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

    // Security: prevent path traversal
    const safePath = path.join(BACKUP_DIR, path.basename(filename));
    const fileBuffer = await readFile(safePath);
    const stats = await stat(safePath);

    const contentType = filename.endsWith(".gz") ? "application/gzip"
      : filename.endsWith(".zip") ? "application/zip"
      : "application/sql";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(stats.size),
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
