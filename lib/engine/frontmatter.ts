export interface SplitDoc {
  frontmatter: string | null;
  body: string;
}

const FRONTMATTER_PATTERN = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export function splitFrontmatter(content: string): SplitDoc {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return { frontmatter: null, body: content };

  const frontmatter = match[0];
  return {
    frontmatter,
    body: content.slice(frontmatter.length),
  };
}

export function joinFrontmatter(split: SplitDoc, body: string): string {
  if (!split.frontmatter) return body;
  const separator = split.frontmatter.endsWith("\n") ? "" : "\n";
  return `${split.frontmatter}${separator}${body}`;
}

export function extractHeadings(body: string): string[] {
  const headings: string[] = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (match) headings.push(`${match[1]} ${match[2]}`);
  }

  return headings;
}

function countFences(content: string): number {
  return (content.match(/^\s*(?:```|~~~)/gm) ?? []).length;
}

export function validateDocEdit(
  originalContent: string,
  updatedContent: string,
): string[] {
  const issues: string[] = [];

  if (!updatedContent.trim()) {
    return ["updated document is empty"];
  }

  const original = splitFrontmatter(originalContent);
  const updated = splitFrontmatter(updatedContent);

  if (original.frontmatter) {
    if (!updated.frontmatter) {
      issues.push("frontmatter was removed");
    } else if (updated.frontmatter !== original.frontmatter) {
      issues.push("frontmatter was modified");
    }
  }

  const originalHeadings = extractHeadings(original.body);
  const updatedBody = updated.body;
  const missing = originalHeadings.filter(
    (heading) => !updatedBody.includes(heading),
  );
  if (missing.length > 0) {
    issues.push(`missing headings: ${missing.join(", ")}`);
  }

  if (
    originalContent.length > 400 &&
    updatedContent.length < originalContent.length * 0.5
  ) {
    issues.push(
      `document shrank from ${originalContent.length} to ${updatedContent.length} characters`,
    );
  }

  if (countFences(updatedContent) % 2 !== 0) {
    issues.push("unbalanced code fences");
  }

  return issues;
}
