import fs from "node:fs";
import path from "node:path";
import type { WatchdocsConfig } from "./types";

export const DEFAULT_CONFIG: WatchdocsConfig = {
  version: 1,
  watch: {
    routes: [
      "src/routes/**/*.{ts,js,py,go}",
      "src/controllers/**/*.{ts,js,py,go}",
      "openapi.{json,yaml,yml}",
    ],
    ignore: ["**/*.test.*", "**/*.spec.*", "**/internal/**"],
  },
  docs: {
    files: ["docs/quickstart.md", "docs/errors.md", "public/llms.txt"],
    paths: ["docs", "content", "public"],
  },
  pr: {
    branchPrefix: "watchdocs/sync-",
    labels: ["documentation", "automated-pr"],
    reviewers: [],
  },
};

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function normalizeConfig(input: unknown): WatchdocsConfig {
  if (!input || typeof input !== "object") {
    throw new Error(".watchdocsrc.json must contain a JSON object.");
  }

  const raw = input as Record<string, unknown>;
  const watch = (raw.watch ?? {}) as Record<string, unknown>;
  const docs = (raw.docs ?? {}) as Record<string, unknown>;
  const pr = (raw.pr ?? {}) as Record<string, unknown>;

  return {
    $schema: typeof raw.$schema === "string" ? raw.$schema : undefined,
    version: typeof raw.version === "number" ? raw.version : 1,
    watch: {
      routes: isStringArray(watch.routes)
        ? watch.routes
        : DEFAULT_CONFIG.watch.routes,
      ignore: isStringArray(watch.ignore)
        ? watch.ignore
        : DEFAULT_CONFIG.watch.ignore,
    },
    docs: {
      files: isStringArray(docs.files)
        ? docs.files
        : DEFAULT_CONFIG.docs.files,
      paths: isStringArray(docs.paths)
        ? docs.paths
        : DEFAULT_CONFIG.docs.paths,
    },
    pr: {
      branchPrefix:
        typeof pr.branchPrefix === "string"
          ? pr.branchPrefix
          : DEFAULT_CONFIG.pr.branchPrefix,
      labels: isStringArray(pr.labels)
        ? pr.labels
        : DEFAULT_CONFIG.pr.labels,
      reviewers: isStringArray(pr.reviewers)
        ? pr.reviewers
        : DEFAULT_CONFIG.pr.reviewers,
    },
  };
}

export function loadConfig(cwd = process.cwd()): WatchdocsConfig {
  const configPath = path.join(cwd, ".watchdocsrc.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`No .watchdocsrc.json found at ${configPath}.`);
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return normalizeConfig(parsed);
}
