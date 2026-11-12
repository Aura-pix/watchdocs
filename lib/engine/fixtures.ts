import fs from "node:fs";
import path from "node:path";
import { extractFixtures, MAX_FIXTURES } from "./fixtures-core";
import type { Fixture } from "./types";

export { extractFixtures } from "./fixtures-core";

const TEST_EXTENSIONS = [
  ".test.ts",
  ".test.tsx",
  ".test.js",
  ".test.jsx",
  ".spec.ts",
  ".spec.tsx",
  ".spec.js",
  ".spec.jsx",
];

function existsFile(root: string, relativePath: string): boolean {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
}

export function findTestFiles(root: string, sourceFile: string): string[] {
  const normalized = sourceFile.replace(/\\/g, "/");
  const directory = path.posix.dirname(normalized);
  const extension = path.posix.extname(normalized);
  const base = path.posix.basename(normalized, extension);

  const candidates: string[] = [];

  for (const testExtension of TEST_EXTENSIONS) {
    candidates.push(path.posix.join(directory, `${base}${testExtension}`));
    candidates.push(
      path.posix.join(directory, "__tests__", `${base}${testExtension}`),
    );
  }

  candidates.push(path.posix.join(directory, `test_${base}.py`));
  candidates.push(path.posix.join(directory, `${base}_test.py`));
  candidates.push(path.posix.join(directory, `${base}_spec.rb`));
  candidates.push(path.posix.join(path.posix.dirname(directory), "tests", `${base}.test.ts`));
  candidates.push(path.posix.join("tests", `${base}.test.ts`));
  candidates.push(path.posix.join("test", `${base}.test.ts`));

  const found = candidates.filter((candidate) => existsFile(root, candidate));

  if (found.length === 0) {
    const testDir = path.posix.join(directory, "__tests__");
    const absoluteTestDir = path.join(root, testDir);
    if (fs.existsSync(absoluteTestDir)) {
      for (const entry of fs.readdirSync(absoluteTestDir)) {
        if (entry.toLowerCase().includes(base.toLowerCase())) {
          found.push(path.posix.join(testDir, entry));
        }
      }
    }
  }

  return Array.from(new Set(found));
}

export function harvestFixtures(options: {
  root: string;
  sourceFiles: string[];
}): Fixture[] {
  const { root, sourceFiles } = options;
  const fixtures: Fixture[] = [];
  const visited = new Set<string>();

  for (const sourceFile of sourceFiles) {
    for (const testFile of findTestFiles(root, sourceFile)) {
      if (visited.has(testFile)) continue;
      visited.add(testFile);

      try {
        const content = fs.readFileSync(path.join(root, testFile), "utf-8");
        fixtures.push(...extractFixtures(testFile, content));
      } catch {
        continue;
      }

      if (fixtures.length >= MAX_FIXTURES) {
        return fixtures.slice(0, MAX_FIXTURES);
      }
    }
  }

  return fixtures.slice(0, MAX_FIXTURES);
}
