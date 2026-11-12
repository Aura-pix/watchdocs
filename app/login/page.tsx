import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { safeCallbackUrl } from "@/lib/auth/callback";
import SetupNotice from "@/components/app/SetupNotice";
import ThemeToggle from "@/components/ThemeToggle";
import { signInWithGitHub } from "./actions";

export const metadata: Metadata = {
  title: "Sign in — Watchdocs",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  await connection();

  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  if (!isAuthConfigured()) {
    return (
      <SetupNotice
        title="GitHub sign-in is not configured"
        description="Add the GitHub App credentials and an auth secret to .env.local. The App client id and secret are the OAuth credentials in the App settings."
        items={[
          "AUTH_GITHUB_ID",
          "AUTH_GITHUB_SECRET",
          "AUTH_SECRET (generate with npx auth secret)",
        ]}
      />
    );
  }

  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line px-4">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/mark.svg" alt="" width={28} height={28} />
            <span className="text-base font-semibold tracking-tight">
              Watchdocs
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Watchdocs
          </h1>
          <p className="mt-2 text-sm text-muted">
            Use the GitHub account that can install the App on your
            repositories.
          </p>

          <form action={signInWithGitHub} className="mt-8">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4 fill-current"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              Continue with GitHub
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Watchdocs requests read access to your profile so it can confirm
            which installations you can manage.
          </p>
        </div>
      </main>
    </div>
  );
}
