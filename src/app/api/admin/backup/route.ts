import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import { readFile, readdir, writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";

export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");

// Ensure backup directory exists
async function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true });
  }
}

// Format date for filename
function formatDate(d: Date): string {
  return d.toISOString().replace(/[:.]/g, "-").substring(0, 19);
}

// GET — list all backups
export async function GET(req: Request) {
  const auth = await requirePermission(req, "settings.view");
  if ("error" in auth) return auth.error;

  try {
    await ensureBackupDir();
    const files = await readdir(BACKUP_DIR);
    const backups: any[] = [];

    for (const file of files) {
      if (!file.endsWith(".sql") && !file.endsWith(".gz") && !file.endsWith(".zip")) continue;
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await stat(filePath);
      backups.push({
        filename: file,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        createdAt: stats.mtime.toISOString(),
        type: file.endsWith(".gz") ? "gzip" : file.endsWith(".zip") ? "zip" : "sql",
      });
    }

    // Sort by date desc
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Also return auto-backup settings
    const autoBackupEnabled = await db.systemSetting.findUnique({ where: { key: "auto_backup_enabled" } });
    const autoBackupFreq = await db.systemSetting.findUnique({ where: { key: "auto_backup_frequency" } });
    const maxBackups = await db.systemSetting.findUnique({ where: { key: "auto_backup_max" } });

    return NextResponse.json({
      backups,
      settings: {
        autoBackup: autoBackupEnabled?.value === "true",
        frequency: autoBackupFreq?.value || "daily",
        maxBackups: Number(maxBackups?.value || 30),
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// POST — create a new backup
export async function POST(req: Request) {
  const auth = await requirePermission(req, "settings.edit");
  if ("error" in auth) return auth.error;

  try {
    await ensureBackupDir();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "sql"; // sql | gzip | zip
    const label = searchParams.get("label") || "manual";

    const timestamp = formatDate(new Date());
    const filename = `gaexpay-${label}-${timestamp}.${format === "gzip" ? "sql.gz" : format === "zip" ? "sql.zip" : "sql"}`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Get all table data from Prisma
    const tables = [
      "user", "wallet", "transaction", "card", "beneficiary",
      "notification", "supportTicket", "supportMessage", "auditLog",
      "device", "exchangeRate", "merchant", "biller", "adminMetric",
      "kycDocument", "businessProfile", "apiConfig", "apiLog",
      "featureFlag", "feeConfig", "systemSetting", "stake", "stakingPool",
      "liveStream", "product", "order", "socialPost", "socialLike",
      "socialComment", "connection", "conversation", "message",
      "userAchievement", "achievement", "developerApp", "developerApiKey",
      "webhook", "savingsGoal", "savingsContribution", "budget",
      "scheduledTransfer",
    ];

    let sqlContent = `-- GaexPay Database Backup\n-- Created: ${new Date().toISOString()}\n-- Format: SQL\n\n`;
    sqlContent += `PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n`;

    for (const table of tables) {
      try {
        // @ts-ignore - dynamic model access
        const records = await db[table]?.findMany?.();
        if (records && records.length > 0) {
          sqlContent += `-- Table: ${table} (${records.length} rows)\n`;
          sqlContent += `DELETE FROM "${table}";\n`;
          for (const record of records) {
            const columns = Object.keys(record).map(k => `"${k}"`).join(", ");
            const values = Object.values(record).map(v => {
              if (v === null) return "NULL";
              if (v === true) return "1";
              if (v === false) return "0";
              if (v instanceof Date) return `'${v.toISOString()}'`;
              if (typeof v === "number") return String(v);
              if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            }).join(", ");
            sqlContent += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
          }
          sqlContent += "\n";
        }
      } catch {
        // Table might not exist, skip
      }
    }

    sqlContent += `COMMIT;\nPRAGMA foreign_keys=ON;\n`;
    sqlContent += `\n-- End of backup\n`;

    if (format === "gzip") {
      // Write SQL then gzip it
      const sqlPath = filePath.replace(".gz", "");
      await writeFile(sqlPath, sqlContent);
      await pipeline(
        createReadStream(sqlPath),
        createGzip(),
        createWriteStream(filePath),
      );
      await unlink(sqlPath);
    } else {
      await writeFile(filePath, sqlContent);
    }

    const stats = await stat(filePath);

    // Audit log
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "backup.create",
        entity: "Database",
        entityId: filename,
        severity: "info",
        details: JSON.stringify({ filename, size: stats.size, format }),
      },
    });

    return NextResponse.json({
      success: true,
      filename,
      size: stats.size,
      sizeFormatted: formatSize(stats.size),
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — update backup settings
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "settings.edit");
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { autoBackup, frequency, maxBackups } = body;

    if (typeof autoBackup === "boolean") {
      await db.systemSetting.upsert({
        where: { key: "auto_backup_enabled" },
        update: { value: String(autoBackup) },
        create: { key: "auto_backup_enabled", value: String(autoBackup), category: "system" },
      });
    }
    if (typeof frequency === "string") {
      await db.systemSetting.upsert({
        where: { key: "auto_backup_frequency" },
        update: { value: frequency },
        create: { key: "auto_backup_frequency", value: frequency, category: "system" },
      });
    }
    if (typeof maxBackups === "number") {
      await db.systemSetting.upsert({
        where: { key: "auto_backup_max" },
        update: { value: String(maxBackups) },
        create: { key: "auto_backup_max", value: String(maxBackups), category: "system" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}

// DELETE — delete a backup file
export async function DELETE(req: Request) {
  const auth = await requirePermission(req, "settings.edit");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

    // Security: only allow files in the backup directory
    const safePath = path.join(BACKUP_DIR, path.basename(filename));
    if (!existsSync(safePath)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    await unlink(safePath);

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "backup.delete",
        entity: "Database",
        entityId: filename,
        severity: "warning",
        details: JSON.stringify({ filename }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
