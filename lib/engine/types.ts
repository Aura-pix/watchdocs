export interface WatchdocsConfig {
  $schema?: string;
  version: number;
  watch: {
    routes: string[];
    ignore: string[];
  };
  docs: {
    files?: string[];
    paths?: string[];
  };
  pr: {
    branchPrefix: string;
    labels: string[];
    reviewers: string[];
  };
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  parent: string | null;
  message: string;
  authorName: string;
  authorEmail: string;
}

export type ContractSignalKind =
  | "route"
  | "method"
  | "request"
  | "schema"
  | "error";

export interface ContractSignal {
  kind: ContractSignalKind;
  file: string;
  detail: string;
  line: string;
}

export interface EndpointSignature {
  method: string | null;
  path: string | null;
  handler: string | null;
}

export interface ContractCheckResult {
  changed: boolean;
  signals: ContractSignal[];
  endpoint: EndpointSignature;
  reason: string;
}

export interface DocCandidate {
  path: string;
  content: string;
}

export interface RankedDoc {
  path: string;
  score: number;
  reasons: string[];
  mustInclude: boolean;
}

export type FixtureKind = "request" | "response" | "error";

export interface Fixture {
  file: string;
  kind: FixtureKind;
  snippet: string;
}

export interface Replacement {
  find: string;
  replace: string;
}

export interface DocEdit {
  path: string;
  content?: string;
  replacements?: Replacement[];
}

export interface LLMUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LLMResult {
  edits: DocEdit[];
  usage: LLMUsage;
}

export type RunStatus = "skipped" | "running" | "planned" | "opened" | "failed";

export interface DocChangeSummary {
  path: string;
  before: string;
  after: string;
}

export interface RunResult {
  status: RunStatus;
  reason: string;
  commit: CommitInfo | null;
  endpoint: EndpointSignature;
  changedFiles: string[];
  docChanges: DocChangeSummary[];
  usage: LLMUsage;
  prUrl?: string;
  prNumber?: number;
  prTitle?: string;
  prBody?: string;
  dryRun: boolean;
}
