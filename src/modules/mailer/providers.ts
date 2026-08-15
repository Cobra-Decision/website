import type { EmailPayload, EmailProvider } from "./types";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class FallbackProvider implements EmailProvider {
  name = "fallback-console-file";
  private logPath: string;

  constructor(logPath?: string) {
    const jobTmp = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : "./tmp";
    this.logPath = logPath ?? `${jobTmp}/emails.log`;
  }

  isAvailable(): boolean {
    return true;
  }

  async send(message: EmailPayload): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const content = message.text ?? message.html ?? "";
    const logEntry = `[${timestamp}] [MAIL-FALLBACK] To: ${message.to} | Subject: ${message.subject}\n${content}\n---\n`;

    console.log(`📨 [Email Sent] To: ${message.to} | Subject: ${message.subject}`);

    try {
      mkdirSync(dirname(this.logPath), { recursive: true });
      appendFileSync(this.logPath, logEntry, "utf8");
    } catch {
      // Ignore file system permission issues in restricted envs
    }
    return true;
  }
}

export class SmtpProvider implements EmailProvider {
  name = "smtp";
  private host: string;
  private port: number;
  private user: string;
  private pass: string;
  private from: string;

  constructor(options?: { host?: string; port?: number; user?: string; pass?: string; from?: string }) {
    this.user = options?.user ?? process.env.GMAIL_USER ?? process.env.SMTP_USER ?? "";
    this.pass = options?.pass ?? process.env.GMAIL_APP_PASSWORD ?? process.env.SMTP_PASS ?? "";
    this.host = options?.host ?? process.env.SMTP_HOST ?? "smtp.gmail.com";
    this.port = options?.port ?? Number(process.env.SMTP_PORT ?? "465");
    this.from = options?.from ?? process.env.SMTP_FROM ?? this.user;
  }

  isAvailable(): boolean {
    return Boolean(this.user && this.pass && this.host);
  }

  async send(message: EmailPayload): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error("SMTP credentials not configured");
    }

    return new Promise<boolean>((resolve, reject) => {
      let socket: any;

      const cleanup = () => {
        if (socket) {
          try {
            socket.end();
          } catch {}
        }
      };

      const sendCommand = (cmd: string) => {
        socket.write(cmd + "\r\n");
      };

      try {
        const tls = require("node:tls");
        socket = tls.connect({ host: this.host, port: this.port, rejectUnauthorized: false }, () => {});

        let step = 0;

        socket.on("data", (data: Buffer) => {
          const response = data.toString("utf8");
          const code = parseInt(response.slice(0, 3), 10);

          if (code >= 400) {
            cleanup();
            return reject(new Error(`SMTP Error (${code}): ${response.trim()}`));
          }

          if (step === 0 && code === 220) {
            step = 1;
            sendCommand("EHLO localhost");
          } else if (step === 1 && code === 250) {
            step = 2;
            sendCommand("AUTH LOGIN");
          } else if (step === 2 && code === 334) {
            step = 3;
            sendCommand(Buffer.from(this.user).toString("base64"));
          } else if (step === 3 && code === 334) {
            step = 4;
            sendCommand(Buffer.from(this.pass).toString("base64"));
          } else if (step === 4 && code === 235) {
            step = 5;
            sendCommand(`MAIL FROM:<${this.from || this.user}>`);
          } else if (step === 5 && code === 250) {
            step = 6;
            sendCommand(`RCPT TO:<${message.to}>`);
          } else if (step === 6 && code === 250) {
            step = 7;
            sendCommand("DATA");
          } else if (step === 7 && code === 354) {
            step = 8;
            const isHtml = Boolean(message.html);
            const contentType = isHtml ? "text/html" : "text/plain";
            const body = message.html ?? message.text ?? "";

            const headers = [
              `From: ${this.from || this.user}`,
              `To: ${message.to}`,
              `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString("base64")}?=`,
              "MIME-Version: 1.0",
              `Content-Type: ${contentType}; charset=UTF-8`,
              "Content-Transfer-Encoding: 8bit",
              `Date: ${new Date().toUTCString()}`,
              "",
              body,
              ".",
            ].join("\r\n");
            sendCommand(headers);
          } else if (step === 8 && code === 250) {
            step = 9;
            sendCommand("QUIT");
            cleanup();
            resolve(true);
          }
        });

        socket.on("error", (err: Error) => {
          cleanup();
          reject(err);
        });

        socket.setTimeout(8000, () => {
          cleanup();
          reject(new Error("SMTP timeout"));
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }
}
