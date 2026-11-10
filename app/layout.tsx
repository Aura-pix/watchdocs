import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Watchdocs — Your docs update themselves. You just review the PR.",
  description:
    "GitHub Action + CLI that watches your API commits, updates your documentation (quickstart, errors, llms.txt), and opens a pull request. Never auto-merges.",
  keywords: [
    "developer tools",
    "API documentation",
    "GitHub Action",
    "llms.txt",
    "OpenAPI automation",
    "DeFi API",
    "AI agent docs",
  ],
  openGraph: {
    title: "Watchdocs — Automated Docs PRs for Fast-Moving APIs",
    description: "Your docs update themselves. You just review the PR.",
    url: "https://watchdocs.dev",
    siteName: "Watchdocs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watchdocs — Automated Docs PRs",
    description:
      "Detects API code changes, edits markdown guides, and submits a PR.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-gh-bg text-slate-100 antialiased selection:bg-gh-green/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
