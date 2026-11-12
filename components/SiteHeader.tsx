import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-base font-semibold tracking-tight">
            Watchdocs
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm text-muted">
          <Link
            href="/docs"
            className="transition-colors hover:text-ink"
          >
            Docs
          </Link>
          <Link
            href="/changelog"
            className="transition-colors hover:text-ink"
          >
            Changelog
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
