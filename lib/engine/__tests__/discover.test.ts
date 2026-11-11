import { describe, expect, it } from "vitest";
import { rankDocs } from "../discover";
import type { DocCandidate } from "../types";

const candidates: DocCandidate[] = [
  {
    path: "docs/quickstart.md",
    content: "Call POST /swap to exchange tokens. amount is required.",
  },
  {
    path: "docs/errors.md",
    content: "| 401 | UNAUTHORIZED |\n| 429 | RATE_LIMITED |",
  },
  {
    path: "docs/users.md",
    content: "GET /users returns a list of users.",
  },
  {
    path: "public/llms.txt",
    content: "POST /swap, GET /users, error codes.",
  },
];

describe("rankDocs", () => {
  it("ranks endpoint docs first and always includes machine targets", () => {
    const ranked = rankDocs(candidates, {
      endpoint: { method: "POST", path: "/swap", handler: null },
      errorChanged: true,
      limit: 3,
    });

    expect(ranked[0].path).toBe("docs/quickstart.md");
    expect(ranked.map((doc) => doc.path)).toContain("public/llms.txt");
    expect(ranked.map((doc) => doc.path)).not.toContain("docs/users.md");
  });

  it("prioritizes error references when errors changed", () => {
    const ranked = rankDocs(candidates, {
      endpoint: { method: "POST", path: "/swap", handler: null },
      errorChanged: true,
      limit: 3,
    });

    expect(ranked.map((doc) => doc.path)).toContain("docs/errors.md");
  });

  it("adds machine targets even when the limit is reached", () => {
    const ranked = rankDocs(
      [
        {
          path: "docs/users.md",
          content: "GET /users returns a list of users.",
        },
        {
          path: "public/llms.txt",
          content: "Index of the public API.",
        },
      ],
      {
        endpoint: { method: "GET", path: "/users", handler: null },
        errorChanged: false,
        limit: 1,
      },
    );

    expect(ranked.map((doc) => doc.path)).toEqual(
      expect.arrayContaining(["docs/users.md", "public/llms.txt"]),
    );
  });

  it("handles an empty candidate list", () => {
    expect(
      rankDocs([], {
        endpoint: { method: null, path: null, handler: null },
        errorChanged: false,
      }),
    ).toEqual([]);
  });
});
