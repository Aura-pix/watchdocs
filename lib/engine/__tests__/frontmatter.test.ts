import { describe, expect, it } from "vitest";
import {
  extractHeadings,
  joinFrontmatter,
  splitFrontmatter,
  validateDocEdit,
} from "../frontmatter";

const original = `---
title: Quickstart
sidebar_position: 2
---

# Quickstart

Call POST /swap.

## Request

\`\`\`json
{ "amount": "1000000" }
\`\`\`
`;

describe("frontmatter", () => {
  it("splits and reattaches frontmatter byte-for-byte", () => {
    const split = splitFrontmatter(original);
    expect(split.frontmatter).toContain("title: Quickstart");
    expect(split.body.trimStart().startsWith("# Quickstart")).toBe(true);
    expect(joinFrontmatter(split, split.body)).toBe(original);
  });

  it("handles documents without frontmatter", () => {
    const split = splitFrontmatter("# Title\n\nBody");
    expect(split.frontmatter).toBeNull();
    expect(joinFrontmatter(split, "new body")).toBe("new body");
  });

  it("extracts headings outside code fences", () => {
    expect(extractHeadings(original)).toEqual(["# Quickstart", "## Request"]);
  });
});

describe("validateDocEdit", () => {
  it("accepts a valid surgical edit", () => {
    const updated = original.replace(
      '{ "amount": "1000000" }',
      '{ "amount": "1000000", "slippageBps": 50 }',
    );
    expect(validateDocEdit(original, updated)).toEqual([]);
  });

  it("rejects removed frontmatter", () => {
    const updated = original.split("---\n\n").slice(1).join("---\n\n");
    expect(validateDocEdit(original, updated)).toContain(
      "frontmatter was removed",
    );
  });

  it("rejects dropped headings", () => {
    const updated = original.replace("## Request", "## Examples");
    expect(validateDocEdit(original, updated).join(" ")).toContain(
      "missing headings",
    );
  });

  it("rejects truncated documents", () => {
    const long = `${original}\n${"filler line\n".repeat(100)}`;
    expect(validateDocEdit(long, "# Quickstart\n").join(" ")).toContain(
      "shrank",
    );
  });

  it("rejects unbalanced code fences", () => {
    const updated = original.replace(
      '```json\n{ "amount": "1000000" }\n```',
      '```json\n{ "amount": "1000000" }',
    );
    expect(validateDocEdit(original, updated).join(" ")).toContain(
      "unbalanced code fences",
    );
  });
});
