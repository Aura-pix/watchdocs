import fs from "node:fs";
import path from "node:path";
import type {
  DocCandidate,
  EndpointSignature,
  RankedDoc,
} from "./types";

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

export interface RankContext {
  endpoint: EndpointSignature;
  errorChanged: boolean;
  limit?: number;
}

function isMachineTarget(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  return (
    base === "llms.txt" ||
    base === "llms-full.txt" ||
    base === "openapi.json" ||
    base === "openapi.yaml" ||
    base === "openapi.yml"
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rankDocs(
  candidates: DocCandidate[],
  context: RankContext,
): RankedDoc[] {
  const limit = context.limit ?? 4;
  const { endpoint, errorChanged } = context;

  const scored = candidates.map((candidate) => {
    const reasons: string[] = [];
    let score = 0;
    const content = candidate.content;
    const lowerPath = candidate.path.toLowerCase();
    const lowerContent = content.toLowerCase();

    if (endpoint.path) {
      const pathPattern = new RegExp(escapeRegex(endpoint.path), "i");
      if (pathPattern.test(content)) {
        score += 10;
        reasons.push(`mentions ${endpoint.path}`);
      }
    }

    if (endpoint.method && endpoint.path) {
      const pair = `${endpoint.method} ${endpoint.path}`;
      const pairPattern = new RegExp(
        `${escapeRegex(endpoint.method)}\\s+${escapeRegex(endpoint.path)}`,
        "i",
      );
      if (pairPattern.test(content)) {
        score += 4;
        reasons.push(`documents ${pair}`);
      }
    }

    if (endpoint.handler && lowerContent.includes(endpoint.handler.toLowerCase())) {
      score += 5;
      reasons.push(`mentions ${endpoint.handler}`);
    }

    if (errorChanged && /\b[45]\d\d\b/.test(content)) {
      score += 4;
      reasons.push("documents error status codes");
    }

    if (/quickstart|getting-started|getting_started|intro|guide/.test(lowerPath)) {
      score += 2;
      reasons.push("guide");
    }
    if (errorChanged && /error|troubleshoot|failure|status/.test(lowerPath)) {
      score += 3;
      reasons.push("error reference");
    }
    if (/api-reference|reference|openapi/.test(lowerPath)) {
      score += 2;
      reasons.push("API reference");
    }

    const mustInclude = isMachineTarget(candidate.path);
    if (mustInclude) {
      score += 1;
      reasons.push("machine-readable target");
    }

    return { path: candidate.path, score, reasons, mustInclude };
  });

  const seen = new Set<string>();
  const unique = scored
    .filter((doc) => {
      if (seen.has(doc.path)) return false;
      seen.add(doc.path);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const must = unique.filter((doc) => doc.mustInclude);
  const selected = unique.slice(0, Math.max(limit, 1));

  for (const doc of must) {
    if (!selected.some((item) => item.path === doc.path)) {
      selected.push(doc);
    }
  }

  return selected;
}

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
