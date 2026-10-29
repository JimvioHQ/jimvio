export default function PublicLoading() {
  const box = "animate-pulse rounded-xl bg-[var(--color-surface-secondary,#F3F4F6)]";
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 px-4 py-8 sm:px-6" role="status" aria-label="Loading">
      <div className={`h-10 w-2/3 max-w-md ${box}`} />
      <div className={`h-4 w-full max-w-xl ${box}`} />
      <div className={`h-56 ${box} rounded-2xl`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-32 ${box} rounded-2xl`} />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
