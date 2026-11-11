import { describe, expect, it } from "vitest";
import { applyDocEdit, applyReplacements } from "../patch";

describe("applyReplacements", () => {
  it("applies a unique replacement", () => {
    const base = "tokenIn: string\ntokenOut: string\n";
    expect(
      applyReplacements(base, [
        { find: "tokenOut: string", replace: "tokenOut: string\nslippageBps?: number" },
      ]),
    ).toBe("tokenIn: string\ntokenOut: string\nslippageBps?: number\n");
  });

  it("rejects an ambiguous anchor", () => {
    const base = "amount: string\namount: string\n";
    expect(() =>
      applyReplacements(base, [{ find: "amount: string", replace: "x" }]),
    ).toThrow(/ambiguous/);
  });

  it("rejects a missing anchor", () => {
    expect(() =>
      applyReplacements("hello", [{ find: "missing", replace: "x" }]),
    ).toThrow(/not found/);
  });
});

describe("applyDocEdit", () => {
  it("supports full content replacement", () => {
    expect(applyDocEdit("old", { path: "docs/a.md", content: "new" })).toBe(
      "new",
    );
  });

  it("supports replacements", () => {
    expect(
      applyDocEdit("old text", {
        path: "docs/a.md",
        replacements: [{ find: "old", replace: "new" }],
      }),
    ).toBe("new text");
  });

  it("throws when no edit payload exists", () => {
    expect(() => applyDocEdit("old", { path: "docs/a.md" })).toThrow(
      /neither content nor replacements/,
    );
  });
});
