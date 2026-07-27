"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Radio, RotateCcw } from "lucide-react";

/** Shared Live Studio error UI — used by route error.tsx files. */
export function LiveStudioErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[live-studio]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f7f8] px-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-neutral-900">
          Live Studio failed to load
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
          {error.message || "An unexpected error stopped the live session page."}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-neutral-400">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
          <Link
            href="/communities/live"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-800"
          >
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Back to Live
          </Link>
        </div>
      </div>
    </div>
  );
}
