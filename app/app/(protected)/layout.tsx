import Link from "next/link";
import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import { signOutAction } from "@/lib/app/actions";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-base font-semibold tracking-tight">
              Watchdocs
            </span>
          </Link>

          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/app"
              className="text-muted transition-colors hover:text-ink"
            >
              Dashboard
            </Link>
            <Link
              href="/app/runs"
              className="text-muted transition-colors hover:text-ink"
            >
              Runs
            </Link>
            <Link
              href="/app/billing"
              className="text-muted transition-colors hover:text-ink"
            >
              Billing
            </Link>
            <Link
              href="/app/settings"
              className="text-muted transition-colors hover:text-ink"
            >
              Settings
            </Link>
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
