export default function MediaLoading() {
  return (
    <div className="mx-auto max-w-[1180px] animate-pulse px-4 py-6 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="min-h-[420px] rounded-2xl bg-[#f2f4f7]" />
        <div className="grid gap-3">
          <div className="min-h-[140px] rounded-2xl bg-[#f2f4f7]" />
          <div className="min-h-[140px] rounded-2xl bg-[#f2f4f7]" />
          <div className="min-h-[140px] rounded-2xl bg-[#f2f4f7]" />
        </div>
      </div>
      <div className="mt-8 h-6 w-40 rounded bg-[#f2f4f7]" />
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="h-40 rounded-2xl bg-[#f2f4f7]" />
        <div className="h-40 rounded-2xl bg-[#f2f4f7]" />
        <div className="h-40 rounded-2xl bg-[#f2f4f7]" />
        <div className="h-40 rounded-2xl bg-[#f2f4f7]" />
      </div>
    </div>
  );
}
