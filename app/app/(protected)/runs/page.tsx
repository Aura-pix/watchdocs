import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "@/lib/app/users";
import { listRunsForUser } from "@/lib/app/runs";
import { formatCost, formatDate, shortSha } from "@/lib/app/format";
import SetupNotice from "@/components/app/SetupNotice";
import StatusBadge from "@/components/app/StatusBadge";

export default async function RunsPage() {
  await connection();

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="Authentication is not configured"
        description="GitHub sign-in needs the App OAuth credentials and an auth secret before run history can load."
        items={["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_SECRET"]}
      />
    );
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/app/runs");
  }

  if (!isDbConfigured()) {
    return (
      <SetupNotice
        title="Database is not configured"
        description="Run history is stored in Postgres. Add the connection string and push the schema."
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
    redirect("/login?callbackUrl=/app/runs");
  }

  const runs = await listRunsForUser(user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Runs
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Run history
          </h1>
          <p className="mt-2 text-sm text-muted">
            Every push to a watched default branch that Watchdocs processes
            appears here.
          </p>
        </div>
        <Link
          href="/app"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
          <h2 className="text-base font-semibold">No runs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Runs start when a watched API file changes on a repository default
            branch. Paused repositories are ignored.
          </p>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {runs.map(({ run, repo }) => {
            const detail = run.error ?? run.skipReason;

            return (
              <li key={run.id}>
                <Link
                  href={`/app/runs/${run.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {repo.fullName}
                      </span>
                      <StatusBadge status={run.status} />
                      <span className="font-mono text-xs text-muted">
                        {shortSha(run.commitSha)}
                      </span>
                      {run.endpoint?.path && (
                        <span className="font-mono text-xs text-muted">
                          {run.endpoint.path}
                        </span>
                      )}
                    </div>
                    {detail && (
                      <p className="mt-1 truncate text-xs text-muted">
                        {detail}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 font-mono text-xs text-muted">
                    <span>{formatDate(run.createdAt)}</span>
                    <span>{formatCost(run.costUsd)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
