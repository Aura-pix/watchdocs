import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { docMappings, installations, repos } from "@/lib/db/schema";

export interface UserRepoRow {
  repo: typeof repos.$inferSelect;
  installation: typeof installations.$inferSelect;
}

export async function listReposForUser(userId: string): Promise<UserRepoRow[]> {
  const db = getDb();

  return db
    .select({
      repo: repos,
      installation: installations,
    })
    .from(repos)
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(eq(installations.userId, userId))
    .orderBy(desc(repos.createdAt));
}

export async function listInstallationsForUser(userId: string) {
  const db = getDb();

  return db
    .select()
    .from(installations)
    .where(eq(installations.userId, userId))
    .orderBy(desc(installations.createdAt));
}

export async function getRepoForUser(
  userId: string,
  repoId: string,
): Promise<UserRepoRow | null> {
  const db = getDb();
  const [row] = await db
    .select({ repo: repos, installation: installations })
    .from(repos)
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(and(eq(repos.id, repoId), eq(installations.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function listDocMappingsForRepo(repoId: string) {
  const db = getDb();

  return db
    .select()
    .from(docMappings)
    .where(eq(docMappings.repoId, repoId))
    .orderBy(desc(docMappings.id));
}
