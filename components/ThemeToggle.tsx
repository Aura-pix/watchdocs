"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:text-ink ${className}`}
    >
      {dark ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 fill-current"
        >
          <path d="M10 2.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V3.25A.75.75 0 0 1 10 2.5Zm4.95 2.55a.75.75 0 0 1 0 1.06l-.88.88a.75.75 0 1 1-1.06-1.06l.88-.88a.75.75 0 0 1 1.06 0Zm-9.9 0a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-7.5 4a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H3.25A.75.75 0 0 1 2.5 10Zm12.5 0a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5h-1.25a.75.75 0 0 1-.75-.75Zm-9.39 4.61a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06Zm6.36 0a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06ZM10 15.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0v-1.25a.75.75 0 0 1 .75-.75Z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 fill-current"
        >
          <path d="M15.6 12.4a6.25 6.25 0 0 1-8.36-8.36A6.75 6.75 0 1 0 15.6 12.4Z" />
        </svg>
      )}
    </button>
  );
}
