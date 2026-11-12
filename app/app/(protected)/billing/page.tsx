import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "@/lib/app/users";
import { listInstallationsForUser } from "@/lib/app/repos";
import { isBillingConfigured } from "@/lib/billing/config";
import { getInstallationUsage } from "@/lib/billing/limits";
import { PLANS, isPaidPlan } from "@/lib/billing/plans";
import {
  cancelSubscriptionAction,
  openBillingPortalAction,
  startCheckoutAction,
  startOverageCheckoutAction,
} from "@/lib/billing/actions";
import SetupNotice from "@/components/app/SetupNotice";

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <p className="mt-1 font-mono text-xs text-muted">
        {used.toLocaleString()} used · no limit
      </p>
    );
  }

  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const over = used >= limit;

  return (
    <div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-code">
        <div
          className={`h-full rounded-full ${
            over ? "bg-danger" : "bg-success"
          }`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-xs text-muted">
        {used.toLocaleString()} / {limit.toLocaleString()}
        {over ? " · limit reached" : ""}
      </p>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    billing?: string;
    error?: string;
  }>;
}) {
  await connection();

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="Authentication is not configured"
        description="GitHub sign-in needs the App OAuth credentials and an auth secret before billing can load."
        items={["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_SECRET"]}
      />
    );
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/app/billing");
  }

  if (!isDbConfigured()) {
    return (
      <SetupNotice
        title="Database is not configured"
        description="Installation plans and usage are stored in Postgres. Add the connection string and push the schema."
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
    redirect("/login?callbackUrl=/app/billing");
  }

  const [installations, params] = await Promise.all([
    listInstallationsForUser(user.id),
    searchParams,
  ]);

  if (!isBillingConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Billing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Billing is paused during beta
        </h1>
        <p className="mt-4 text-sm text-muted">
          Watchdocs is free while the product is in beta. Plans and
          usage-based billing will appear here before the public launch.
        </p>
        <Link
          href="/app"
          className="mt-8 inline-flex rounded-md border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const usageRows = await Promise.all(
    installations.map((installation) =>
      getInstallationUsage(installation.id).then((usage) => ({
        installation,
        usage,
      })),
    ),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Billing
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Plans and usage
          </h1>
          <p className="mt-2 text-sm text-muted">
            Plans attach to a GitHub installation. One opened or updated pull
            request counts as one update.
          </p>
        </div>
        <Link
          href="/app"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>

      {params.billing === "success" && (
        <div className="mt-6 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Your billing settings were updated.
        </div>
      )}

      {params.billing === "cancelled" && (
        <div className="mt-6 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted">
          Checkout was cancelled. No changes were made.
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {params.error}
        </div>
      )}

      {usageRows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
          <h2 className="text-base font-semibold">No installations</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Install the GitHub App to see plan and usage details for an
            installation.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {usageRows.map(({ installation, usage }) => {
            const planDef = PLANS[usage.plan as keyof typeof PLANS] ?? PLANS.free;
            const canBuyOverage =
              isPaidPlan(usage.plan) && usage.limits.updateLimit !== null;

            return (
              <section
                key={installation.id}
                className="rounded-xl border border-line bg-surface p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {installation.accountLogin}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {installation.accountType} · {planDef.name} ·{" "}
                      {planDef.priceLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={openBillingPortalAction}>
                      <input
                        type="hidden"
                        name="installationId"
                        value={installation.id}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                      >
                        Manage billing
                      </button>
                    </form>
                    {isPaidPlan(usage.plan) && (
                      <form action={cancelSubscriptionAction}>
                        <input
                          type="hidden"
                          name="installationId"
                          value={installation.id}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                        >
                          Downgrade to Free
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="rounded-lg border border-line bg-paper p-4">
                    <p className="font-mono text-xs text-muted">
                      Repositories watched
                    </p>
                    <UsageBar
                      used={usage.enabledCount}
                      limit={usage.limits.repoLimit}
                    />
                    <p className="mt-1 text-xs text-muted">
                      {usage.repoCount} connected total
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-paper p-4">
                    <p className="font-mono text-xs text-muted">
                      Doc updates this month
                    </p>
                    <UsageBar
                      used={usage.usedUpdates}
                      limit={usage.limits.updateLimit}
                    />
                    {usage.overagePacks > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        Includes {usage.overagePacks} overage pack
                        {usage.overagePacks === 1 ? "" : "s"} (+
                        {usage.overagePacks * 250} updates)
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                    Change plan
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(Object.keys(PLANS) as (keyof typeof PLANS)[])
                      .filter((id) => id !== "enterprise")
                      .map((id) => {
                        const plan = PLANS[id];
                        const current = usage.plan === id;

                        if (current) {
                          return (
                            <span
                              key={id}
                              className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-muted"
                            >
                              {plan.name} · current
                            </span>
                          );
                        }

                        return (
                          <form key={id} action={startCheckoutAction}>
                            <input
                              type="hidden"
                              name="installationId"
                              value={installation.id}
                            />
                            <input type="hidden" name="plan" value={id} />
                            <button
                              type="submit"
                              className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                            >
                              {plan.name} · {plan.priceLabel}
                            </button>
                          </form>
                        );
                      })}
                    <a
                      href="mailto:enterprise@watchdocs.dev"
                      className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                    >
                      Enterprise · Contact us
                    </a>
                  </div>

                  {canBuyOverage && (
                    <form
                      action={startOverageCheckoutAction}
                      className="mt-4 flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="hidden"
                        name="installationId"
                        value={installation.id}
                      />
                      <input
                        type="hidden"
                        name="quantity"
                        value="1"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                      >
                        Buy 1 overage pack · $10
                      </button>
                      <span className="text-xs text-muted">
                        Adds 250 updates to the monthly limit.
                      </span>
                    </form>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
