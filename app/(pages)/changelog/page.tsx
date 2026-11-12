import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import MdxContent from "@/components/mdx/MdxContent";

export const metadata: Metadata = {
  title: "Changelog — Watchdocs",
  description: "What changed in Watchdocs, by release.",
};

export default function ChangelogPage() {
  const page = getPage("changelog");

  if (!page) {
    return null;
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        {page.meta.title}
      </h1>
      <MdxContent source={page.body} />
    </div>
  );
}
