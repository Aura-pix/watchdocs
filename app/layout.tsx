import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://watchdocs.dev"),
  title: "Watchdocs — Pull requests that keep your docs current",
  description:
    "Watchdocs opens a pull request when your API changes and your docs are out of date. Install the GitHub App, pick a repo, review the PR. Nothing merges on its own.",
  keywords: [
    "developer tools",
    "API documentation",
    "GitHub App",
    "llms.txt",
    "OpenAPI automation",
    "API docs sync",
  ],
  openGraph: {
    title: "Watchdocs — Pull requests that keep your docs current",
    description:
      "Watchdocs opens a pull request when your API changes and your docs are out of date.",
    url: "https://watchdocs.dev",
    siteName: "Watchdocs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watchdocs — Pull requests that keep your docs current",
    description:
      "Detects API code changes, edits markdown guides, and opens a pull request for review.",
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
      <body className="bg-paper text-ink antialiased selection:bg-success-soft selection:text-ink">
        {children}
      </body>
    </html>
  );
}
