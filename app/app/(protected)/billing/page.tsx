import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Billing
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Billing is paused during beta
      </h1>
      <p className="mt-4 text-sm text-muted">
        Watchdocs is free while the product is in beta. Plans and usage-based
        billing will appear here before the public launch.
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
