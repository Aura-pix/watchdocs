import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "@/lib/app/users";
import { listInstallationsForUser } from "@/lib/app/repos";
import { deleteAccountAction } from "@/lib/app/account-actions";
import { formatDate } from "@/lib/app/format";
import SetupNotice from "@/components/app/SetupNotice";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="Authentication is not configured"
        description="GitHub sign-in needs the App OAuth credentials and an auth secret before settings can load."
        items={["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_SECRET"]}
      />
    );
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/app/settings");
  }

  if (!isDbConfigured()) {
    return (
      <SetupNotice
        title="Database is not configured"
        description="Account and installation settings are stored in Postgres. Add the connection string and push the schema."
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
    redirect("/login?callbackUrl=/app/settings");
  }

  const [installations, notice] = await Promise.all([
    listInstallationsForUser(user.id),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Settings
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account</h1>

      {notice.error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {notice.error}
        </div>
      )}

      <section className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-base font-semibold">GitHub account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-xs text-muted">Login</dt>
            <dd className="mt-1 text-sm">{user.login}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-muted">Email</dt>
            <dd className="mt-1 text-sm">{user.email ?? "Not shared"}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-muted">Joined</dt>
            <dd className="mt-1 text-sm">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Installations</h2>
        {installations.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No GitHub App installations are connected to this account.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {installations.map((installation) => (
              <li
                key={installation.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {installation.accountLogin}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {installation.accountType} · installation{" "}
                    {installation.githubInstallationId}
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-muted">
                    {installation.status}
                  </span>
                  <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-muted">
                    {installation.plan}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-xl border border-danger/30 bg-danger-soft p-6">
        <h2 className="text-base font-semibold text-danger">Delete account</h2>
        <p className="mt-2 max-w-2xl text-sm text-danger/90">
          This removes your Watchdocs user, installations, connected
          repositories, run history, and usage records. GitHub App installations
          are not uninstalled from GitHub. This cannot be undone.
        </p>
        <form action={deleteAccountAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-medium text-danger">
              Type {user.login} to confirm
            </span>
            <input
              name="confirmation"
              required
              autoComplete="off"
              className="mt-1.5 w-full rounded-md border border-danger/30 bg-surface px-3 py-2 text-sm outline-none focus:border-danger"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Delete account
          </button>
        </form>
      </section>

      <div className="mt-8">
        <Link
          href="/app"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
