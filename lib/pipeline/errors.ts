const TRANSIENT_PATTERN =
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|fetch failed|tunneling socket|EPIPE/i;

export function isTransientError(error: unknown): boolean {
  if (error instanceof Error && TRANSIENT_PATTERN.test(error.message)) {
    return true;
  }

  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") {
    return status === 429 || (status >= 500 && status <= 599);
  }

  return false;
}
