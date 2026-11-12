import { describe, expect, it } from "vitest";
import { formatCost, formatDate, formatTokens, shortSha } from "../format";

describe("app display formatting", () => {
  it("formats costs from numeric strings", () => {
    expect(formatCost("0.012345")).toBe("$0.0123");
    expect(formatCost(1)).toBe("$1.0000");
    expect(formatCost(null)).toBe("$0.0000");
    expect(formatCost("not-a-number")).toBe("$0.0000");
  });

  it("formats token counts", () => {
    expect(formatTokens(1200, 300)).toBe("1,200 in / 300 out");
  });

  it("shortens commit SHAs", () => {
    expect(shortSha("0123456789abcdef")).toBe("0123456");
  });

  it("handles missing and invalid dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate(new Date("2026-01-02T03:04:00Z"))).not.toBe("—");
  });
});
