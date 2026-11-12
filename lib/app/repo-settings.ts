const MAX_PATHS = 50;
const MAX_PATH_LENGTH = 200;
const MAX_LABELS = 20;
const MAX_LABEL_LENGTH = 50;
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;

export {
  BRANCH_PATTERN,
  MAX_LABELS,
  MAX_LABEL_LENGTH,
  MAX_PATHS,
  MAX_PATH_LENGTH,
};

export function parseLines(value: unknown): string[] {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseLabels(value: unknown): string[] {
  return String(value ?? "")
    .split(/[\r\n,]+/)
    .map((label) => label.trim())
    .filter(Boolean);
}

export function isSafeRepoPath(value: string): boolean {
  if (!value || value.length > MAX_PATH_LENGTH) return false;
  if (value.startsWith("/") || value.startsWith("\\")) return false;
  if (value.includes("\0") || value.includes("..")) return false;
  return true;
}

export function isSafeBranch(value: string): boolean {
  if (!value || value.length > MAX_PATH_LENGTH) return false;
  if (!BRANCH_PATTERN.test(value)) return false;
  if (value.includes("..")) return false;
  if (value.startsWith("/") || value.endsWith("/")) return false;
  return true;
}
