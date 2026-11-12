import { describe, expect, it } from "vitest";
import {
  isSafeBranch,
  isSafeRepoPath,
  MAX_LABEL_LENGTH,
  MAX_LABELS,
  MAX_PATH_LENGTH,
  MAX_PATHS,
  parseLabels,
  parseLines,
} from "../repo-settings";

describe("repository settings parsing", () => {
  it("trims paths and drops empty lines", () => {
    expect(parseLines(" app/api/** \n\n lib/api/**\r\n")).toEqual([
      "app/api/**",
      "lib/api/**",
    ]);
    expect(parseLines(null)).toEqual([]);
  });

  it("splits labels on commas and newlines", () => {
    expect(parseLabels("documentation, automated\napi")).toEqual([
      "documentation",
      "automated",
      "api",
    ]);
    expect(parseLabels("")).toEqual([]);
  });

  it("accepts relative globs and rejects unsafe paths", () => {
    expect(isSafeRepoPath("app/api/**")).toBe(true);
    expect(isSafeRepoPath("docs/quickstart.mdx")).toBe(true);
    expect(isSafeRepoPath("")).toBe(false);
    expect(isSafeRepoPath("/etc/passwd")).toBe(false);
    expect(isSafeRepoPath("\\windows")).toBe(false);
    expect(isSafeRepoPath("docs/../../secret")).toBe(false);
    expect(isSafeRepoPath("a".repeat(MAX_PATH_LENGTH + 1))).toBe(false);
  });

  it("accepts normal branch names and rejects unsafe ones", () => {
    expect(isSafeBranch("main")).toBe(true);
    expect(isSafeBranch("release/1.0")).toBe(true);
    expect(isSafeBranch("watchdocs/sync-")).toBe(true);
    expect(isSafeBranch("")).toBe(false);
    expect(isSafeBranch("bad branch")).toBe(false);
    expect(isSafeBranch("release..1")).toBe(false);
    expect(isSafeBranch("/main")).toBe(false);
    expect(isSafeBranch("main/")).toBe(false);
  });

  it("exports limits that match the settings form", () => {
    expect(MAX_PATHS).toBeGreaterThan(0);
    expect(MAX_LABELS).toBeGreaterThan(0);
    expect(MAX_LABEL_LENGTH).toBeGreaterThan(0);
  });
});
