import { and, eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db";
import { installations, repos, usageMonthly } from "@/lib/db/schema";
import { usageMonth } from "@/lib/app/runs";
import { isBillingConfigured } from "./config";
import { getPlanLimits, type PlanLimits } from "./plans";

export type LimitCheck =
  | { ok: true }
  | { ok: false; reason: string };

export async function checkInstallationLimits(
  installationId: string,
): Promise<LimitCheck> {
  if (!isBillingConfigured() || !isDbConfigured()) {
    return { ok: true };
  }

  const db = getDb();
  const [installation] = await db
    .select()
    .from(installations)
    .where(eq(installations.id, installationId))
    .limit(1);

  if (!installation) return { ok: true };

  const { repoLimit, updateLimit } = getPlanLimits(
    installation.plan,
    installation.overagePacks,
  );

  if (repoLimit !== null) {
    const [repoRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(repos)
      .where(
        and(
          eq(repos.installationId, installationId),
          eq(repos.enabled, true),
        ),
      );

    const enabledCount = repoRow?.count ?? 0;
    if (enabledCount > repoLimit) {
      return {
        ok: false,
        reason: `This plan allows ${repoLimit} watched ${
          repoLimit === 1 ? "repository" : "repositories"
        }. Pause extras from the dashboard to continue.`,
      };
    }
  }

  if (updateLimit !== null) {
    const [usage] = await db
      .select()
      .from(usageMonthly)
      .where(
        and(
          eq(usageMonthly.installationId, installationId),
          eq(usageMonthly.month, usageMonth()),
        ),
      )
      .limit(1);

    const used = usage?.prCount ?? 0;
    if (used >= updateLimit) {
      return {
        ok: false,
        reason: `This plan allows ${updateLimit} doc updates per month and the limit is reached.`,
      };
    }
  }

  return { ok: true };
}

export interface InstallationUsage {
  plan: string;
  overagePacks: number;
  usedUpdates: number;
  repoCount: number;
  enabledCount: number;
  limits: PlanLimits;
}

export async function getInstallationUsage(
  installationId: string,
): Promise<InstallationUsage> {
  const db = getDb();
  const [installation] = await db
    .select()
    .from(installations)
    .where(eq(installations.id, installationId))
    .limit(1);

  const plan = installation?.plan ?? "free";
  const overagePacks = installation?.overagePacks ?? 0;

  const [repoRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repos)
    .where(eq(repos.installationId, installationId));

  const [enabledRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repos)
    .where(
      and(
        eq(repos.installationId, installationId),
        eq(repos.enabled, true),
      ),
    );

  const [usage] = await db
    .select()
    .from(usageMonthly)
    .where(
      and(
        eq(usageMonthly.installationId, installationId),
        eq(usageMonthly.month, usageMonth()),
      ),
    )
    .limit(1);

  return {
    plan,
    overagePacks,
    usedUpdates: usage?.prCount ?? 0,
    repoCount: repoRow?.count ?? 0,
    enabledCount: enabledRow?.count ?? 0,
    limits: getPlanLimits(plan, overagePacks),
  };
}

export async function canEnableRepo(
  installationId: string,
  currentEnabled: boolean,
): Promise<LimitCheck> {
  if (!isBillingConfigured() || !isDbConfigured()) {
    return { ok: true };
  }

  const db = getDb();
  const [installation] = await db
    .select()
    .from(installations)
    .where(eq(installations.id, installationId))
    .limit(1);

  if (!installation) return { ok: true };

  const { repoLimit } = getPlanLimits(
    installation.plan,
    installation.overagePacks,
  );
  if (repoLimit === null) return { ok: true };

  const [repoRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repos)
    .where(
      and(
        eq(repos.installationId, installationId),
        eq(repos.enabled, true),
      ),
    );

  const enabledCount = (repoRow?.count ?? 0) + (currentEnabled ? 0 : 1);

  if (enabledCount > repoLimit) {
    return {
      ok: false,
      reason: `This plan allows ${repoLimit} watched ${
        repoLimit === 1 ? "repository" : "repositories"
      }. Upgrade or pause another repository first.`,
    };
  }

  return { ok: true };
}
