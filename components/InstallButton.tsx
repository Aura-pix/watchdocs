export default function InstallButton({
  className = "",
}: {
  className?: string;
}) {
  const installUrl =
    process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ?? "#waitlist";

  return (
    <a
      href={installUrl}
      className={`inline-flex items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 ${className}`}
    >
      Install on GitHub
    </a>
  );
}
