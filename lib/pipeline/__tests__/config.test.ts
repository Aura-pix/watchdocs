import { describe, expect, it } from "vitest";
import { normalizeConfig } from "@/lib/engine/config";
import { applyRepoOverrides } from "../config";

describe("repository config overrides", () => {
  it("keeps file defaults when repository settings are empty", () => {
    const config = normalizeConfig({});
    const merged = applyRepoOverrides(config, {
      watchedPaths: [],
      docsPaths: [],
      branchPrefix: "",
      prLabels: [],
    });

    expect(merged.watch.routes).toBe(config.watch.routes);
    expect(merged.docs.paths).toBe(config.docs.paths);
    expect(merged.pr.branchPrefix).toBe(config.pr.branchPrefix);
    expect(merged.pr.labels).toBe(config.pr.labels);
  });

  it("applies repository paths, branch prefix, and labels", () => {
    const merged = applyRepoOverrides(normalizeConfig({}), {
      watchedPaths: ["app/api/**"],
      docsPaths: ["docs"],
      branchPrefix: "docs-sync/",
      prLabels: ["documentation"],
    });

    expect(merged.watch.routes).toEqual(["app/api/**"]);
    expect(merged.docs.paths).toEqual(["docs"]);
    expect(merged.pr.branchPrefix).toBe("docs-sync/");
    expect(merged.pr.labels).toEqual(["documentation"]);
  });

  it("does not mutate the source config", () => {
    const config = normalizeConfig({});
    const routes = [...config.watch.routes];

    applyRepoOverrides(config, {
      watchedPaths: ["app/api/**"],
      docsPaths: ["docs"],
      branchPrefix: "docs-sync/",
      prLabels: ["documentation"],
    });

    expect(config.watch.routes).toEqual(routes);
    expect(config.docs.paths).toEqual(["docs", "content", "public"]);
    expect(config.pr.branchPrefix).toBe("watchdocs/sync-");
  });
});
