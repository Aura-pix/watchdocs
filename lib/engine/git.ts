import { execFileSync } from "node:child_process";
import type { CommitInfo } from "./types";

export interface PrResult {
  url: string;
  number: number | null;
  reused: boolean;
}

function git(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: Buffer | string }).stderr)
        : "";
    throw new Error(`git ${args.join(" ")} failed: ${stderr || String(error)}`);
  }
}

function gh(args: string[], cwd: string): string {
  try {
    return execFileSync("gh", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: Buffer | string }).stderr)
        : "";
    throw new Error(`gh ${args.join(" ")} failed: ${stderr || String(error)}`);
  }
}

export function getCommitInfo(cwd: string): CommitInfo {
  const revLine = git(["rev-list", "--parents", "-n", "1", "HEAD"], cwd);
  const [sha, parent = null] = revLine.split(/\s+/);

  return {
    sha,
    shortSha: git(["rev-parse", "--short", "HEAD"], cwd),
    parent,
    message: git(["log", "-1", "--pretty=%B"], cwd),
    authorName: git(["log", "-1", "--pretty=%an"], cwd),
    authorEmail: git(["log", "-1", "--pretty=%ae"], cwd),
  };
}

export function getChangedFiles(cwd: string, commit: CommitInfo): string[] {
  const args = commit.parent
    ? ["diff", "--name-only", commit.parent, "HEAD"]
    : ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD"];

  return git(args, cwd)
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

export function getDiffForFiles(
  cwd: string,
  commit: CommitInfo,
  files: string[],
): string {
  if (files.length === 0) return "";

  const args = commit.parent
    ? ["diff", commit.parent, "HEAD", "--", ...files]
    : ["diff-tree", "--root", "--no-commit-id", "-p", "HEAD", "--", ...files];

  return git(args, cwd);
}

export function getDefaultBranch(cwd: string): string {
  try {
    return git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], cwd)
      .replace(/^origin\//, "")
      .trim();
  } catch {
    return "main";
  }
}

export function commitDocs(
  cwd: string,
  branch: string,
  files: string[],
  message: string,
): void {
  git(["config", "user.name", "watchdocs-bot[bot]"], cwd);
  git(
    ["config", "user.email", "watchdocs-bot[bot]@users.noreply.github.com"],
    cwd,
  );
  git(["checkout", "-B", branch], cwd);
  git(["add", "--", ...files], cwd);
  git(["commit", "-m", message], cwd);
  git(["push", "origin", branch, "--force"], cwd);
}

export function openOrUpdatePullRequest(
  cwd: string,
  options: {
    branch: string;
    base: string;
    title: string;
    body: string;
    labels: string[];
    reviewers: string[];
  },
): PrResult {
  let existing: { number: number; url: string; state: string }[] = [];

  try {
    const raw = gh(
      [
        "pr",
        "list",
        "--head",
        options.branch,
        "--state",
        "open",
        "--json",
        "number,url,state",
      ],
      cwd,
    );
    existing = raw ? JSON.parse(raw) : [];
  } catch {
    existing = [];
  }

  if (existing.length > 0) {
    const pr = existing[0];
    if (options.labels.length > 0) {
      gh(["pr", "edit", String(pr.number), ...options.labels.flatMap((l) => ["--add-label", l])], cwd);
    }
    return { url: pr.url, number: pr.number, reused: true };
  }

  const args = [
    "pr",
    "create",
    "--title",
    options.title,
    "--body",
    options.body,
    "--head",
    options.branch,
    "--base",
    options.base,
  ];

  for (const label of options.labels) {
    args.push("--label", label);
  }
  for (const reviewer of options.reviewers) {
    args.push("--reviewer", reviewer);
  }

  const url = gh(args, cwd);
  const number = Number(url.split("/").pop()) || null;
  return { url, number, reused: false };
}
