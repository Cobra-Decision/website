import type { Database } from "bun:sqlite";
import { createLocalDatabaseBackup } from "./local";
import { SimpleFtpClient } from "./ftp";
import { logger } from "../logger";

export interface BackupExecutionResult {
  success: boolean;
  localFile: string;
  sizeBytes: number;
  ftpUploaded?: boolean;
  ftpDeleted?: string[];
  error?: string;
}

export async function executeBackup(db: Database): Promise<BackupExecutionResult> {
  try {
    const local = await createLocalDatabaseBackup(db);
    logger.app("BACKUP_CREATED", { data: { path: local.filePath, sizeBytes: local.sizeBytes } });

    const ftpEnabled = process.env.FTP_BACKUP_ENABLED === "true" || !!(process.env.FTP_HOST && process.env.FTP_USER);
    let ftpUploaded = false;
    let ftpDeleted: string[] = [];

    if (ftpEnabled && process.env.FTP_HOST && process.env.FTP_USER) {
      const client = new SimpleFtpClient({
        host: process.env.FTP_HOST,
        port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : 21,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        remoteDir: process.env.FTP_REMOTE_DIR || "/backups",
        retentionCount: process.env.FTP_BACKUP_RETENTION_COUNT ? parseInt(process.env.FTP_BACKUP_RETENTION_COUNT, 10) : 3,
      });

      try {
        const ftpRes = await client.rotateAndUpload(local.filePath, local.fileName);
        ftpUploaded = true;
        ftpDeleted = ftpRes.deleted;
      } catch (ftpErr) {
        logger.app("FTP_BACKUP_ERROR", { error: ftpErr });
      }
    }

    return {
      success: true,
      localFile: local.fileName,
      sizeBytes: local.sizeBytes,
      ftpUploaded,
      ftpDeleted,
    };
  } catch (err) {
    logger.app("BACKUP_ERROR", { error: err });
    return {
      success: false,
      localFile: "",
      sizeBytes: 0,
      error: (err as Error).message,
    };
  }
}

let activeBackupTimer: ReturnType<typeof setTimeout> | null = null;

export function stopDailyBackupScheduler() {
  if (activeBackupTimer) {
    clearTimeout(activeBackupTimer);
    activeBackupTimer = null;
  }
}

export function startDailyBackupScheduler(db: Database) {
  stopDailyBackupScheduler();
  const backupTimeStr = process.env.BACKUP_TIME ?? "03:30";
  const [hourStr, minStr] = backupTimeStr.split(":");
  const targetHour = parseInt(hourStr || "3", 10);
  const targetMin = parseInt(minStr || "30", 10);

  function scheduleNextRun() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(targetHour, targetMin, 0, 0);

    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }

    const delayMs = next.getTime() - now.getTime();

    activeBackupTimer = setTimeout(async () => {
      await executeBackup(db);
      scheduleNextRun();
    }, delayMs);
  }

  scheduleNextRun();
}
