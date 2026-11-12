import fs from "node:fs";
import path from "node:path";
import { rankDocs, type RankContext } from "./rank";
import type { DocCandidate, RankedDoc } from "./types";

export { rankDocs } from "./rank";
export type { RankContext } from "./rank";

const DOC_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".yaml",
  ".yml",
  ".json",
]);

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
]);

const MAX_FILE_BYTES = 512 * 1024;
const MAX_CANDIDATES = 500;

function walkDocs(root: string, relativeDir: string, output: string[]): void {
  if (output.length >= MAX_CANDIDATES) return;

  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (output.length >= MAX_CANDIDATES) return;
    if (SKIP_DIRECTORIES.has(entry.name) || entry.name.startsWith(".git")) {
      continue;
    }

    const relativePath = path.posix.join(
      relativeDir.replace(/\\/g, "/"),
      entry.name,
    );

    if (entry.isDirectory()) {
      walkDocs(root, relativePath, output);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!DOC_EXTENSIONS.has(extension)) continue;

    const stats = fs.statSync(path.join(root, relativePath));
    if (stats.size > MAX_FILE_BYTES) continue;

    output.push(relativePath);
  }
}

export function discoverDocs(options: {
  root: string;
  files?: string[];
  paths?: string[];
  context: RankContext;
}): RankedDoc[] {
  const { root, files, paths, context } = options;
  const candidates: DocCandidate[] = [];

  const explicit = (files ?? []).filter((file) =>
    fs.existsSync(path.join(root, file)),
  );

  const sourceFiles: string[] = [];
  if (explicit.length > 0) {
    sourceFiles.push(...explicit);

    for (const machineTarget of [
      "llms.txt",
      "public/llms.txt",
      "openapi.yaml",
      "openapi.yml",
      "openapi.json",
      "public/openapi.yaml",
      "public/openapi.json",
    ]) {
      if (
        !sourceFiles.includes(machineTarget) &&
        fs.existsSync(path.join(root, machineTarget))
      ) {
        sourceFiles.push(machineTarget);
      }
    }
  } else {
    for (const dir of paths ?? ["docs", "content", "public"]) {
      walkDocs(root, dir, sourceFiles);
    }
  }

  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(path.join(root, file), "utf-8");
      candidates.push({ path: file.replace(/\\/g, "/"), content });
    } catch {
      continue;
    }
  }

  return rankDocs(candidates, context);
}
