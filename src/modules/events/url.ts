/**
 * URL parsing and sanitization utilities for meeting rooms and video embeds.
 */

/**
 * Safely extracts and normalizes a meeting URL from a direct URL or raw <iframe> embed snippet.
 *
 * Supports:
 * - Full <iframe> HTML tags: `<iframe ... src="jitsi.cobradecision.ir/room" ...>`
 * - Raw URLs without scheme: `jitsi.cobradecision.ir/room` -> `https://jitsi.cobradecision.ir/room`
 * - Standard HTTP/HTTPS URLs: `https://meet.jit.si/room`
 *
 * Security:
 * - Rejects non-HTTP(S) schemes (e.g. javascript:, data:, vbscript:)
 * - Validates output with standard URL parser
 */
export function extractMeetUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  let text = raw.trim();

  // If iframe tag or src attribute was pasted, extract the URL value
  if (text.toLowerCase().includes("<iframe")) {
    const srcMatch = text.match(/\bsrc=["']?([^"'\s>]+)["']?/i);
    if (srcMatch && srcMatch[1]) text = srcMatch[1].trim();
  } else {
    const bareMatch = text.match(/^src=["']?([^"'\s>]+)["']?$/i);
    if (bareMatch && bareMatch[1]) text = bareMatch[1].trim();
  }

  // Reject malicious pseudo-protocols (XSS prevention)
  if (/^(javascript|data|vbscript):/i.test(text)) {
    return null;
  }

  // Prepend https:// if no protocol provided (e.g. jitsi.cobradecision.ir/room)
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i.test(text)) {
    text = `https://${text.replace(/^\/\//, "")}`;
  }

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    // Block non-https for remote origins (prevent mixed content under HTTPS)
    if (parsed.protocol === "http:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      parsed.protocol = "https:";
    }
    return parsed.href;
  } catch {
    return null;
  }
}
