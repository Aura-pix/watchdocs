export default function SetupNotice({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="rounded-xl border border-line bg-surface p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Setup required
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        <ul className="mt-6 space-y-2 text-sm text-ink">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="text-line">/</span>
              <code className="font-mono text-xs">{item}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
