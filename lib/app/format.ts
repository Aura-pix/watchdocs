export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCost(value: string | number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.0000";
  return `$${amount.toFixed(4)}`;
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function formatTokens(input: number, output: number): string {
  return `${input.toLocaleString()} in / ${output.toLocaleString()} out`;
}
