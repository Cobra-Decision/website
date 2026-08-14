/**
 * Generates a lightweight, collision-resistant, sortable string ID (ULID / NanoID compatible).
 * Uses timestamp prefix (10 chars base36) + random crypto suffix (12 chars base36).
 */
let counter = 0;

/**
 * Generates a lightweight, collision-resistant, monotonically sortable string ID.
 * Uses timestamp prefix (10 chars base36) + monotonic sequence (4 chars base36) + random crypto suffix.
 */
export function generateId(): string {
  const time = Date.now().toString(36).padStart(10, "0");
  counter = (counter + 1) % 1679616; // 36^4
  const seq = counter.toString(36).padStart(4, "0");
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  let random = "";
  for (const byte of randomBytes) {
    random += byte.toString(36).padStart(2, "0");
  }
  return `${time}${seq}${random}`.slice(0, 22);
}
