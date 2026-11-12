import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";
import { discoverDocs } from "./discover";
import { detectContractChange, routePathFromFile } from "./detect";
import { harvestFixtures } from "./fixtures";
import {
  joinFrontmatter,
  splitFrontmatter,
  validateDocEdit,
} from "./frontmatter";
import {
  commitDocs,
  getChangedFiles,
  getCommitInfo,
  getDefaultBranch,
  getDiffForFiles,
  openOrUpdatePullRequest,
} from "./git";
import { generateDocEdits } from "./llm";
import { applyDocEdit } from "./patch";
import {
  buildPrBody,
  buildPrLabels,
  buildPrTitle,
  guessGithubLogin,
} from "./pr";
import { filterWatchedFiles } from "./glob";
import type {
  CommitInfo,
  DocCandidate,
  DocChangeSummary,
  LLMUsage,
  RunResult,
} from "./types";

export { filterWatchedFiles } from "./glob";

const EMPTY_USAGE: LLMUsage = {
  model: "",
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
};

export interface RunOptions {
  cwd?: string;
  dryRun?: boolean;
  apiKey?: string;
  model?: string;
}

function skipped(
  reason: string,
  commit: CommitInfo | null,
  changedFiles: string[],
  options: {
    endpoint?: RunResult["endpoint"];
    docChanges?: DocChangeSummary[];
    usage?: LLMUsage;
    dryRun: boolean;
  },
): RunResult {
  return {
    status: "skipped",
    reason,
    commit,
    endpoint: options.endpoint ?? { method: null, path: null, handler: null },
    changedFiles,
    docChanges: options.docChanges ?? [],
    usage: options.usage ?? EMPTY_USAGE,
    dryRun: options.dryRun,
  };
}

export async function runWatchdocs(options: RunOptions = {}): Promise<RunResult> {
  const cwd = options.cwd ?? process.cwd();
  const dryRun = options.dryRun ?? false;
  const config = loadConfig(cwd);
  const commit = getCommitInfo(cwd);
  const changedFiles = getChangedFiles(cwd, commit);
  const watched = filterWatchedFiles(changedFiles, config);

  if (watched.length === 0) {
    return skipped("No watched API files changed.", commit, changedFiles, {
      dryRun,
    });
  }

  const diff = getDiffForFiles(cwd, commit, watched);
  const check = detectContractChange(diff);

  if (!check.changed) {
    return skipped(check.reason, commit, watched, { dryRun });
  }

  const endpoint = { ...check.endpoint };
  if (!endpoint.path) {
    for (const file of watched) {
      const routePath = routePathFromFile(file);
      if (routePath) {
        endpoint.path = routePath;
        break;
      }
    }
  }

  const errorChanged = check.signals.some((signal) => signal.kind === "error");

  const ranked = discoverDocs({
    root: cwd,
    files: config.docs.files,
    paths: config.docs.paths,
    context: { endpoint, errorChanged, limit: 4 },
  });

  if (ranked.length === 0) {
    return skipped("No documentation files matched the change.", commit, watched, {
      endpoint,
      dryRun,
    });
  }

  const originals = new Map<string, string>();
  const docs: DocCandidate[] = [];

  for (const doc of ranked) {
    const absolutePath = path.join(cwd, doc.path);
    const content = fs.readFileSync(absolutePath, "utf-8");
    originals.set(doc.path, content);
    docs.push({ path: doc.path, content: splitFrontmatter(content).body });
  }

  const fixtures = harvestFixtures({ root: cwd, sourceFiles: watched });

  const result = await generateDocEdits({
    commitMessage: commit.message,
    diff,
    docs,
    fixtures,
    endpoint,
    apiKey: options.apiKey,
    model: options.model,
  });

  if (result.edits.length === 0) {
    return skipped(
      "Existing docs already match the API contract.",
      commit,
      watched,
      { endpoint, usage: result.usage, dryRun },
    );
  }

  const docChanges: DocChangeSummary[] = [];

  for (const edit of result.edits) {
    const base = docs.find((doc) => doc.path === edit.path);
    const original = originals.get(edit.path);

    if (!base || !original) {
      throw new Error(`Model edited a document that was not provided: ${edit.path}`);
    }

    const updatedBody = applyDocEdit(base.content, edit);
    const updated = joinFrontmatter(splitFrontmatter(original), updatedBody);
    const issues = validateDocEdit(original, updated);

    if (issues.length > 0) {
      throw new Error(
        `Document validation failed for ${edit.path}: ${issues.join("; ")}`,
      );
    }

    if (updated !== original) {
      docChanges.push({ path: edit.path, before: original, after: updated });
    }
  }

  if (docChanges.length === 0) {
    return skipped(
      "LLM edits produced no document changes.",
      commit,
      watched,
      { endpoint, usage: result.usage, dryRun },
    );
  }

  const baseBranch = getDefaultBranch(cwd);
  const prTitle = buildPrTitle(commit);
  const prBody = buildPrBody({
    commit,
    changedFiles: watched,
    docChanges,
    reused: false,
  });

  if (dryRun) {
    return {
      status: "planned",
      reason: "Dry run: no files were written and no PR was opened.",
      commit,
      endpoint,
      changedFiles: watched,
      docChanges,
      usage: result.usage,
      prTitle,
      prBody,
      prUrl: undefined,
      prNumber: undefined,
      dryRun,
    };
  }

  for (const change of docChanges) {
    fs.writeFileSync(path.join(cwd, change.path), change.after, "utf-8");
  }

  const branch = `${config.pr.branchPrefix}${commit.shortSha}`;
  commitDocs(
    cwd,
    branch,
    docChanges.map((change) => change.path),
    `docs: sync for API changes in ${commit.shortSha}`,
  );

  const reviewers = new Set(config.pr.reviewers);
  const authorLogin = guessGithubLogin(commit.authorEmail, commit.authorName);
  if (authorLogin && authorLogin !== "watchdocs-bot") {
    reviewers.add(authorLogin);
  }

  const pr = openOrUpdatePullRequest(cwd, {
    branch,
    base: baseBranch,
    title: prTitle,
    body: prBody,
    labels: buildPrLabels(config.pr.labels, errorChanged),
    reviewers: Array.from(reviewers),
  });

  return {
    status: "opened",
    reason: pr.reused
      ? "Updated the existing Watchdocs pull request."
      : "Opened a new Watchdocs pull request.",
    commit,
    endpoint,
    changedFiles: watched,
    docChanges,
    usage: result.usage,
    prTitle,
    prBody,
    prUrl: pr.url,
    prNumber: pr.number ?? undefined,
    dryRun,
  };
}
