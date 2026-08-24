import { timingSafeEqual } from "node:crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ValidatedInitData {
  user: TelegramUser;
  authDate: number;
  queryId?: string;
  raw: Record<string, string>;
}

/**
 * Validates Telegram Mini App initData query string according to Telegram specification:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400 // 24 hours
): Promise<ValidatedInitData | null> {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");

    // 1. Build sorted data-check-string (key=value joined by \n)
    const entries: string[] = [];
    const raw: Record<string, string> = {};
    for (const [key, value] of Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      entries.push(`${key}=${value}`);
      raw[key] = value;
    }
    const dataCheckString = entries.join("\n");

    // 2. Secret key = HMAC_SHA256("WebAppData", botToken)
    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));

    // 3. Calculated hash = HMAC_SHA256(secretKey, dataCheckString)
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const calculatedHashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(dataCheckString));
    const calculatedHashHex = Array.from(new Uint8Array(calculatedHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 4. Timing-safe comparison
    const hashBuffer = Buffer.from(hash, "hex");
    const checkBuffer = Buffer.from(calculatedHashHex, "hex");
    if (hashBuffer.length !== checkBuffer.length || !timingSafeEqual(hashBuffer, checkBuffer)) {
      return null;
    }

    // 5. Verify auth_date expiry
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || (maxAgeSeconds > 0 && now - authDate > maxAgeSeconds)) {
      return null;
    }

    // 6. Parse user JSON
    const userJson = params.get("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson) as TelegramUser;

    return {
      user,
      authDate,
      queryId: params.get("query_id") ?? undefined,
      raw,
    };
  } catch {
    return null;
  }
}
