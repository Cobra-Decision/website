import { describe, expect, it } from "bun:test";
import { validateTelegramInitData } from "../src/modules/telegram/crypto";

describe("Telegram initData Crypto Validation", () => {
  const botToken = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";

  it("should successfully validate genuine Telegram initData", async () => {
    // Generate valid HMAC using Web Crypto for testing
    const authDate = Math.floor(Date.now() / 1000);
    const userJson = JSON.stringify({ id: 987654321, first_name: "John", last_name: "Doe", username: "johndoe" });
    const dataCheckString = `auth_date=${authDate}\nquery_id=AAHdF6IQAAAAAN0XohDhrOrc\nuser=${userJson}`;

    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const calculatedHashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(dataCheckString));
    const hash = Array.from(new Uint8Array(calculatedHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const initData = `query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=${encodeURIComponent(userJson)}&auth_date=${authDate}&hash=${hash}`;

    const result = await validateTelegramInitData(initData, botToken);
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(987654321);
    expect(result?.user.username).toBe("johndoe");
    expect(result?.user.first_name).toBe("John");
  });

  it("should reject tampered initData hash", async () => {
    const authDate = Math.floor(Date.now() / 1000);
    const userJson = JSON.stringify({ id: 111222333, first_name: "Hacker" });
    const fakeHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const initData = `user=${encodeURIComponent(userJson)}&auth_date=${authDate}&hash=${fakeHash}`;

    const result = await validateTelegramInitData(initData, botToken);
    expect(result).toBeNull();
  });

  it("should reject expired initData (auth_date > 24 hours old)", async () => {
    const expiredAuthDate = Math.floor(Date.now() / 1000) - 90000; // 25 hours ago
    const userJson = JSON.stringify({ id: 987654321, first_name: "John" });
    const dataCheckString = `auth_date=${expiredAuthDate}\nuser=${userJson}`;

    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const calculatedHashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(dataCheckString));
    const hash = Array.from(new Uint8Array(calculatedHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const initData = `user=${encodeURIComponent(userJson)}&auth_date=${expiredAuthDate}&hash=${hash}`;

    const result = await validateTelegramInitData(initData, botToken, 86400);
    expect(result).toBeNull();
  });
});
