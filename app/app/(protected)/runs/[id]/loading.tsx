export default function RunDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="h-4 w-24 rounded bg-code" />
      <div className="mt-4 h-9 w-72 rounded bg-code" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 rounded-xl border border-line bg-surface"
          />
        ))}
      </div>
      <div className="mt-10 h-48 rounded-xl border border-line bg-surface" />
    </div>
  );
}
