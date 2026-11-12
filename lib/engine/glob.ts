import type { WatchdocsConfig } from "./types";

function expandBraces(pattern: string): string[] {
  const start = pattern.indexOf("{");
  if (start === -1) return [pattern];

  const end = pattern.indexOf("}", start);
  if (end === -1) return [pattern];

  const before = pattern.slice(0, start);
  const after = pattern.slice(end + 1);
  const options = pattern.slice(start + 1, end).split(",");

  return options.flatMap((option) => expandBraces(`${before}${option}${after}`));
}

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function globToRegExpSource(glob: string): string {
  const normalized = glob.replace(/\\/g, "/").replace(/^\.\//, "");
  let source = "";
  let index = 0;

  while (index < normalized.length) {
    const char = normalized[index];

    if (char === "*") {
      const isDoubleStar = normalized[index + 1] === "*";
      if (isDoubleStar) {
        const next = normalized[index + 2];
        if (next === "/") {
          source += "(?:.*/)?";
          index += 3;
        } else {
          source += ".*";
          index += 2;
        }
      } else {
        source += "[^/]*";
        index += 1;
      }
      continue;
    }

    if (char === "?") {
      source += "[^/]";
      index += 1;
      continue;
    }

    source += escapeRegex(char);
    index += 1;
  }

  return `^${source}$`;
}

export function globToRegExp(glob: string): RegExp {
  const alternatives = expandBraces(glob);
  const sources = alternatives.map(globToRegExpSource);
  return new RegExp(`(?:${sources.join("|")})`);
}

export function matchesGlob(file: string, glob: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return globToRegExp(glob).test(normalized);
}

export function matchesAny(file: string, globs: string[] | undefined): boolean {
  if (!globs || globs.length === 0) return false;
  return globs.some((glob) => matchesGlob(file, glob));
}

export function filterWatchedFiles(
  changedFiles: string[],
  config: WatchdocsConfig,
): string[] {
  return changedFiles
    .map((file) => file.replace(/\\/g, "/"))
    .filter((file) => !matchesAny(file, config.watch.ignore))
    .filter((file) => matchesAny(file, config.watch.routes));
}
