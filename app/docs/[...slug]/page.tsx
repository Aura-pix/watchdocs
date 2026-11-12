import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDocBySlug, listDocs } from "@/lib/content";
import MdxContent from "@/components/mdx/MdxContent";

export async function generateStaticParams() {
  return listDocs().map((doc) => ({ slug: doc.meta.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  return {
    title: doc ? `${doc.meta.title} — Watchdocs` : "Docs — Watchdocs",
    description: doc?.meta.description,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <article className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">
        {doc.meta.title}
      </h1>
      {doc.meta.description && (
        <p className="mt-3 text-lg text-muted">{doc.meta.description}</p>
      )}
      <MdxContent source={doc.body} />
    </article>
  );
}
