import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface DocMeta {
  slug: string[];
  title: string;
  description?: string;
  order?: number;
}

export interface DocEntry {
  meta: DocMeta;
  body: string;
}

export interface PageEntry {
  meta: Pick<DocMeta, "title" | "description">;
  body: string;
}

function parseFrontmatter(source: string): {
  data: Record<string, string>;
  body: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { data: {}, body: source };
  }

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const index = line.indexOf(":");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    data[key] = value;
  }

  return { data, body: match[2].trim() };
}

function toSlug(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\.mdx?$/, "");
  return normalized.split("/").filter(Boolean);
}

export function listDocs(): DocEntry[] {
  const dir = path.join(CONTENT_DIR, "docs");

  if (!fs.existsSync(dir)) return [];

  const entries: DocEntry[] = [];

  const walk = (current: string) => {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      if (!/\.mdx?$/.test(name)) continue;

      const raw = fs.readFileSync(full, "utf-8");
      const { data, body } = parseFrontmatter(raw);
      const slug = toSlug(path.relative(dir, full));

      entries.push({
        meta: {
          slug,
          title: data.title ?? slug.join(" / "),
          description: data.description,
          order: data.order ? Number(data.order) : undefined,
        },
        body,
      });
    }
  };

  walk(dir);

  return entries.sort((a, b) => {
    const orderA = a.meta.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.meta.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.meta.title.localeCompare(b.meta.title);
  });
}

export function getDocBySlug(slug: string[]): DocEntry | null {
  return listDocs().find(
    (doc) =>
      doc.meta.slug.length === slug.length &&
      doc.meta.slug.every((part, index) => part === slug[index]),
  ) ?? null;
}

export function getPage(slug: string): PageEntry | null {
  const file = path.join(CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  const { data, body } = parseFrontmatter(raw);

  return {
    meta: { title: data.title ?? slug, description: data.description },
    body,
  };
}
