"use client";

export default function MediaAdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-[#eceff3] bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-[#172033]">The editorial desk could not be loaded</h1>
      <p className="mt-2 text-sm text-[#667085]">No article was published by this error.</p>
      <button type="button" onClick={reset} className="mt-5 h-10 rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
