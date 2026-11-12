import type { MetadataRoute } from "next";
import { listDocs } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const staticPages = [
    "/docs",
    "/changelog",
    "/privacy",
    "/terms",
  ];

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...listDocs().map((doc) => ({
      url: `${baseUrl}/docs/${doc.meta.slug.join("/")}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
