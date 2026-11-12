import { describe, expect, it } from "vitest";
import type { Octokit } from "octokit";
import { RepoSnapshot } from "../repo-snapshot";

async function loadedSnapshot(paths: string[]): Promise<RepoSnapshot> {
  const tree = paths.map((path) => ({
    path,
    type: "blob" as const,
    sha: `sha-${path}`,
    size: 100,
  }));

  const octokit = {
    rest: {
      git: {
        getTree: async () => ({ data: { tree, truncated: false } }),
        getBlob: async () => ({
          data: {
            encoding: "base64",
            content: Buffer.from("body").toString("base64"),
          },
        }),
      },
    },
  } as unknown as Octokit;

  return RepoSnapshot.load(octokit, "owner", "repo", "abc123");
}

describe("RepoSnapshot", () => {
  it("prefers explicit doc files and always includes machine targets", async () => {
    const snapshot = await loadedSnapshot([
      "docs/quickstart.md",
      "docs/unrelated.md",
      "public/llms.txt",
      "openapi.yaml",
    ]);

    expect(
      snapshot.selectDocCandidates(["docs/quickstart.md"], ["docs"]),
    ).toEqual(["docs/quickstart.md", "public/llms.txt", "openapi.yaml"]);
  });

  it("scans configured doc paths when no explicit files exist", async () => {
    const snapshot = await loadedSnapshot([
      "docs/errors.md",
      "docs/guide.md",
      "src/route.ts",
      "public/llms.txt",
    ]);

    expect(snapshot.selectDocCandidates([], ["docs"])).toEqual([
      "docs/guide.md",
      "docs/errors.md",
    ]);
  });

  it("finds sibling and __tests__ test files", async () => {
    const snapshot = await loadedSnapshot([
      "src/routes/swap.ts",
      "src/routes/swap.test.ts",
      "src/routes/__tests__/swap.spec.ts",
    ]);

    expect(snapshot.findTestFiles("src/routes/swap.ts")).toEqual([
      "src/routes/swap.test.ts",
      "src/routes/__tests__/swap.spec.ts",
    ]);
  });
});
