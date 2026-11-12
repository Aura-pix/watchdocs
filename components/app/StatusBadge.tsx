const TONES: Record<string, string> = {
  opened: "border-success/30 bg-success-soft text-success",
  merged: "border-ink/20 bg-code text-ink",
  closed: "border-line bg-paper text-muted",
  running: "border-line bg-paper text-muted",
  skipped: "border-line bg-paper text-muted",
  failed: "border-danger/30 bg-danger-soft text-danger",
};

const LABELS: Record<string, string> = {
  opened: "PR opened",
  merged: "merged",
  closed: "closed",
  running: "running",
  skipped: "skipped",
  failed: "failed",
};

export default function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? "border-line bg-paper text-muted";
  const label = LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] ${tone}`}
    >
      {label}
    </span>
  );
}
