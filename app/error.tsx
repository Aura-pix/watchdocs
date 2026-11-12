"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Error
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Reload the page. If it keeps happening, check the server logs.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted">{error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
