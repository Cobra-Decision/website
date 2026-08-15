export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  error?: string;
  createdAt: Date;
  sentAt?: Date;
  provider: string;
  format?: "html" | "text";
}

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailProvider {
  name: string;
  isAvailable(): boolean;
  send(message: EmailPayload): Promise<boolean>;
}

export interface MailerStats {
  queued: number;
  sent: number;
  failed: number;
  totalProcessed: number;
  activeProvider: string;
  bufferSize: number;
  bufferCapacity: number;
}

export interface BatchFilterOptions {
  mode: "all" | "tags" | "domain" | "selected";
  tagIds?: string[];
  domain?: string;
  userIds?: string[];
}
