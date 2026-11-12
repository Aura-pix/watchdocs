import type { Octokit } from "octokit";

const DOC_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".yaml",
  ".yml",
  ".json",
]);

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
]);

const TEST_SUFFIXES = [
  ".test.ts",
  ".test.tsx",
  ".test.js",
  ".test.jsx",
  ".spec.ts",
  ".spec.tsx",
  ".spec.js",
  ".spec.jsx",
];

const MAX_FILE_BYTES = 512 * 1024;
export const MAX_DOC_CANDIDATES = 150;

const MACHINE_TARGETS = [
  "llms.txt",
  "llms-full.txt",
  "public/llms.txt",
  "openapi.yaml",
  "openapi.yml",
  "openapi.json",
  "public/openapi.yaml",
  "public/openapi.yml",
  "public/openapi.json",
];

interface TreeEntry {
  path: string;
  sha: string;
  size: number;
}

function pathScore(filePath: string): number {
  const lower = filePath.toLowerCase();
  let score = 0;
  if (/quickstart|getting-started|getting_started|intro|guide/.test(lower)) {
    score += 3;
  }
  if (/api-reference|reference|openapi/.test(lower)) score += 2;
  if (/error|troubleshoot|failure|status/.test(lower)) score += 1;
  return score;
}

function isSkippedPath(filePath: string): boolean {
  const segments = filePath.split("/");
  return segments.some(
    (segment) =>
      SKIP_DIRECTORIES.has(segment) || segment.startsWith(".git"),
  );
}

export class RepoSnapshot {
  private constructor(
    private readonly octokit: Octokit,
    private readonly owner: string,
    private readonly repo: string,
    readonly ref: string,
    private readonly entries: Map<string, TreeEntry>,
    readonly truncated: boolean,
  ) {}

  static async load(
    octokit: Octokit,
    owner: string,
    repo: string,
    ref: string,
  ): Promise<RepoSnapshot> {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: "1",
    });

    const entries = new Map<string, TreeEntry>();
    for (const node of data.tree) {
      if (node.type !== "blob" || !node.path || !node.sha) continue;
      entries.set(node.path, {
        path: node.path,
        sha: node.sha,
        size: node.size ?? 0,
      });
    }

    return new RepoSnapshot(
      octokit,
      owner,
      repo,
      ref,
      entries,
      data.truncated ?? false,
    );
  }

  has(filePath: string): boolean {
    return this.entries.has(filePath);
  }

  paths(): string[] {
    return Array.from(this.entries.keys());
  }

  async read(filePath: string): Promise<string | null> {
    const entry = this.entries.get(filePath);
    if (!entry || entry.size > MAX_FILE_BYTES) return null;

    const { data } = await this.octokit.rest.git.getBlob({
      owner: this.owner,
      repo: this.repo,
      file_sha: entry.sha,
    });

    if (data.encoding !== "base64" || !data.content) return null;

    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  selectDocCandidates(files: string[], paths: string[]): string[] {
    const explicit = files.filter((file) => this.entries.has(file));
    if (explicit.length > 0) {
      const selected = new Set(explicit);
      for (const machineTarget of MACHINE_TARGETS) {
        if (this.entries.has(machineTarget)) selected.add(machineTarget);
      }
      return Array.from(selected).slice(0, MAX_DOC_CANDIDATES);
    }

    const roots = (paths.length > 0 ? paths : ["docs", "content", "public"]).map(
      (root) => root.replace(/\/+$/, ""),
    );

    return this.paths()
      .filter((filePath) => {
        if (isSkippedPath(filePath)) return false;
        if (!roots.some((root) => filePath.startsWith(`${root}/`))) return false;
        const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
        if (!DOC_EXTENSIONS.has(ext)) return false;
        const entry = this.entries.get(filePath);
        return Boolean(entry && entry.size <= MAX_FILE_BYTES);
      })
      .sort((a, b) => pathScore(b) - pathScore(a) || a.localeCompare(b))
      .slice(0, MAX_DOC_CANDIDATES);
  }

  findTestFiles(sourceFile: string): string[] {
    const normalized = sourceFile.replace(/\\/g, "/");
    const slash = normalized.lastIndexOf("/");
    const directory = slash === -1 ? "" : normalized.slice(0, slash);
    const basename = normalized.slice(slash + 1);
    const dot = basename.lastIndexOf(".");
    const stem = dot === -1 ? basename : basename.slice(0, dot);
    const join = (value: string) => (directory ? `${directory}/${value}` : value);

    const candidates: string[] = [];
    for (const suffix of TEST_SUFFIXES) {
      candidates.push(join(`${stem}${suffix}`));
      candidates.push(join(`__tests__/${stem}${suffix}`));
    }
    candidates.push(join(`test_${stem}.py`));
    candidates.push(join(`${stem}_test.py`));
    candidates.push(join(`${stem}_spec.rb`));
    candidates.push(`tests/${stem}.test.ts`);
    candidates.push(`test/${stem}.test.ts`);

    const found = candidates.filter((candidate) => this.entries.has(candidate));

    if (found.length === 0) {
      const testDir = join("__tests__");
      const prefix = `${testDir}/`;
      for (const candidate of this.entries.keys()) {
        if (candidate.startsWith(prefix)) {
          const name = candidate.slice(prefix.length);
          if (!name.includes("/") && name.toLowerCase().includes(stem.toLowerCase())) {
            found.push(candidate);
          }
        }
      }
    }

    return Array.from(new Set(found));
  }
}
