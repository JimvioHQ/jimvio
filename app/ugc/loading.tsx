export default function UGCLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4 px-1 py-2">
      <div className="h-8 w-48 rounded-lg bg-[#F3F4F6]" />
      <div className="h-4 w-72 rounded bg-[#F3F4F6]" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[16px] bg-[#F3F4F6]" />
        ))}
      </div>
    </div>
  );
}
