import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Watchdocs — Pull requests that keep your docs current",
  description:
    "Watchdocs opens a pull request when your API changes and your docs are out of date. Install the GitHub App, pick a repo, review the PR. Nothing merges on its own.",
  applicationName: "Watchdocs",
  keywords: [
    "developer tools",
    "API documentation",
    "GitHub App",
    "llms.txt",
    "OpenAPI automation",
    "API docs sync",
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
  openGraph: {
    title: "Watchdocs — Pull requests that keep your docs current",
    description:
      "Watchdocs opens a pull request when your API changes and your docs are out of date.",
    url: getSiteUrl(),
    siteName: "Watchdocs",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Watchdocs keeps API documentation current with reviewed pull requests.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Watchdocs — Pull requests that keep your docs current",
    description:
      "Detects API code changes, edits markdown guides, and opens a pull request for review.",
    images: ["/og.png"],
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <body className="bg-paper text-ink antialiased selection:bg-success-soft selection:text-ink">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
