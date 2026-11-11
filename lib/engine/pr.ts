import type { CommitInfo, DocChangeSummary } from "./types";

function countLines(value: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of value.split("\n")) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

export function lineDelta(before: string, after: string): {
  added: number;
  removed: number;
} {
  const beforeCounts = countLines(before);
  const afterCounts = countLines(after);
  let added = 0;
  let removed = 0;

  for (const [line, count] of afterCounts) {
    const previous = beforeCounts.get(line) ?? 0;
    if (count > previous) added += count - previous;
  }

  for (const [line, count] of beforeCounts) {
    const next = afterCounts.get(line) ?? 0;
    if (count > next) removed += count - next;
  }

  return { added, removed };
}

export function guessGithubLogin(
  authorEmail: string,
  authorName: string,
): string | null {
  const noreply = authorEmail.match(
    /^(?:\d+\+)?([A-Za-z0-9-]+)@users\.noreply\.github\.com$/i,
  );
  if (noreply) return noreply[1];

  if (/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(authorName)) {
    return authorName;
  }

  return null;
}

export function buildPrTitle(commit: CommitInfo): string {
  return `docs: sync for API changes in ${commit.shortSha}`;
}

export function buildPrBody(options: {
  commit: CommitInfo;
  changedFiles: string[];
  docChanges: DocChangeSummary[];
  reused: boolean;
}): string {
  const { commit, changedFiles, docChanges } = options;

  const changeList = docChanges
    .map((change) => {
      const delta = lineDelta(change.before, change.after);
      return `- \`${change.path}\` (+${delta.added} / -${delta.removed})`;
    })
    .join("\n");

  const fileChecklist = docChanges
    .map((change) => `- [x] \`${change.path}\``)
    .join("\n");

  const sourceList = changedFiles.map((file) => `- \`${file}\``).join("\n");

  return `## Why this PR exists

Commit \`${commit.shortSha}\` by ${commit.authorName} changed the public API contract:

${sourceList}

## Changes

${changeList || "- No document changes were produced."}

## Files modified

${fileChecklist || "- None"}

## Safety

No auto-merge. Review the diff, verify the examples against the code, and merge when you are satisfied.`;
}

export function buildPrLabels(baseLabels: string[], hasErrors: boolean): string[] {
  const labels = new Set(baseLabels);
  labels.add("documentation");
  if (hasErrors) labels.add("errors");
  return Array.from(labels);
}
