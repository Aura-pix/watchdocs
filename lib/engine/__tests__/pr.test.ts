import { describe, expect, it } from "vitest";
import {
  buildPrBody,
  buildPrLabels,
  buildPrTitle,
  guessGithubLogin,
  lineDelta,
} from "../pr";
import type { CommitInfo } from "../types";

const commit: CommitInfo = {
  sha: "4a8f9c1f00",
  shortSha: "4a8f9c1",
  parent: "0000000",
  message: "feat: add slippageBps",
  authorName: "Ada Lovelace",
  authorEmail: "123+ada@users.noreply.github.com",
};

describe("pull request rendering", () => {
  it("builds a titled PR with SHA and author", () => {
    expect(buildPrTitle(commit)).toBe("docs: sync for API changes in 4a8f9c1");
  });

  it("includes cause, changes, checklist, and the no-auto-merge note", () => {
    const body = buildPrBody({
      commit,
      changedFiles: ["src/routes/swap.ts"],
      docChanges: [
        {
          path: "docs/quickstart.md",
          before: "a\nb\nc",
          after: "a\nb\nc\nd",
        },
      ],
      reused: false,
    });

    expect(body).toContain("4a8f9c1");
    expect(body).toContain("Ada Lovelace");
    expect(body).toContain("src/routes/swap.ts");
    expect(body).toContain("docs/quickstart.md");
    expect(body).toContain("No auto-merge");
  });

  it("derives a GitHub login from a noreply email", () => {
    expect(
      guessGithubLogin("123+ada@users.noreply.github.com", "Ada Lovelace"),
    ).toBe("ada");
    expect(guessGithubLogin("ada@example.com", "ada")).toBe("ada");
    expect(guessGithubLogin("ada@example.com", "Ada Lovelace")).toBeNull();
  });

  it("adds an errors label when error docs changed", () => {
    expect(buildPrLabels(["documentation"], true)).toEqual([
      "documentation",
      "errors",
    ]);
  });

  it("computes approximate line deltas", () => {
    expect(lineDelta("a\nb", "a\nc\nd")).toEqual({ added: 2, removed: 1 });
  });
});
