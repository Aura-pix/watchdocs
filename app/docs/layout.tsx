import Link from "next/link";
import { listDocs } from "@/lib/content";
import SiteHeader from "@/components/SiteHeader";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const docs = listDocs();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-10">
        <aside className="hidden w-56 shrink-0 pr-10 md:block">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Docs
          </p>
          <nav className="mt-4 space-y-1">
            {docs.map((doc) => (
              <Link
                key={doc.meta.slug.join("/")}
                href={`/docs/${doc.meta.slug.join("/")}`}
                className="block rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-code hover:text-ink"
              >
                {doc.meta.title}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-line pt-6">
            <Link
              href="/"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Back to home
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 md:pl-4">{children}</main>
      </div>
    </div>
  );
}
