"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function UGCError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ugc]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF4EF]">
        <AlertCircle className="h-6 w-6 text-[var(--color-accent)]" />
      </div>
      <div>
        <p className="text-base font-bold text-[#111827]">Something went wrong</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          The UGC workspace hit an error. Try again or return to campaign discovery.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
        <Link
          href="/ugc"
          className="inline-flex items-center rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151]"
        >
          Discover campaigns
        </Link>
      </div>
    </div>
  );
}
