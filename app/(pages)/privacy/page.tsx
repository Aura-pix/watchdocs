import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import MdxContent from "@/components/mdx/MdxContent";

export const metadata: Metadata = {
  title: "Privacy Policy — Watchdocs",
  description: "How Watchdocs collects, uses, and stores your data.",
};

export default function PrivacyPage() {
  const page = getPage("privacy");

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
