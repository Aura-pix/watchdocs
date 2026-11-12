import type { EndpointSignature } from "@/lib/engine/types";

export interface RouteDocMapping {
  routePattern: string;
  docPath: string;
}

function splitRoutePattern(pattern: string): {
  method: string | null;
  path: string;
} {
  const parts = pattern.trim().split(/\s+/);

  if (parts.length >= 2 && /^[A-Za-z]+$/.test(parts[0])) {
    return {
      method: parts[0].toUpperCase(),
      path: parts.slice(1).join(" "),
    };
  }

  return { method: null, path: pattern.trim() };
}

function normalizePath(path: string): string {
  const withoutWildcard = path.replace(/\/?\*+$/, "");
  if (!withoutWildcard) return "/";
  return withoutWildcard.startsWith("/")
    ? withoutWildcard
    : `/${withoutWildcard}`;
}

export function mappingMatchesEndpoint(
  mapping: RouteDocMapping,
  endpoint: EndpointSignature,
): boolean {
  const { method, path } = splitRoutePattern(mapping.routePattern);

  if (!path || !endpoint.path) return false;
  if (method && endpoint.method && method !== endpoint.method.toUpperCase()) {
    return false;
  }

  const base = normalizePath(path);
  const endpointPath = normalizePath(endpoint.path);

  if (base === "/") return true;
  return endpointPath === base || endpointPath.startsWith(`${base}/`);
}

export function mappedDocPaths(
  mappings: RouteDocMapping[],
  endpoint: EndpointSignature,
  exists: (path: string) => boolean,
): string[] {
  const paths = mappings
    .filter((mapping) => mappingMatchesEndpoint(mapping, endpoint))
    .map((mapping) => mapping.docPath.trim())
    .filter((path) => path && exists(path));

  return Array.from(new Set(paths));
}
