import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { installations, repos } from "@/lib/db/schema";
import { getApp, userHasInstallation } from "./app";

interface IncomingRepo {
  githubRepoId: string;
  fullName: string;
  defaultBranch: string;
}

export async function listInstallationRepos(
  installationId: number,
): Promise<IncomingRepo[]> {
  const app = getApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const incoming: IncomingRepo[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data } =
      await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
        page,
      });

    for (const repo of data.repositories) {
      incoming.push({
        githubRepoId: String(repo.id),
        fullName: repo.full_name,
        defaultBranch: repo.default_branch ?? "main",
      });
    }

    if (data.repositories.length < 100) break;
  }

  return incoming;
}

export interface StoreInstallationInput {
  installationId: number;
  userId?: string | null;
}

export async function storeInstallation(
  input: StoreInstallationInput,
): Promise<string> {
  const app = getApp();
  const { data: installation } = await app.octokit.rest.apps.getInstallation({
    installation_id: input.installationId,
  });

  const account = installation.account as unknown as {
    login?: string;
    slug?: string;
    type?: string;
  } | null;

  const accountLogin =
    account?.login ?? account?.slug ?? `installation-${input.installationId}`;
  const accountType = account?.type ?? "Organization";

  const db = getDb();
  const [row] = await db
    .insert(installations)
    .values({
      githubInstallationId: String(input.installationId),
      accountLogin,
      accountType,
      userId: input.userId ?? null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: installations.githubInstallationId,
      set: {
        accountLogin,
        accountType,
        status: "active",
      },
    })
    .returning({ id: installations.id });

  if (!row) {
    throw new Error("Could not store the installation.");
  }

  return row.id;
}

export async function syncInstallationRepos(
  installationRowId: string,
  installationId: number,
): Promise<number> {
  const db = getDb();
  const incoming = await listInstallationRepos(installationId);
  const existing = await db
    .select({ id: repos.id, githubRepoId: repos.githubRepoId })
    .from(repos)
    .where(eq(repos.installationId, installationRowId));

  for (const repo of incoming) {
    await db
      .insert(repos)
      .values({
        installationId: installationRowId,
        githubRepoId: repo.githubRepoId,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        enabled: false,
      })
      .onConflictDoUpdate({
        target: [repos.installationId, repos.githubRepoId],
        set: {
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
        },
      });
  }

  const incomingIds = new Set(incoming.map((repo) => repo.githubRepoId));
  const staleIds = existing
    .filter((repo) => !incomingIds.has(repo.githubRepoId))
    .map((repo) => repo.id);

  if (staleIds.length > 0) {
    await db
      .update(repos)
      .set({ enabled: false })
      .where(inArray(repos.id, staleIds));
  }

  return incoming.length;
}

export async function syncInstallationById(
  installationId: number,
  userId?: string | null,
): Promise<{ installationRowId: string; repoCount: number }> {
  const installationRowId = await storeInstallation({
    installationId,
    userId,
  });
  const repoCount = await syncInstallationRepos(
    installationRowId,
    installationId,
  );
  return { installationRowId, repoCount };
}

export async function setInstallationStatus(
  installationId: number,
  status: string,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .update(installations)
    .set({ status })
    .where(eq(installations.githubInstallationId, String(installationId)))
    .returning({ id: installations.id });

  if (row && (status === "removed" || status === "suspended")) {
    await db
      .update(repos)
      .set({ enabled: false })
      .where(eq(repos.installationId, row.id));
  }
}

export interface ConnectInstallationInput {
  installationId: number;
  userId: string;
  userAccessToken: string;
}

export interface ConnectInstallationResult {
  installationRowId: string;
  repoCount: number;
}

export async function connectInstallation(
  input: ConnectInstallationInput,
): Promise<ConnectInstallationResult> {
  const { installationId, userId, userAccessToken } = input;

  if (!(await userHasInstallation(userAccessToken, installationId))) {
    throw new Error(
      "This GitHub account does not have access to that installation.",
    );
  }

  return syncInstallationById(installationId, userId);
}
