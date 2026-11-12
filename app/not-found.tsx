import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        404
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-muted">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
}
