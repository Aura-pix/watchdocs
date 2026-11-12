export function addedLines(before: string, after: string): string[] {
  const counts = new Map<string, number>();
  for (const line of before.split("\n")) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const added: string[] = [];
  for (const line of after.split("\n")) {
    const remaining = counts.get(line) ?? 0;
    if (remaining > 0) {
      counts.set(line, remaining - 1);
    } else {
      added.push(line);
    }
  }

  return added;
}

export function validateGroundedStatuses(
  before: string,
  after: string,
  sourceText: string,
): string[] {
  const codes = new Set<string>();

  for (const line of addedLines(before, after)) {
    for (const match of line.matchAll(/\b([45]\d\d)\b/g)) {
      codes.add(match[1]);
    }
  }

  const issues: string[] = [];
  for (const code of codes) {
    if (!new RegExp(`\\b${code}\\b`).test(sourceText)) {
      issues.push(`status ${code} is not present in the diff, spec, or fixtures`);
    }
  }

  return issues.slice(0, 5);
}
