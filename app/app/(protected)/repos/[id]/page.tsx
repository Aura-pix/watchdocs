import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "@/lib/app/users";
import {
  getRepoForUser,
  listDocMappingsForRepo,
} from "@/lib/app/repos";
import {
  addDocMappingAction,
  deleteDocMappingAction,
  updateRepoSettingsAction,
} from "@/lib/app/repo-actions";
import { formatDate } from "@/lib/app/format";
import SetupNotice from "@/components/app/SetupNotice";

export default async function RepoSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await connection();

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="Authentication is not configured"
        description="GitHub sign-in needs the App OAuth credentials and an auth secret before repository settings can load."
        items={["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_SECRET"]}
      />
    );
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/app");
  }

  if (!isDbConfigured()) {
    return (
      <SetupNotice
        title="Database is not configured"
        description="Repository settings are stored in Postgres. Add the connection string and push the schema."
        items={["DATABASE_URL", "npm run db:push"]}
      />
    );
  }

  const user = await ensureUser({
    githubId: session.user.githubId,
    login: session.user.login,
    email: session.user.email,
  });

  if (!user) {
    redirect("/login?callbackUrl=/app");
  }

  const { id } = await params;
  const [row, mappings, notice] = await Promise.all([
    getRepoForUser(user.id, id),
    listDocMappingsForRepo(id),
    searchParams,
  ]);

  if (!row) {
    notFound();
  }

  const { repo, installation } = row;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/app"
        className="text-sm text-muted transition-colors hover:text-ink"
      >
        Back to dashboard
      </Link>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Repository settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {repo.fullName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {installation.accountLogin} · {installation.accountType} · added{" "}
          {formatDate(repo.createdAt)}
        </p>
      </div>

      {notice.saved && (
        <div className="mt-6 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          {notice.saved}
        </div>
      )}

      {notice.error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {notice.error}
        </div>
      )}

      <form
        action={updateRepoSettingsAction}
        className="mt-8 space-y-6 rounded-xl border border-line bg-surface p-6"
      >
        <input type="hidden" name="repoId" value={repo.id} />

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Default branch</span>
            <input
              name="defaultBranch"
              defaultValue={repo.defaultBranch}
              required
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
            />
            <span className="mt-1 block text-xs text-muted">
              Pushes to this branch are analyzed.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Branch prefix</span>
            <input
              name="branchPrefix"
              defaultValue={repo.branchPrefix}
              required
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
            />
            <span className="mt-1 block text-xs text-muted">
              The short commit SHA is appended to this prefix.
            </span>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Watched paths</span>
          <textarea
            name="watchedPaths"
            defaultValue={repo.watchedPaths.join("\n")}
            rows={4}
            placeholder={"app/api/**\nlib/api/**\nserver/routes/**"}
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
          />
          <span className="mt-1 block text-xs text-muted">
            One glob per line. Leave empty to use the repository .watchdocsrc.json
            or Watchdocs defaults.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Documentation paths</span>
          <textarea
            name="docsPaths"
            defaultValue={repo.docsPaths.join("\n")}
            rows={3}
            placeholder={"docs\ncontent/docs"}
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
          />
          <span className="mt-1 block text-xs text-muted">
            One directory per line. Leave empty to use the repository
            .watchdocsrc.json or Watchdocs defaults.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Pull request labels</span>
          <input
            name="prLabels"
            defaultValue={repo.prLabels.join(", ")}
            placeholder="documentation, automated"
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <span className="mt-1 block text-xs text-muted">
            Comma-separated. Watchdocs applies labels that already exist in the
            repository.
          </span>
        </label>

        <div className="flex items-center justify-end border-t border-line pt-5">
          <button
            type="submit"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Save settings
          </button>
        </div>
      </form>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Doc mappings</h2>
        <p className="mt-2 text-sm text-muted">
          Pin an endpoint or route pattern to a specific documentation file.
          Watchdocs still ranks the remaining documentation automatically.
        </p>

        <form
          action={addDocMappingAction}
          className="mt-5 grid gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <input type="hidden" name="repoId" value={repo.id} />
          <label className="block">
            <span className="text-xs font-medium text-muted">
              Route or endpoint
            </span>
            <input
              name="routePattern"
              required
              placeholder="POST /swap"
              className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">
              Documentation file
            </span>
            <input
              name="docPath"
              required
              placeholder="docs/api/swap.mdx"
              className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
          >
            Add mapping
          </button>
        </form>

        {mappings.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No mappings yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {mappings.map((mapping) => (
              <li
                key={mapping.id}
                className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">
                    {mapping.routePattern}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted">
                    {mapping.docPath} · {mapping.source}
                  </p>
                </div>
                <form action={deleteDocMappingAction}>
                  <input type="hidden" name="repoId" value={repo.id} />
                  <input type="hidden" name="mappingId" value={mapping.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted transition-colors hover:text-danger"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
