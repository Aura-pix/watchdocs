"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { docMappings, installations, repos } from "@/lib/db/schema";
import {
  isSafeBranch,
  isSafeRepoPath,
  MAX_LABELS,
  MAX_LABEL_LENGTH,
  MAX_PATHS,
  MAX_PATH_LENGTH,
  parseLabels,
  parseLines,
} from "./repo-settings";
import { requireAppUser } from "./session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function repoError(repoId: string, message: string): never {
  redirect(`/app/repos/${repoId}?error=${encodeURIComponent(message)}`);
}

function repoSuccess(repoId: string, message: string): never {
  redirect(`/app/repos/${repoId}?saved=${encodeURIComponent(message)}`);
}

async function assertOwnedRepo(userId: string, repoId: string): Promise<void> {
  const db = getDb();
  const [owned] = await db
    .select({ id: repos.id })
    .from(repos)
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(and(eq(repos.id, repoId), eq(installations.userId, userId)))
    .limit(1);

  if (!owned) {
    redirect("/app");
  }
}

export async function updateRepoSettingsAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAppUser();
  const repoId = String(formData.get("repoId") ?? "");

  if (!UUID_PATTERN.test(repoId)) {
    redirect("/app?error=invalid-repo");
  }

  await assertOwnedRepo(user.id, repoId);

  const watchedPaths = parseLines(formData.get("watchedPaths"));
  const docsPaths = parseLines(formData.get("docsPaths"));
  const prLabels = parseLabels(formData.get("prLabels"));
  const defaultBranch = String(formData.get("defaultBranch") ?? "").trim();
  const branchPrefix = String(formData.get("branchPrefix") ?? "").trim();

  if (watchedPaths.length > MAX_PATHS) {
    repoError(repoId, `Use at most ${MAX_PATHS} watched paths.`);
  }
  if (docsPaths.length > MAX_PATHS) {
    repoError(repoId, `Use at most ${MAX_PATHS} documentation paths.`);
  }
  if (!watchedPaths.every(isSafeRepoPath)) {
    repoError(repoId, "Every watched path must be a relative repository path.");
  }
  if (!docsPaths.every(isSafeRepoPath)) {
    repoError(
      repoId,
      "Every documentation path must be a relative repository path.",
    );
  }
  if (!isSafeBranch(defaultBranch)) {
    repoError(repoId, "Enter a valid default branch name.");
  }
  if (!isSafeBranch(branchPrefix)) {
    repoError(repoId, "Enter a valid branch prefix, for example watchdocs/sync-.");
  }
  if (
    prLabels.length > MAX_LABELS ||
    prLabels.some((label) => label.length > MAX_LABEL_LENGTH)
  ) {
    repoError(
      repoId,
      `Use at most ${MAX_LABELS} labels, each ${MAX_LABEL_LENGTH} characters or fewer.`,
    );
  }

  const labels = Array.from(new Set(prLabels));
  const db = getDb();

  await db
    .update(repos)
    .set({
      watchedPaths,
      docsPaths,
      defaultBranch,
      branchPrefix,
      prLabels: labels,
    })
    .where(eq(repos.id, repoId));

  revalidatePath("/app");
  revalidatePath(`/app/repos/${repoId}`);
  repoSuccess(repoId, "Settings saved.");
}

export async function addDocMappingAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const repoId = String(formData.get("repoId") ?? "");
  const routePattern = String(formData.get("routePattern") ?? "").trim();
  const rawDocPath = String(formData.get("docPath") ?? "").trim();
  const docPath = rawDocPath.replace(/^\.\//, "");

  if (!UUID_PATTERN.test(repoId)) {
    redirect("/app?error=invalid-repo");
  }

  await assertOwnedRepo(user.id, repoId);

  if (!routePattern || routePattern.length > MAX_PATH_LENGTH) {
    repoError(repoId, "Enter a route or endpoint for the mapping.");
  }
  if (!isSafeRepoPath(docPath)) {
    repoError(repoId, "Enter a relative documentation path.");
  }

  const db = getDb();
  await db.insert(docMappings).values({
    repoId,
    routePattern,
    docPath,
    source: "manual",
  });

  revalidatePath(`/app/repos/${repoId}`);
  repoSuccess(repoId, "Mapping added.");
}

export async function deleteDocMappingAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAppUser();
  const repoId = String(formData.get("repoId") ?? "");
  const mappingId = String(formData.get("mappingId") ?? "");

  if (!UUID_PATTERN.test(repoId) || !UUID_PATTERN.test(mappingId)) {
    redirect("/app?error=invalid-repo");
  }

  await assertOwnedRepo(user.id, repoId);

  const db = getDb();
  const [owned] = await db
    .select({ id: docMappings.id })
    .from(docMappings)
    .innerJoin(repos, eq(docMappings.repoId, repos.id))
    .innerJoin(installations, eq(repos.installationId, installations.id))
    .where(
      and(
        eq(docMappings.id, mappingId),
        eq(docMappings.repoId, repoId),
        eq(installations.userId, user.id),
      ),
    )
    .limit(1);

  if (!owned) {
    repoError(repoId, "Mapping not found.");
  }

  await db.delete(docMappings).where(eq(docMappings.id, mappingId));

  revalidatePath(`/app/repos/${repoId}`);
  repoSuccess(repoId, "Mapping removed.");
}
