/**
 * Generates a lightweight, collision-resistant, sortable string ID (ULID / NanoID compatible).
 * Uses timestamp prefix (10 chars base36) + random crypto suffix (12 chars base36).
 */
export function generateId(): string {
  const time = Date.now().toString(36).padStart(10, "0");
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  let random = "";
  for (const byte of randomBytes) {
    random += byte.toString(36).padStart(2, "0");
  }
  return `${time}${random}`.slice(0, 22);
}
