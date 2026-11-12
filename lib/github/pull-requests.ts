import type { Octokit } from "octokit";
import type { CommitInfo, DocChangeSummary } from "@/lib/engine/types";
import { buildPrBody } from "@/lib/engine/pr";

export interface OpenPullRequestInput {
  octokit: Octokit;
  owner: string;
  repo: string;
  baseSha: string;
  baseBranch: string;
  branch: string;
  commit: CommitInfo;
  changedFiles: string[];
  docChanges: DocChangeSummary[];
  title: string;
  labels: string[];
  reviewers: string[];
}

export interface OpenPullRequestResult {
  url: string;
  number: number;
  reused: boolean;
}

async function findBranchHead(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    return data.object.sha;
  } catch {
    return null;
  }
}

export async function commitAndOpenPullRequest(
  input: OpenPullRequestInput,
): Promise<OpenPullRequestResult> {
  const { octokit, owner, repo, branch } = input;

  const { data: openPrs } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:${branch}`,
    per_page: 1,
  });
  const existingPr = openPrs[0];
  const branchHead = await findBranchHead(octokit, owner, repo, branch);
  const parentSha = branchHead ?? input.baseSha;

  const { data: parentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });

  const tree = [];
  for (const change of input.docChanges) {
    const { data: blob } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: change.after,
      encoding: "utf-8",
    });
    tree.push({
      path: change.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blob.sha,
    });
  }

  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.tree.sha,
    tree,
  });

  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: `docs: sync for API changes in ${input.commit.shortSha}`,
    tree: newTree.sha,
    parents: [parentSha],
  });

  if (branchHead) {
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
      force: true,
    });
  } else {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: newCommit.sha,
    });
  }

  const body = buildPrBody({
    commit: input.commit,
    changedFiles: input.changedFiles,
    docChanges: input.docChanges,
    reused: Boolean(existingPr),
  });

  let prNumber: number;
  let prUrl: string;
  if (existingPr) {
    const { data } = await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: existingPr.number,
      title: input.title,
      body,
    });
    prNumber = data.number;
    prUrl = data.html_url;
  } else {
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: input.title,
      body,
      head: branch,
      base: input.baseBranch,
    });
    prNumber = data.number;
    prUrl = data.html_url;
  }

  if (input.labels.length > 0) {
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: input.labels,
      });
    } catch (error) {
      console.warn("Could not add Watchdocs PR labels:", error);
    }
  }

  if (input.reviewers.length > 0) {
    try {
      await octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: prNumber,
        reviewers: input.reviewers,
      });
    } catch (error) {
      console.warn("Could not request Watchdocs PR reviewers:", error);
    }
  }

  return {
    url: prUrl,
    number: prNumber,
    reused: Boolean(existingPr),
  };
}
