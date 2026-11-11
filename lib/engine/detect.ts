import type {
  ContractCheckResult,
  ContractSignal,
  ContractSignalKind,
  EndpointSignature,
} from "./types";

interface DiffLine {
  file: string;
  sign: "+" | "-";
  text: string;
  hunk: string;
}

const INTERNAL_LINE_PATTERNS: RegExp[] = [
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*#(?!\[)/,
  /\bconsole\.(log|debug|info|warn|error|trace)\b/,
  /\b(?:logger|log|timber)\.(?:debug|info|warn|error|trace|fatal)\b/,
  /\bprint\s*\(/,
  /\b(?:db|prisma|knex|sequelize|drizzle|sql|pool|client)\.(?:query|execute|raw|select|insert|update|delete)\b/,
  /^\s*(?:SELECT|INSERT|UPDATE|DELETE)\s+/i,
  /\b(?:cache|redis)\.(?:get|set|del|delete|expire|incr)\b/,
  /\b(?:metrics|counter|histogram|tracer)\./,
  /\bTODO\b/,
];

const ROUTE_PATTERNS: RegExp[] = [
  /\b(?:router|app|server|route|api|fastify|hono|express|r)\.(get|post|put|patch|delete|all)\s*\(\s*["'`]([^"'`]+)["'`]/i,
  /@(Get|Post|Put|Patch|Delete|Route)\s*\(\s*["'`]([^"'`]*)["'`]/i,
  /\b(?:router|app|server|r)\.(?:GET|POST|PUT|PATCH|DELETE|HandleFunc|GET|Post|Get)\s*\(\s*["'`]([^"'`]+)["'`]/,
  /\.(?:route)\s*\(\s*["'`]([^"'`]+)["'`][^)]*\)\s*\.\s*(get|post|put|patch|delete)\b/i,
  /["'`]method["'`]\s*:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`][\s\S]{0,120}?["'`](?:path|url|route)["'`]\s*:\s*["'`]([^"'`]+)["'`]/i,
];

const HANDLER_PATTERNS: RegExp[] = [
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/,
  /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/,
  /(?:async\s+)?function\s+(handle[A-Z]\w+)\s*\(/,
  /@(?:Get|Post|Put|Patch|Delete)\([^)]*\)\s*(?:public\s+)?(?:async\s+)?(\w+)\s*\(/,
];

const SCHEMA_PATTERNS: RegExp[] = [
  /\bz\.object\s*\(/,
  /\bzod\.object\s*\(/,
  /\b(?:interface|type)\s+\w*(?:Request|Body|Query|Params|Payload|Input|Dto|DTO)\b/,
  /\b(?:body|query|params|headers|requestBody|properties|schema)\s*:/i,
  /@(?:Body|Query|Param|Headers)\s*\(/,
  /\bJoi\.|yup\.|zodResolver|class-validator/,
];

const PROPERTY_PATTERN = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:\s*\S/;

const ERROR_PATTERNS: RegExp[] = [
  /\.(?:status|statusCode|code)\s*\(\s*([45]\d\d)\b/,
  /\b(?:status|statusCode|httpStatus|http_code)\s*[=:]\s*([45]\d\d)\b/i,
  /\b(?:ApiError|HttpError|HTTPException|AppError|ResponseError|ProblemDetails|StatusError)\s*\(\s*([45]\d\d)\b/,
  /\bthrow\s+new\s+\w*(?:Error|Exception)\s*\(\s*([45]\d\d)\b/,
  /\b(?:assert|fail|abort)\w*\s*\(\s*([45]\d\d)\b/,
];

function isInternalLine(text: string): boolean {
  return INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function parseDiff(diff: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let file = "unknown";
  let currentHunk: string[] = [];

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ b/")) {
      file = raw.slice(6).trim();
      currentHunk = [];
      continue;
    }
    if (raw.startsWith("--- a/")) {
      file = raw.slice(6).trim();
      continue;
    }
    if (raw.startsWith("+++ ") || raw.startsWith("--- ")) {
      continue;
    }
    if (raw.startsWith("@@")) {
      currentHunk = [raw];
      continue;
    }
    if (raw.startsWith("+") || raw.startsWith("-")) {
      const sign = raw[0] as "+" | "-";
      const text = raw.slice(1);
      currentHunk.push(raw);
      lines.push({ file, sign, text, hunk: currentHunk.join("\n") });
      continue;
    }
    if (currentHunk.length > 0) currentHunk.push(raw);
  }

  return lines;
}

function matchRoute(
  text: string,
): { kind: ContractSignalKind; method: string | null; path: string | null } | null {
  for (const pattern of ROUTE_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;

    if (pattern.source.includes("method")) {
      const method = match[1]?.toUpperCase() ?? null;
      const path = match[2] ?? null;
      return { kind: "route", method, path };
    }

    const first = match[1] ?? "";
    const second = match[2] ?? "";
    const firstLooksLikeMethod = /^(get|post|put|patch|delete|all)$/i.test(first);
    return {
      kind: "route",
      method: firstLooksLikeMethod ? first.toUpperCase() : null,
      path: firstLooksLikeMethod ? second : first,
    };
  }
  return null;
}

function matchStatus(text: string): string | null {
  for (const pattern of ERROR_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[1];
  }
  return null;
}

function matchSchema(text: string): string | null {
  for (const pattern of SCHEMA_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

function matchHandler(text: string): string | null {
  for (const pattern of HANDLER_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[1];
  }
  return null;
}

export function routePathFromFile(file: string): string | null {
  const normalized = file.replace(/\\/g, "/");

  const appMatch = normalized.match(/(?:^|\/)app\/(.+)\/route\.[tj]sx?$/);
  if (appMatch) {
    const segments = appMatch[1]
      .split("/")
      .filter((segment) => !/^\(.+\)$/.test(segment))
      .map((segment) => segment.replace(/^\[{1,2}(?:\.\.\.)?(.+?)\]{1,2}$/, ":$1"));
    return `/${segments.join("/")}`;
  }

  const pagesMatch = normalized.match(/(?:^|\/)pages\/api\/(.+)\.(?:[tj]sx?)$/);
  if (pagesMatch) {
    return `/api/${pagesMatch[1].replace(/\/index$/, "")}`;
  }

  return null;
}

export function detectContractChange(diff: string): ContractCheckResult {
  const lines = parseDiff(diff);
  const signals: ContractSignal[] = [];
  const seen = new Set<string>();

  const endpoint: EndpointSignature = { method: null, path: null, handler: null };

  const pushSignal = (
    kind: ContractSignalKind,
    line: DiffLine,
    detail: string,
  ) => {
    const key = `${kind}:${line.file}:${detail}:${line.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ kind, file: line.file, detail, line: line.text.trim() });
  };

  for (const line of lines) {
    if (isInternalLine(line.text)) continue;

    const route = matchRoute(line.text);
    if (route) {
      const method = route.method;
      const routePath = route.path;
      const descriptor = [method, routePath].filter(Boolean).join(" ");
      pushSignal(
        method && !routePath ? "method" : "route",
        line,
        descriptor || "route declaration changed",
      );

      if (routePath && (line.sign === "+" || !endpoint.path)) {
        endpoint.path = routePath;
      }
      if (method && (line.sign === "+" || !endpoint.method)) {
        endpoint.method = method;
      }
      continue;
    }

    const status = matchStatus(line.text);
    if (status) {
      pushSignal("error", line, `status ${status}`);
      continue;
    }

    const handler = matchHandler(line.text);
    if (handler) {
      pushSignal("method", line, `handler ${handler}`);
      if (line.sign === "+" || !endpoint.handler) {
        endpoint.handler = handler;
      }
      if (
        /^(GET|POST|PUT|PATCH|DELETE)$/.test(handler) &&
        (line.sign === "+" || !endpoint.method)
      ) {
        endpoint.method = handler;
      }
      continue;
    }

    const schema = matchSchema(line.text);
    if (schema) {
      pushSignal("schema", line, "request/response schema changed");
      continue;
    }

    const property = PROPERTY_PATTERN.exec(line.text);
    if (property && /\b(?:body|query|params|schema|payload|request|input|dto)\b/i.test(line.hunk)) {
      pushSignal("request", line, `field ${property[1]}`);
    }
  }

  if (!endpoint.handler) {
    for (const line of lines) {
      if (isInternalLine(line.text)) continue;
      const handler = matchHandler(line.text);
      if (handler) {
        endpoint.handler = handler;
        break;
      }
    }
  }

  const changed = signals.length > 0;
  const reason = changed
    ? summarize(signals)
    : "No public API contract change (internal-only diff).";

  return { changed, signals, endpoint, reason };
}

function summarize(signals: ContractSignal[]): string {
  const kinds = new Set(signals.map((signal) => signal.kind));
  const parts: string[] = [];

  if (kinds.has("route")) parts.push("route path");
  if (kinds.has("method")) parts.push("HTTP method/handler");
  if (kinds.has("schema")) parts.push("schema");
  if (kinds.has("request")) parts.push("request fields");
  if (kinds.has("error")) parts.push("error responses");

  const endpoint = signals.find((signal) => signal.kind === "route");
  const detail = endpoint ? ` (${endpoint.detail})` : "";
  return `Public contract changed: ${parts.join(", ")}${detail}.`;
}

export function extractEndpointFromFiles(
  files: ContractCheckResult["signals"],
): EndpointSignature {
  const route = files.find((signal) => signal.kind === "route");
  if (!route) return { method: null, path: null, handler: null };
  return { method: null, path: route.detail, handler: null };
}
