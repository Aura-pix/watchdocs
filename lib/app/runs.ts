import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { installations, repos, runs, usageMonthly } from "@/lib/db/schema";
import type { LLMUsage } from "@/lib/engine/types";

const MAX_STORED_DIFF = 200_000;

export interface CreateRunInput {
  repoId: string;
  commitSha: string;
  webhookDeliveryId?: string | null;
}

export async function createRun(input: CreateRunInput): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(runs)
    .values({
      repoId: input.repoId,
      commitSha: input.commitSha,
      status: "running",
      webhookDeliveryId: input.webhookDeliveryId ?? null,
    })
    .returning({ id: runs.id });

  if (!row) throw new Error("Could not create the run record.");
  return row.id;
}

export async function findRunByDelivery(
  webhookDeliveryId: string,
): Promise<typeof runs.$inferSelect | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(runs)
    .where(eq(runs.webhookDeliveryId, webhookDeliveryId))
    .limit(1);

  return row ?? null;
}

export async function resetRun(runId: string): Promise<void> {
  const db = getDb();
  await db
    .update(runs)
    .set({
      status: "running",
      error: null,
      skipReason: null,
      finishedAt: null,
    })
    .where(eq(runs.id, runId));
}

export interface RunDetails {
  endpoint?: {
    method: string | null;
    path: string | null;
    handler: string | null;
  } | null;
  changedFiles?: string[];
  docChanges?: { path: string; before: string; after: string }[];
  diff?: string | null;
}

export interface FinishRunInput extends RunDetails {
  status: "skipped" | "failed" | "opened";
  skipReason?: string | null;
  usage?: LLMUsage | null;
  prNumber?: number | null;
  prUrl?: string | null;
  error?: string | null;
}

export async function finishRun(
  runId: string,
  input: FinishRunInput,
): Promise<void> {
  const db = getDb();
  await db
    .update(runs)
    .set({
      status: input.status,
      skipReason: input.skipReason ?? null,
      endpoint: input.endpoint ?? null,
      changedFiles: input.changedFiles ?? [],
      docChanges: input.docChanges ?? [],
      diff: input.diff ? input.diff.slice(0, MAX_STORED_DIFF) : null,
      inputTokens: input.usage?.inputTokens ?? 0,
      outputTokens: input.usage?.outputTokens ?? 0,
      costUsd: String(input.usage?.costUsd ?? 0),
      prNumber: input.prNumber ?? null,
      prUrl: input.prUrl ?? null,
      error: input.error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(runs.id, runId));
}

export interface RunWithRepo {
  run: typeof runs.$inferSelect;
  repo: typeof repos.$inferSelect;
  installation: typeof installations.$inferSelect;
}

export async function listRunsForUser(
  userId: string,
  limit = 50,
): Promise<RunWithRepo[]> {
  const db = getDb();

  return db
    .select({ run: runs, repo: repos, installation: installations })
    .from(runs)
    .innerJoin(repos, eq(runs.repoId, repos.id))
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(eq(installations.userId, userId))
    .orderBy(desc(runs.createdAt))
    .limit(limit);
}

export async function getRunForUser(
  userId: string,
  runId: string,
): Promise<RunWithRepo | null> {
  const db = getDb();
  const [row] = await db
    .select({ run: runs, repo: repos, installation: installations })
    .from(runs)
    .innerJoin(repos, eq(runs.repoId, repos.id))
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(and(eq(runs.id, runId), eq(installations.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function countOpenPullRequests(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(runs)
    .innerJoin(repos, eq(runs.repoId, repos.id))
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(
      and(
        eq(installations.userId, userId),
        eq(runs.status, "opened"),
        isNotNull(runs.prUrl),
      ),
    );

  return row?.count ?? 0;
}

export function usageMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export async function updateRunStatusForPullRequest(input: {
  repoId: string;
  prNumber: number;
  status: "merged" | "closed";
}): Promise<void> {
  const db = getDb();
  await db
    .update(runs)
    .set({ status: input.status, finishedAt: new Date() })
    .where(
      and(eq(runs.repoId, input.repoId), eq(runs.prNumber, input.prNumber)),
    );
}

export async function recordUsage(input: {
  installationId: string;
  prCount: number;
  costUsd: number;
  month?: string;
}): Promise<void> {
  const db = getDb();
  const month = input.month ?? usageMonth();

  await db
    .insert(usageMonthly)
    .values({
      installationId: input.installationId,
      month,
      prCount: input.prCount,
      costUsd: String(input.costUsd),
    })
    .onConflictDoUpdate({
      target: [usageMonthly.installationId, usageMonthly.month],
      set: {
        prCount: sql`${usageMonthly.prCount} + ${input.prCount}`,
        costUsd: sql`${usageMonthly.costUsd} + ${input.costUsd}`,
      },
    });
}

export async function recordUsageOnce(input: {
  runId: string;
  installationId: string;
  prCount: number;
  costUsd: number;
  month?: string;
}): Promise<void> {
  const db = getDb();
  const [claimed] = await db
    .update(runs)
    .set({ usageRecorded: true })
    .where(and(eq(runs.id, input.runId), eq(runs.usageRecorded, false)))
    .returning({ id: runs.id });

  if (!claimed) return;

  await recordUsage({
    installationId: input.installationId,
    prCount: input.prCount,
    costUsd: input.costUsd,
    month: input.month,
  });
}
