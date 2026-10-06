export default function LiveSessionLoading() {
  return (
    <div
      className="relative flex h-[calc(100vh-56px)] min-h-[520px] flex-col bg-[#F8FAFC]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200/80 bg-white px-4 py-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="ml-auto h-9 w-24 animate-pulse rounded-full bg-neutral-200" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative m-3 flex-1 animate-pulse rounded-2xl bg-neutral-200/70" />
          <div className="flex items-center justify-center gap-3 px-4 pb-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-12 animate-pulse rounded-full bg-neutral-200"
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading live session</span>
    </div>
  );
}
