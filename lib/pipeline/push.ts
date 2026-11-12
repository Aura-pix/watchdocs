import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { installations, docMappings, repos } from "@/lib/db/schema";
import { DEFAULT_CONFIG, normalizeConfig } from "@/lib/engine/config";
import { detectContractChange, routePathFromFile } from "@/lib/engine/detect";
import { rankDocs } from "@/lib/engine/rank";
import { extractFixtures } from "@/lib/engine/fixtures-core";
import {
  joinFrontmatter,
  splitFrontmatter,
  validateDocEdit,
} from "@/lib/engine/frontmatter";
import { filterWatchedFiles } from "@/lib/engine/glob";
import { generateDocEdits } from "@/lib/engine/llm";
import { applyDocEdit } from "@/lib/engine/patch";
import {
  buildPrLabels,
  buildPrTitle,
  guessGithubLogin,
} from "@/lib/engine/pr";
import { validateGroundedStatuses } from "@/lib/engine/validation";
import type {
  CommitInfo,
  DocCandidate,
  DocChangeSummary,
  EndpointSignature,
  Fixture,
  LLMUsage,
  WatchdocsConfig,
} from "@/lib/engine/types";
import {
  createRun,
  findRunByDelivery,
  finishRun,
  recordUsageOnce,
  resetRun,
} from "@/lib/app/runs";
import { getApp } from "@/lib/github/app";
import { commitAndOpenPullRequest } from "@/lib/github/pull-requests";
import { RepoSnapshot } from "@/lib/github/repo-snapshot";
import { checkInstallationLimits } from "@/lib/billing/limits";
import { applyRepoOverrides } from "@/lib/pipeline/config";
import { isTransientError } from "@/lib/pipeline/errors";
import { mappedDocPaths } from "@/lib/pipeline/mappings";
import {
  buildUnifiedDiff,
  isDefaultBranchPush,
  type CompareFile,
} from "@/lib/github/webhook";

const MAX_FIXTURES = 6;
const MAX_CONCURRENT_READS = 6;

export interface PushPipelineInput {
  deliveryId: string;
  repoId: string;
  installationId: number;
  before: string;
  after: string;
  ref: string;
  commitMessage: string;
  authorName: string;
  authorEmail: string;
  authorLogin?: string | null;
  senderLogin: string;
}

export interface PushPipelineResult {
  status: "ignored" | "skipped" | "failed" | "opened";
  runId?: string;
  reason?: string;
  prUrl?: string;
  prNumber?: number;
}

interface PipelineOutcome {
  status: "skipped" | "opened";
  reason?: string;
  usage?: LLMUsage | null;
  prUrl?: string;
  prNumber?: number;
  endpoint: EndpointSignature;
  changedFiles: string[];
  docChanges?: DocChangeSummary[];
  diff?: string;
}

const EMPTY_ENDPOINT: EndpointSignature = {
  method: null,
  path: null,
  handler: null,
};

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

async function loadConfig(
  snapshot: RepoSnapshot,
  repo: typeof repos.$inferSelect,
): Promise<WatchdocsConfig> {
  const raw = await snapshot.read(".watchdocsrc.json");
  const config = raw ? normalizeConfig(JSON.parse(raw)) : DEFAULT_CONFIG;
  return applyRepoOverrides(config, repo);
}

async function readDocs(
  snapshot: RepoSnapshot,
  paths: string[],
): Promise<{ originals: Map<string, string>; docs: DocCandidate[] }> {
  const originals = new Map<string, string>();
  const docs: DocCandidate[] = [];

  const contents = await mapLimit(paths, MAX_CONCURRENT_READS, (file) =>
    snapshot.read(file),
  );

  contents.forEach((content, index) => {
    if (content === null) return;
    const file = paths[index];
    originals.set(file, content);
    docs.push({ path: file, content: splitFrontmatter(content).body });
  });

  return { originals, docs };
}

async function harvestRemoteFixtures(
  snapshot: RepoSnapshot,
  sourceFiles: string[],
): Promise<Fixture[]> {
  const fixtures: Fixture[] = [];
  const visited = new Set<string>();

  for (const sourceFile of sourceFiles) {
    for (const testFile of snapshot.findTestFiles(sourceFile)) {
      if (visited.has(testFile) || fixtures.length >= MAX_FIXTURES) continue;
      visited.add(testFile);
      const content = await snapshot.read(testFile);
      if (content === null) continue;
      fixtures.push(...extractFixtures(testFile, content));
      if (fixtures.length >= MAX_FIXTURES) break;
    }
    if (fixtures.length >= MAX_FIXTURES) break;
  }

  return fixtures.slice(0, MAX_FIXTURES);
}

async function loadSpecText(snapshot: RepoSnapshot): Promise<string> {
  const targets = [
    "openapi.yaml",
    "openapi.yml",
    "openapi.json",
    "public/openapi.yaml",
    "public/openapi.yml",
    "public/openapi.json",
    "llms.txt",
    "llms-full.txt",
  ];

  const texts: string[] = [];
  for (const target of targets) {
    if (!snapshot.has(target)) continue;
    const content = await snapshot.read(target);
    if (content) texts.push(content);
  }

  return texts.join("\n").slice(0, 48_000);
}

async function executePipeline(
  input: PushPipelineInput,
  repo: typeof repos.$inferSelect,
): Promise<PipelineOutcome> {
  if (!input.before || /^0+$/.test(input.before)) {
    return {
      status: "skipped",
      reason: "No previous commit to compare.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: [],
    };
  }

  if (!input.after) {
    return {
      status: "skipped",
      reason: "Push did not include a head commit.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: [],
    };
  }

  if (input.ref.startsWith("refs/heads/watchdocs/")) {
    return {
      status: "skipped",
      reason: "Watchdocs branch push.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: [],
    };
  }

  if (!isDefaultBranchPush(input.ref, repo.defaultBranch)) {
    return {
      status: "skipped",
      reason: "Push is not to the default branch.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: [],
    };
  }

  const [owner, name] = repo.fullName.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid repository name: ${repo.fullName}`);
  }

  const app = getApp();
  const octokit = await app.getInstallationOctokit(input.installationId);
  const snapshot = await RepoSnapshot.load(octokit, owner, name, input.after);

  if (snapshot.truncated) {
    throw new Error(
      "GitHub truncated the repository tree. The repository is too large to analyze safely.",
    );
  }

  const config = await loadConfig(snapshot, repo);
  const { data: compare } = await octokit.rest.repos.compareCommitsWithBasehead(
    {
      owner,
      repo: name,
      basehead: `${input.before}...${input.after}`,
    },
  );

  const compareFiles: CompareFile[] = (compare.files ?? [])
    .filter((file): file is typeof file & { filename: string } =>
      Boolean(file.filename),
    )
    .map((file) => ({
      filename: file.filename,
      status: file.status,
      patch: file.patch,
      previous_filename: file.previous_filename,
    }));

  if (compareFiles.length >= 300) {
    throw new Error(
      "The push changed 300 or more files. Watchdocs will not analyze a push this large.",
    );
  }

  if (compareFiles.length === 0) {
    return {
      status: "skipped",
      reason: "No changed files in the push.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: [],
    };
  }

  const byName = new Map(compareFiles.map((file) => [file.filename, file]));
  const watched = filterWatchedFiles(
    compareFiles.map((file) => file.filename),
    config,
  );

  if (watched.length === 0) {
    return {
      status: "skipped",
      reason: "No watched API files changed.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: compareFiles.map((file) => file.filename),
    };
  }

  const watchedFiles = watched
    .map((file) => byName.get(file))
    .filter((file): file is CompareFile => Boolean(file));
  const diff = buildUnifiedDiff(watchedFiles);

  if (!diff.trim()) {
    return {
      status: "skipped",
      reason: "No textual diff available for the watched files.",
      endpoint: EMPTY_ENDPOINT,
      changedFiles: watched,
    };
  }

  const check = detectContractChange(diff);
  if (!check.changed) {
    return {
      status: "skipped",
      reason: check.reason,
      endpoint: check.endpoint,
      changedFiles: watched,
      diff,
    };
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

  const mappingRows = await getDb()
    .select({
      routePattern: docMappings.routePattern,
      docPath: docMappings.docPath,
    })
    .from(docMappings)
    .where(eq(docMappings.repoId, repo.id));

  const mappedPaths = mappedDocPaths(
    mappingRows,
    endpoint,
    (file) => snapshot.has(file),
  );
  const baseCandidates = snapshot.selectDocCandidates(
    config.docs.files ?? [],
    config.docs.paths ?? [],
  );
  const candidatePaths = Array.from(
    new Set([...mappedPaths, ...baseCandidates]),
  );

  if (candidatePaths.length === 0) {
    return {
      status: "skipped",
      reason: "No documentation files matched.",
      endpoint,
      changedFiles: watched,
      diff,
    };
  }

  const { originals, docs } = await readDocs(snapshot, candidatePaths);
  if (docs.length === 0) {
    return {
      status: "skipped",
      reason: "No readable documentation files.",
      endpoint,
      changedFiles: watched,
      diff,
    };
  }

  const ranked = rankDocs(docs, {
    endpoint,
    errorChanged,
    limit: 4,
  });

  const rankedDocs = ranked
    .map((doc) => docs.find((candidate) => candidate.path === doc.path))
    .filter((doc): doc is DocCandidate => Boolean(doc));

  const mappedDocs = mappedPaths
    .map((path) => docs.find((candidate) => candidate.path === path))
    .filter((doc): doc is DocCandidate => Boolean(doc));

  const finalDocs = [
    ...mappedDocs,
    ...rankedDocs.filter(
      (doc) => !mappedDocs.some((mapped) => mapped.path === doc.path),
    ),
  ].slice(0, 6);

  if (finalDocs.length === 0) {
    return {
      status: "skipped",
      reason: "No documentation files matched the change.",
      endpoint,
      changedFiles: watched,
      diff,
    };
  }

  const fixtures = await harvestRemoteFixtures(snapshot, watched);
  const specText = await loadSpecText(snapshot);

  const result = await generateDocEdits({
    commitMessage: input.commitMessage,
    diff,
    docs: finalDocs,
    fixtures,
    endpoint,
  });

  if (result.edits.length === 0) {
    return {
      status: "skipped",
      reason: "Existing docs already match the API contract.",
      usage: result.usage,
      endpoint,
      changedFiles: watched,
      diff,
    };
  }

  const docChanges: DocChangeSummary[] = [];
  const sourceText = [diff, specText, ...fixtures.map((f) => f.snippet)].join(
    "\n",
  );

  for (const edit of result.edits) {
    const base = finalDocs.find((doc) => doc.path === edit.path);
    const original = originals.get(edit.path);

    if (!base || !original) {
      throw new Error(
        `Model edited a document that was not provided: ${edit.path}`,
      );
    }

    const updatedBody = applyDocEdit(base.content, edit);
    const updated = joinFrontmatter(splitFrontmatter(original), updatedBody);
    const issues = [
      ...validateDocEdit(original, updated),
      ...validateGroundedStatuses(original, updated, sourceText),
    ];

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
    return {
      status: "skipped",
      reason: "LLM edits produced no document changes.",
      usage: result.usage,
      endpoint,
      changedFiles: watched,
      diff,
    };
  }

  const commit: CommitInfo = {
    sha: input.after,
    shortSha: shortSha(input.after),
    parent: input.before,
    message: input.commitMessage || "API change",
    authorName: input.authorName || "unknown",
    authorEmail: input.authorEmail || "unknown",
  };

  const reviewers = new Set(config.pr.reviewers);
  const guessed =
    input.authorLogin ??
    guessGithubLogin(commit.authorEmail, commit.authorName);
  if (guessed && guessed !== "watchdocs-bot") reviewers.add(guessed);

  const branch = `${config.pr.branchPrefix}${commit.shortSha}`;

  const pr = await commitAndOpenPullRequest({
    octokit,
    owner,
    repo: name,
    baseSha: input.after,
    baseBranch: repo.defaultBranch,
    branch,
    commit,
    changedFiles: watched,
    docChanges,
    title: buildPrTitle(commit),
    labels: buildPrLabels(config.pr.labels, errorChanged),
    reviewers: Array.from(reviewers),
  });

  return {
    status: "opened",
    prUrl: pr.url,
    prNumber: pr.number,
    usage: result.usage,
    endpoint,
    changedFiles: watched,
    docChanges,
    diff,
  };
}

export async function runPushPipeline(
  input: PushPipelineInput,
): Promise<PushPipelineResult> {
  const db = getDb();
  const [row] = await db
    .select({ repo: repos, installation: installations })
    .from(repos)
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(eq(repos.id, input.repoId))
    .limit(1);

  if (!row) {
    return { status: "ignored", reason: "Repository is not connected." };
  }

  if (!row.repo.enabled) {
    return { status: "ignored", reason: "Repository is paused." };
  }

  if (row.installation.status !== "active") {
    return { status: "ignored", reason: "Installation is not active." };
  }

  if (
    row.installation.githubInstallationId !== String(input.installationId)
  ) {
    return { status: "ignored", reason: "Installation does not match." };
  }

  const deliveryId = input.deliveryId?.trim();
  let runId: string;

  if (deliveryId) {
    const existing = await findRunByDelivery(deliveryId);

    if (existing) {
      if (
        existing.status === "opened" ||
        existing.status === "skipped" ||
        existing.status === "merged" ||
        existing.status === "closed"
      ) {
        return {
          status: existing.status === "skipped" ? "skipped" : "opened",
          runId: existing.id,
          reason:
            existing.status === "skipped"
              ? existing.skipReason ?? "Already processed."
              : undefined,
          prUrl: existing.prUrl ?? undefined,
          prNumber: existing.prNumber ?? undefined,
        };
      }

      runId = existing.id;
      await resetRun(runId);
    } else {
      runId = await createRun({
        repoId: row.repo.id,
        commitSha: input.after,
        webhookDeliveryId: deliveryId,
      });
    }
  } else {
    runId = await createRun({
      repoId: row.repo.id,
      commitSha: input.after,
    });
  }

  try {
    const gate = await checkInstallationLimits(row.installation.id);

    if (!gate.ok) {
      await finishRun(runId, {
        status: "skipped",
        skipReason: gate.reason,
      });

      return {
        status: "skipped",
        runId,
        reason: gate.reason,
      };
    }

    const result = await executePipeline(input, row.repo);

    if (result.status === "skipped") {
      await finishRun(runId, {
        status: "skipped",
        skipReason: result.reason,
        usage: result.usage ?? null,
        endpoint: result.endpoint,
        changedFiles: result.changedFiles,
        docChanges: result.docChanges,
        diff: result.diff,
      });

      return {
        status: "skipped",
        runId,
        reason: result.reason,
      };
    }

    await finishRun(runId, {
      status: "opened",
      usage: result.usage,
      prNumber: result.prNumber,
      prUrl: result.prUrl,
      endpoint: result.endpoint,
      changedFiles: result.changedFiles,
      docChanges: result.docChanges,
      diff: result.diff,
    });

    await recordUsageOnce({
      runId,
      installationId: row.installation.id,
      prCount: 1,
      costUsd: result.usage?.costUsd ?? 0,
    }).catch((error) => {
      console.error("Could not record Watchdocs usage:", error);
    });

    return {
      status: "opened",
      runId,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
    };
  } catch (error) {
    const message = errorMessage(error);
    console.error("Watchdocs push pipeline failed:", error);
    await finishRun(runId, {
      status: "failed",
      error: message,
    });

    if (isTransientError(error)) {
      throw error;
    }

    return {
      status: "failed",
      runId,
      reason: message,
    };
  }
}
