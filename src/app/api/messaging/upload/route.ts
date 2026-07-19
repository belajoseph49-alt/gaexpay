import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_TYPES: Record<string, string> = {
  // Images
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  // Video
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  // Audio / Voice
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/mp4": ".m4a",
  // Documents
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

/**
 * POST /api/messaging/upload
 *
 * Accepts multipart/form-data with a single `file` field.
 * Saves to /public/uploads/chat/<userId>/<timestamp>-<safe-name>
 * Returns: { url, name, size, mimeType }
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return apiError("Invalid multipart form data", 400);
    }

    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided", 400);

    // --- Validation ---
    const mimeType = file.type || "application/octet-stream";
    if (file.size === 0) return apiError("Empty file", 400);
    if (file.size > MAX_SIZE_BYTES) {
      return apiError(`File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)`, 413);
    }

    const ext = ALLOWED_TYPES[mimeType];
    if (!ext) {
      return apiError(`File type not allowed: ${mimeType}`, 415);
    }

    // --- Safe filename ---
    const originalName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ts = Date.now();
    const filename = `${ts}-${originalName}`;

    // --- Save to disk ---
    const userDir = path.join(process.cwd(), "public", "uploads", "chat", userId);
    await mkdir(userDir, { recursive: true });

    const filePath = path.join(userDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Public URL served by Next.js static file server
    const url = `/uploads/chat/${userId}/${filename}`;

    return NextResponse.json({
      url,
      name: originalName,
      size: file.size,
      mimeType,
    });
  } catch (e) {
    console.error("[messaging/upload] error:", e);
    return apiError("Upload failed", 500);
  }
}
