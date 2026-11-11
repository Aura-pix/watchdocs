import { describe, expect, it } from "vitest";
import { matchesAny, matchesGlob } from "../glob";
import { filterWatchedFiles } from "../run";
import { normalizeConfig } from "../config";

const config = normalizeConfig({
  watch: {
    routes: ["src/routes/**/*.{ts,js,py,go}", "openapi.{json,yaml,yml}"],
    ignore: ["**/*.test.*", "**/*.spec.*", "**/internal/**"],
  },
  docs: { files: [] },
  pr: { branchPrefix: "watchdocs/sync-", labels: [], reviewers: [] },
});

describe("glob matching", () => {
  it("matches nested route files and extensions", () => {
    expect(matchesGlob("src/routes/swap.ts", "src/routes/**/*.{ts,js,py,go}")).toBe(
      true,
    );
    expect(
      matchesGlob("src/routes/v1/deep/swap.js", "src/routes/**/*.{ts,js,py,go}"),
    ).toBe(true);
    expect(matchesGlob("src/routes/swap.test.ts", "src/routes/**/*.{ts,js,py,go}")).toBe(
      true,
    );
    expect(matchesGlob("src/services/swap.ts", "src/routes/**/*.{ts,js,py,go}")).toBe(
      false,
    );
  });

  it("matches openapi files at the root", () => {
    expect(matchesGlob("openapi.yaml", "openapi.{json,yaml,yml}")).toBe(true);
    expect(matchesGlob("openapi.json", "openapi.{json,yaml,yml}")).toBe(true);
  });

  it("honors ignore patterns", () => {
    expect(matchesAny("src/routes/swap.test.ts", config.watch.ignore)).toBe(true);
    expect(matchesAny("src/routes/internal/debug.ts", config.watch.ignore)).toBe(
      true,
    );
    expect(matchesAny("src/routes/swap.ts", config.watch.ignore)).toBe(false);
  });
});

describe("filterWatchedFiles", () => {
  it("keeps watched routes and drops tests and internal files", () => {
    const result = filterWatchedFiles(
      [
        "src/routes/swap.ts",
        "src/routes/swap.test.ts",
        "src/routes/internal/debug.ts",
        "src/services/db.ts",
        "README.md",
        "openapi.yaml",
      ],
      config,
    );

    expect(result).toEqual(["src/routes/swap.ts", "openapi.yaml"]);
  });

  it("normalizes Windows separators", () => {
    expect(
      filterWatchedFiles(["src\\routes\\swap.ts"], config),
    ).toEqual(["src/routes/swap.ts"]);
  });
});
