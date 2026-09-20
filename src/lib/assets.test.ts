import { describe, it, expect } from "bun:test";
import { assetUrl } from "./assets";

describe("Asset Versioning Helper", () => {
  it("appends content md5 hash for existing public files", () => {
    const url = assetUrl("/app.css");
    expect(url).toMatch(/^\/app\.css\?v=[a-f0-9]{8}$/);
  });

  it("handles relative path without leading slash", () => {
    const url = assetUrl("app.css");
    expect(url).toMatch(/^\/app\.css\?v=[a-f0-9]{8}$/);
  });

  it("returns original path for non-existent files gracefully", () => {
    const url = assetUrl("/non-existent-file.css");
    expect(url).toBe("/non-existent-file.css");
  });
});
