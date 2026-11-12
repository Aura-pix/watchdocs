import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "@/lib/app/users";
import { getRunForUser } from "@/lib/app/runs";
import {
  formatCost,
  formatDate,
  formatTokens,
  shortSha,
} from "@/lib/app/format";
import SetupNotice from "@/components/app/SetupNotice";
import StatusBadge from "@/components/app/StatusBadge";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="Authentication is not configured"
        description="GitHub sign-in needs the App OAuth credentials and an auth secret before run details can load."
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
        description="Run details are stored in Postgres. Add the connection string and push the schema."
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

  const { id } = await params;
  const row = await getRunForUser(user.id, id);

  if (!row) {
    notFound();
  }

  const { run, repo } = row;
  const detail = run.error ?? run.skipReason;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link
        href="/app/runs"
        className="text-sm text-muted transition-colors hover:text-ink"
      >
        Back to runs
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Run
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
            {repo.fullName}
            <StatusBadge status={run.status} />
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">
            {shortSha(run.commitSha)} · {formatDate(run.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/app/repos/${repo.id}`}
            className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
          >
            Repository settings
          </Link>
          {run.prUrl && (
            <a
              href={run.prUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Open pull request{run.prNumber ? ` #${run.prNumber}` : ""}
            </a>
          )}
        </div>
      </div>

      {detail && (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            run.error
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-line bg-paper text-muted"
          }`}
        >
          {detail}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Endpoint</p>
          <p className="mt-2 text-sm font-medium">
            {run.endpoint?.method && (
              <span className="mr-1 font-mono text-xs text-muted">
                {run.endpoint.method}
              </span>
            )}
            {run.endpoint?.path ?? "Not detected"}
          </p>
          {run.endpoint?.handler && (
            <p className="mt-1 font-mono text-xs text-muted">
              {run.endpoint.handler}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Tokens</p>
          <p className="mt-2 font-mono text-sm">
            {formatTokens(run.inputTokens, run.outputTokens)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Cost</p>
          <p className="mt-2 font-mono text-sm">{formatCost(run.costUsd)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs text-muted">Finished</p>
          <p className="mt-2 text-sm">{formatDate(run.finishedAt)}</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Changed files ({run.changedFiles.length})
        </h2>
        {run.changedFiles.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No changed files were recorded for this run.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {run.changedFiles.map((file) => (
              <li key={file} className="px-5 py-3 font-mono text-xs">
                {file}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Documentation changes ({run.docChanges.length})
        </h2>
        {run.docChanges.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No documentation was edited for this run.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {run.docChanges.map((change) => (
              <details
                key={change.path}
                className="overflow-hidden rounded-xl border border-line bg-surface"
              >
                <summary className="cursor-pointer px-5 py-3 font-mono text-xs">
                  {change.path}
                </summary>
                <div className="grid gap-px border-t border-line bg-line md:grid-cols-2">
                  <div className="bg-surface p-4">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                      Before
                    </p>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
                      {change.before}
                    </pre>
                  </div>
                  <div className="bg-surface p-4">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                      After
                    </p>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
                      {change.after}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {run.diff && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Diff seen</h2>
          <details className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
            <summary className="cursor-pointer px-5 py-3 font-mono text-xs">
              Show unified diff
            </summary>
            <pre className="max-h-[36rem] overflow-auto border-t border-line bg-paper p-4 font-mono text-xs leading-relaxed">
              {run.diff}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}
