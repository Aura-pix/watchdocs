import type { Fixture, FixtureKind } from "./types";

export const MAX_FIXTURES = 6;
const MAX_SNIPPET = 1200;

function extractBalanced(
  text: string,
  startIndex: number,
  open: string,
  close: string,
): string | null {
  let depth = 0;
  let started = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === open) {
      depth += 1;
      started = true;
    } else if (char === close) {
      depth -= 1;
      if (started && depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function compact(snippet: string): string {
  return snippet.replace(/\r\n/g, "\n").trim().slice(0, MAX_SNIPPET);
}

function lineAround(text: string, index: number, radius = 2): string {
  const lines = text.split("\n");
  let offset = 0;
  for (let indexLine = 0; indexLine < lines.length; indexLine += 1) {
    const lineLength = lines[indexLine].length + 1;
    if (offset + lineLength > index) {
      const start = Math.max(0, indexLine - radius);
      const end = Math.min(lines.length, indexLine + radius + 1);
      return compact(lines.slice(start, end).join("\n"));
    }
    offset += lineLength;
  }
  return compact(text.slice(index, index + 240));
}

export function extractFixtures(file: string, content: string): Fixture[] {
  const fixtures: Fixture[] = [];
  const seen = new Set<string>();

  const push = (kind: FixtureKind, snippet: string) => {
    const cleaned = compact(snippet);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    fixtures.push({ file, kind, snippet: cleaned });
  };

  const requestPattern =
    /\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  let requestMatch: RegExpExecArray | null;

  while ((requestMatch = requestPattern.exec(content)) !== null) {
    const afterCall = content.slice(requestMatch.index);
    const bodyStart = afterCall.search(/\.(?:send|json)\s*\(|\bdata\s*[:=]/);
    if (bodyStart === -1) {
      push("request", lineAround(content, requestMatch.index));
      continue;
    }

    const absoluteStart = requestMatch.index + bodyStart;
    const braceStart = content.indexOf("{", absoluteStart);
    if (braceStart !== -1 && braceStart - absoluteStart < 120) {
      const body = extractBalanced(content, braceStart, "{", "}");
      if (body) {
        push("request", `${requestMatch[0].trim()} body:\n${body}`);
        continue;
      }
    }

    push("request", lineAround(content, absoluteStart));
  }

  const responsePattern = /expect\s*\([^)]*(?:body|response|res|json)[^)]*\)/gi;
  let responseMatch: RegExpExecArray | null;
  while ((responseMatch = responsePattern.exec(content)) !== null) {
    push("response", lineAround(content, responseMatch.index, 1));
  }

  const errorPattern =
    /\b(?:status(?:Code)?|httpStatus|http_code)\b[^\n]{0,40}?\b([45]\d\d)\b/gi;
  let errorMatch: RegExpExecArray | null;
  while ((errorMatch = errorPattern.exec(content)) !== null) {
    push(
      "error",
      `${lineAround(content, errorMatch.index, 1)}\n// expected status ${errorMatch[1]}`,
    );
  }

  return fixtures.slice(0, MAX_FIXTURES);
}
