import { getDb, isDbConfigured } from "@/lib/db";
import { users } from "@/lib/db/schema";

export interface SessionUserInput {
  githubId?: string;
  login?: string;
  email?: string | null;
}

export async function ensureUser(input: SessionUserInput) {
  if (!isDbConfigured()) return null;

  if (!input.githubId) {
    throw new Error("Session is missing a GitHub account id.");
  }

  const db = getDb();
  const login = input.login ?? input.githubId;

  const [row] = await db
    .insert(users)
    .values({
      githubId: input.githubId,
      login,
      email: input.email ?? null,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        login,
        email: input.email ?? null,
      },
    })
    .returning();

  return row ?? null;
}
