import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import MdxContent from "@/components/mdx/MdxContent";

export const metadata: Metadata = {
  title: "Terms of Service — Watchdocs",
  description: "The terms that govern your use of Watchdocs.",
};

export default function TermsPage() {
  const page = getPage("terms");

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
