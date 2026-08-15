import { describe, it, expect, beforeEach } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../src/lib/logger";

const LOG_DIR = "./log";

describe("Event Logger Module", () => {
  it("logs auth events to ./log/auth.log with proper JSON structure", async () => {
    await logger.auth("AUTH_LOGIN_SUCCESS", {
      actor: { userId: "user-123", email: "test@example.com", ip: "127.0.0.1" },
      data: { provider: "password" },
    });

    const logPath = join(LOG_DIR, "auth.log");
    expect(existsSync(logPath)).toBe(true);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    expect(lastEntry.module).toBe("auth");
    expect(lastEntry.event).toBe("AUTH_LOGIN_SUCCESS");
    expect(lastEntry.level).toBe("INFO");
    expect(lastEntry.actor.email).toBe("test@example.com");
    expect(lastEntry.data.provider).toBe("password");
    expect(lastEntry.timestamp).toBeDefined();
  });

  it("logs email events to ./log/email.log", async () => {
    await logger.email("EMAIL_SENT_SUCCESS", {
      actor: { email: "recipient@example.com" },
      data: { messageId: "msg-123", subject: "Welcome" },
    });

    const logPath = join(LOG_DIR, "email.log");
    expect(existsSync(logPath)).toBe(true);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    expect(lastEntry.module).toBe("email");
    expect(lastEntry.event).toBe("EMAIL_SENT_SUCCESS");
    expect(lastEntry.data.messageId).toBe("msg-123");
  });

  it("logs meet events to ./log/meet.log", async () => {
    await logger.meet("MEET_CREATED", {
      actor: { userId: "admin-1", role: "Super Admin" },
      data: { meetId: "meet-xyz", title: "Tech Sync" },
    });

    const logPath = join(LOG_DIR, "meet.log");
    expect(existsSync(logPath)).toBe(true);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    expect(lastEntry.module).toBe("meet");
    expect(lastEntry.event).toBe("MEET_CREATED");
    expect(lastEntry.data.title).toBe("Tech Sync");
  });

  it("logs attendance events to ./log/attendance.log", async () => {
    await logger.attendance("USER_ATTENDED", {
      actor: { userId: "user-456", ip: "1.2.3.4" },
      data: { meetId: "meet-xyz", attendeeCount: 15 },
    });

    const logPath = join(LOG_DIR, "attendance.log");
    expect(existsSync(logPath)).toBe(true);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    expect(lastEntry.module).toBe("attendance");
    expect(lastEntry.event).toBe("USER_ATTENDED");
    expect(lastEntry.data.attendeeCount).toBe(15);
  });

  it("logs file events to ./log/file.log", async () => {
    await logger.file("FILE_UPLOADED", {
      actor: { ip: "127.0.0.1" },
      data: { filename: "doc.pdf", size: 1024, mimeType: "application/pdf" },
    });

    const logPath = join(LOG_DIR, "file.log");
    expect(existsSync(logPath)).toBe(true);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    expect(lastEntry.module).toBe("file");
    expect(lastEntry.event).toBe("FILE_UPLOADED");
    expect(lastEntry.data.filename).toBe("doc.pdf");
  });
});
