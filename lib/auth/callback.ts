const BASE = "http://watchdocs.invalid";

export function safeCallbackUrl(
  value: unknown,
  fallback = "/app",
): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.length > 2048) return fallback;

  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
