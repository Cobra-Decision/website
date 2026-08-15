import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export type LogModule = "auth" | "email" | "meet" | "attendance" | "file" | "app";
export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogActor {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface LogEventOptions {
  module: LogModule;
  event: string;
  level?: LogLevel;
  actor?: LogActor;
  data?: Record<string, any>;
  error?: Error | string | unknown;
}

const LOG_DIR = process.env.LOG_DIR ?? "./log";
let dirEnsured = false;

async function ensureLogDir() {
  if (dirEnsured) return;
  try {
    await mkdir(LOG_DIR, { recursive: true });
    dirEnsured = true;
  } catch (err) {
    console.error("Failed to initialize log directory:", err);
  }
}

export async function logEvent(opts: LogEventOptions): Promise<void> {
  const { module, event, level = "INFO", actor, data, error } = opts;
  const timestamp = new Date().toISOString();

  let errorDetails: { message: string; stack?: string } | undefined;
  if (error) {
    if (error instanceof Error) {
      errorDetails = { message: error.message, stack: error.stack };
    } else {
      errorDetails = { message: String(error) };
    }
  }

  const record = {
    timestamp,
    level,
    module,
    event,
    ...(actor ? { actor } : {}),
    ...(data ? { data } : {}),
    ...(errorDetails ? { error: errorDetails } : {}),
  };

  const line = JSON.stringify(record) + "\n";
  const logFile = join(LOG_DIR, `${module}.log`);

  try {
    await ensureLogDir();
    await appendFile(logFile, line, "utf8");
  } catch (err) {
    // Non-blocking fallback so logging never breaks business logic
    console.error(`[LOGGER ERROR] Failed to write to ${logFile}:`, err, line.trim());
  }
}

export const logger = {
  auth: (event: string, opts?: Omit<LogEventOptions, "module" | "event">) =>
    logEvent({ module: "auth", event, ...opts }),
  email: (event: string, opts?: Omit<LogEventOptions, "module" | "event">) =>
    logEvent({ module: "email", event, ...opts }),
  meet: (event: string, opts?: Omit<LogEventOptions, "module" | "event">) =>
    logEvent({ module: "meet", event, ...opts }),
  attendance: (event: string, opts?: Omit<LogEventOptions, "module" | "event">) =>
    logEvent({ module: "attendance", event, ...opts }),
  file: (event: string, opts?: Omit<LogEventOptions, "module" | "event">) =>
    logEvent({ module: "file", event, ...opts }),
  app: (event: string, opts?: Omit<LogEventOptions, "module" | "event">) =>
    logEvent({ module: "app", event, ...opts }),
};
