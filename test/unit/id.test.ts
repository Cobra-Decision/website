import { expect, test } from "bun:test";
import { generateId } from "../../src/lib/id";

test("generateId produces unique sortable string IDs", () => {
  const id1 = generateId();
  const id2 = generateId();

  expect(typeof id1).toBe("string");
  expect(typeof id2).toBe("string");
  expect(id1.length).toBeGreaterThanOrEqual(16);
  expect(id1).not.toBe(id2);
});
