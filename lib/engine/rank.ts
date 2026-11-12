import path from "node:path";
import type {
  DocCandidate,
  EndpointSignature,
  RankedDoc,
} from "./types";

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

export interface RankContext {
  endpoint: EndpointSignature;
  errorChanged: boolean;
  limit?: number;
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
