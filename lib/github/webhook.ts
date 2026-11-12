import { createHmac, timingSafeEqual } from "node:crypto";

export interface GitHubUser {
  id: number;
  login: string;
  type?: string;
}

export interface GitHubRepositoryRef {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  owner: { login: string };
}

export interface GitHubCommitRef {
  id: string;
  message: string;
  author: { name: string; email: string; username?: string | null };
}

export interface GitHubInstallationRef {
  id: number;
  account?: {
    login?: string;
    type?: string;
  };
}

export interface PushWebhookPayload {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  head_commit: GitHubCommitRef | null;
  repository: GitHubRepositoryRef;
  installation?: GitHubInstallationRef;
  sender: GitHubUser;
}

export interface InstallationWebhookPayload {
  action: string;
  installation: GitHubInstallationRef;
  sender: GitHubUser;
}

export interface InstallationRepositoriesWebhookPayload {
  action: string;
  installation: GitHubInstallationRef;
  sender: GitHubUser;
  repositories_added?: Array<{ id: number; full_name: string }>;
  repositories_removed?: Array<{ id: number; full_name: string }>;
}

export interface PullRequestWebhookPayload {
  action: string;
  number: number;
  pull_request: {
    number: number;
    merged: boolean;
    head: { ref: string };
  };
  repository: GitHubRepositoryRef;
  installation?: GitHubInstallationRef;
}

export function verifyGitHubSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret)
    .update(rawBody, "utf-8")
    .digest("hex")}`;
  const provided = signature.trim();
  const expectedBuffer = Buffer.from(expected, "utf-8");
  const providedBuffer = Buffer.from(provided, "utf-8");

  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function isBotSender(sender: GitHubUser): boolean {
  return sender.type === "Bot" || /\[bot\]$/i.test(sender.login);
}

export function isWatchdocsBranch(ref: string): boolean {
  return ref.startsWith("refs/heads/watchdocs/");
}

export function isDefaultBranchPush(
  ref: string,
  defaultBranch: string,
): boolean {
  return ref === `refs/heads/${defaultBranch}`;
}

export interface CompareFile {
  filename: string;
  status: string;
  patch?: string;
  previous_filename?: string;
}

export function buildUnifiedDiff(files: CompareFile[]): string {
  const chunks: string[] = [];

  for (const file of files) {
    const name = file.filename.replace(/\\/g, "/");
    if (!file.patch) continue;

    chunks.push(`diff --git a/${name} b/${name}`);
    if (file.status === "added") {
      chunks.push("--- /dev/null");
      chunks.push(`+++ b/${name}`);
    } else if (file.status === "removed") {
      chunks.push(`--- a/${name}`);
      chunks.push("+++ /dev/null");
    } else {
      chunks.push(`--- a/${name}`);
      chunks.push(`+++ b/${name}`);
    }
    chunks.push(file.patch);
  }

  return chunks.join("\n");
}
