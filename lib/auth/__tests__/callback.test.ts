import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "../callback";

describe("safeCallbackUrl", () => {
  it("keeps internal paths with query strings", () => {
    expect(safeCallbackUrl("/app?installed=1")).toBe("/app?installed=1");
  });

  it("falls back for absolute and protocol-relative URLs", () => {
    expect(safeCallbackUrl("https://evil.example")).toBe("/app");
    expect(safeCallbackUrl("//evil.example")).toBe("/app");
  });

  it("falls back for backslash-normalized hosts", () => {
    expect(safeCallbackUrl("/\\evil.example")).toBe("/app");
  });

  it("falls back for missing, empty, and oversized values", () => {
    expect(safeCallbackUrl(undefined)).toBe("/app");
    expect(safeCallbackUrl("")).toBe("/app");
    expect(safeCallbackUrl(`/${"a".repeat(2048)}`)).toBe("/app");
  });

  it("uses a custom fallback", () => {
    expect(safeCallbackUrl("https://evil.example", "/login")).toBe("/login");
  });
});
