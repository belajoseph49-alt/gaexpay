import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/**
 * POST /api/messaging/upload
 * Body: FormData with `file` field (multipart/form-data).
 *
 * Saves the uploaded file to /public/uploads and returns { url, name, size,
 * mimeType }. Used by GaexChat for voice messages, photos, videos, documents.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return apiError("No file provided", 400);
    if (file.size > MAX_SIZE) return apiError("File too large (max 15MB)", 400);
    if (!ALLOWED.has(file.type)) return apiError(`File type ${file.type} not allowed`, 400);

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return NextResponse.json({
      url: `/uploads/${filename}`,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
