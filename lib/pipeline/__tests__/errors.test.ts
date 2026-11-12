import { describe, expect, it } from "vitest";
import { isTransientError } from "../errors";

describe("pipeline error classification", () => {
  it("treats rate limits and server errors as transient", () => {
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
  });

  it("treats network failures as transient", () => {
    expect(isTransientError(new Error("connect ECONNREFUSED 127.0.0.1"))).toBe(
      true,
    );
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
    expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
  });

  it("treats client errors and validation failures as permanent", () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
    expect(
      isTransientError(new Error("Document validation failed for docs/a.md")),
    ).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError("plain string")).toBe(false);
  });
});
