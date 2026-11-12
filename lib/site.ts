export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://watchdocs.dev").replace(
    /\/$/,
    "",
  );
}
