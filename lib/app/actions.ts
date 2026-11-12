"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, getAuth } from "@/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import { installations, repos } from "@/lib/db/schema";
import { ensureUser } from "./users";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function toggleRepoAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/app");
  }

  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const repoId = String(formData.get("repoId") ?? "");
  if (!UUID_PATTERN.test(repoId)) {
    throw new Error("Invalid repository id.");
  }

  const user = await ensureUser({
    githubId: session.user.githubId,
    login: session.user.login,
    email: session.user.email,
  });

  if (!user) {
    throw new Error("Could not load the current user.");
  }

  const db = getDb();
  const [owned] = await db
    .select({ id: repos.id })
    .from(repos)
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(and(eq(repos.id, repoId), eq(installations.userId, user.id)))
    .limit(1);

  if (!owned) {
    throw new Error("Repository not found.");
  }

  await db
    .update(repos)
    .set({ enabled: formData.get("enabled") === "true" })
    .where(eq(repos.id, repoId));

  revalidatePath("/app");
}

export async function signOutAction(): Promise<void> {
  const { signOut } = await getAuth();
  await signOut({ redirectTo: "/" });
}
