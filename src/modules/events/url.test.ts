import { describe, it, expect } from "bun:test";
import { extractMeetUrl } from "./url";

describe("extractMeetUrl", () => {
  it("extracts url from user's exact jitsi iframe tag", () => {
    const rawIframe = '<iframe allow="camera; microphone; fullscreen; display-capture; autoplay" src="jitsi.cobradecision.ir/from-mvp-to-full-launch-cobradecisioni-ir" style="height: 100%; width: 100%; border: 0px;"></iframe>';
    expect(extractMeetUrl(rawIframe)).toBe("https://jitsi.cobradecision.ir/from-mvp-to-full-launch-cobradecisioni-ir");
  });

  it("handles iframe with single quotes and https scheme", () => {
    const rawIframe = "<iframe src='https://meet.jit.si/weekly-sync' allow='camera'></iframe>";
    expect(extractMeetUrl(rawIframe)).toBe("https://meet.jit.si/weekly-sync");
  });

  it("normalizes raw domain path without scheme", () => {
    expect(extractMeetUrl("jitsi.cobradecision.ir/room-1")).toBe("https://jitsi.cobradecision.ir/room-1");
  });

  it("keeps standard https url intact", () => {
    expect(extractMeetUrl("https://meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("rejects javascript: and malicious schemes", () => {
    expect(extractMeetUrl("javascript:alert(1)")).toBeNull();
    expect(extractMeetUrl('<iframe src="javascript:alert(1)"></iframe>')).toBeNull();
    expect(extractMeetUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("upgrades remote http to https", () => {
    expect(extractMeetUrl("http://jitsi.cobradecision.ir/room")).toBe("https://jitsi.cobradecision.ir/room");
  });

  it("permits http for local dev", () => {
    expect(extractMeetUrl("http://localhost:8080/room")).toBe("http://localhost:8080/room");
  });

  it("handles empty or null inputs", () => {
    expect(extractMeetUrl("")).toBeNull();
    expect(extractMeetUrl(null)).toBeNull();
    expect(extractMeetUrl(undefined)).toBeNull();
    expect(extractMeetUrl("   ")).toBeNull();
  });
});
