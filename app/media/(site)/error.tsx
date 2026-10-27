"use client";

export default function MediaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#172033]">Jimvio Media could not be loaded</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#667085]">
        This page hit an unexpected error. Your place in the rest of Jimvio is unchanged.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
