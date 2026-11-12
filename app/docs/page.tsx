import Link from "next/link";
import type { Metadata } from "next";
import { listDocs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Docs — Watchdocs",
  description: "Documentation for the Watchdocs GitHub App.",
};

export default function DocsIndexPage() {
  const docs = listDocs();

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Docs
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Watchdocs documentation
      </h1>
      <p className="mt-3 text-ink/80">
        How to install, configure, and understand Watchdocs. These pages are
        generated the same way Watchdocs writes your documentation.
      </p>

      <div className="mt-10 space-y-3">
        {docs.map((doc) => (
          <Link
            key={doc.meta.slug.join("/")}
            href={`/docs/${doc.meta.slug.join("/")}`}
            className="block rounded-xl border border-line bg-surface p-5 transition-colors hover:bg-code"
          >
            <h2 className="text-base font-semibold">{doc.meta.title}</h2>
            {doc.meta.description && (
              <p className="mt-1 text-sm text-muted">{doc.meta.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
