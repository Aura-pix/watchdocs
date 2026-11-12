import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "@/lib/app/users";
import { listReposForUser } from "@/lib/app/repos";
import { countOpenPullRequests, listRunsForUser } from "@/lib/app/runs";
import { formatCost, formatDate, shortSha } from "@/lib/app/format";
import { toggleRepoAction } from "@/lib/app/actions";
import { isGitHubAppConfigured } from "@/lib/github/config";
import InstallButton from "@/components/InstallButton";
import SetupNotice from "@/components/app/SetupNotice";
import StatusBadge from "@/components/app/StatusBadge";

const INSTALL_ERRORS: Record<string, string> = {
  config:
    "The GitHub App or database is not configured. Add the credentials and try again.",
  missing: "GitHub did not include an installation id in the setup callback.",
  failed:
    "The installation could not be connected. Check the server logs and try again.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    installed?: string;
    installError?: string;
    error?: string;
  }>;
}) {
  await connection();

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="Authentication is not configured"
        description="GitHub sign-in needs the App OAuth credentials and an auth secret before the dashboard can load."
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
        description="Create a Neon Postgres database, add the connection string, and push the schema. The dashboard reads installations and repositories from Postgres."
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

  const [rows, recentRuns, openPullRequests, params] = await Promise.all([
    listReposForUser(user.id),
    listRunsForUser(user.id, 8),
    countOpenPullRequests(user.id),
    searchParams,
  ]);

  const enabledCount = rows.filter((row) => row.repo.enabled).length;
  const installationCount = new Set(
    rows.map((row) => row.installation.id),
  ).size;
  const installError = params.installError
    ? INSTALL_ERRORS[params.installError] ??
      "The installation could not be connected."
    : null;
  const showInstalled = params.installed === "1";
  const showInvalidRepo = params.error === "invalid-repo";
  const showPlanLimit = params.error === "plan-limit";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {session.user.login
              ? `Welcome back, ${session.user.login}`
              : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {rows.length === 0
              ? "Install the GitHub App to connect your first repository."
              : `${enabledCount} of ${rows.length} repositories are watched.`}
          </p>
        </div>

        <InstallButton />
      </div>

      {showInstalled && (
        <div className="mt-6 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Installation connected. Pick the repositories Watchdocs should watch.
        </div>
      )}

      {installError && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {installError}
        </div>
      )}

      {showInvalidRepo && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          That repository could not be found.
        </div>
      )}

      {showPlanLimit && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          Your plan does not allow another watched repository. Upgrade or pause
          one first.
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Repositories</p>
          <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Watched</p>
          <p className="mt-2 text-2xl font-semibold">{enabledCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Installations</p>
          <p className="mt-2 text-2xl font-semibold">{installationCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Open pull requests</p>
          <p className="mt-2 text-2xl font-semibold">{openPullRequests}</p>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent runs</h2>
          <Link
            href="/app/runs"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            View all
          </Link>
        </div>

        {recentRuns.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-surface p-8 text-center">
            <p className="text-sm text-muted">
              No runs yet. Watchdocs starts a run when a watched API file
              changes on a repository default branch.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {recentRuns.map(({ run, repo }) => (
              <li key={run.id}>
                <Link
                  href={`/app/runs/${run.id}`}
                  className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{repo.fullName}</span>
                    <StatusBadge status={run.status} />
                    <span className="font-mono text-xs text-muted">
                      {shortSha(run.commitSha)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
                    {run.endpoint?.path && <span>{run.endpoint.path}</span>}
                    <span>{formatDate(run.createdAt)}</span>
                    <span>{formatCost(run.costUsd)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Repositories</h2>
          {!isGitHubAppConfigured() && (
            <p className="font-mono text-xs text-muted">
              Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_SLUG
              first.
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
            <h3 className="text-base font-semibold">No repositories yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Install the GitHub App, choose the repositories, then return here.
              Every connected repository starts paused until you enable it.
            </p>
            <div className="mt-6 flex justify-center">
              <InstallButton />
            </div>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map(({ repo, installation }) => (
              <li
                key={repo.id}
                className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{repo.fullName}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                        repo.enabled
                          ? "border-success/30 bg-success-soft text-success"
                          : "border-line bg-paper text-muted"
                      }`}
                    >
                      {repo.enabled ? "watching" : "paused"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {installation.accountLogin} / {repo.defaultBranch}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/repos/${repo.id}`}
                    className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                  >
                    Manage
                  </Link>
                  <form action={toggleRepoAction}>
                    <input type="hidden" name="repoId" value={repo.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={repo.enabled ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                    >
                      {repo.enabled ? "Pause" : "Enable"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
