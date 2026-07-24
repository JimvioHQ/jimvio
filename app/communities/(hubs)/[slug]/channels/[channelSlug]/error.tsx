"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";

/**
 * Channel route error UI — surfaces the real failure; does not swallow it.
 */
export default function ChannelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";
  const home = slug ? `/communities/${slug}` : "/communities";

  useEffect(() => {
    console.error("[ChannelError]", error.message, error.digest ?? "", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
          Channel failed to load
        </h1>
        <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {error.message ||
            "An unexpected error occurred while opening this channel."}
        </p>
        {error.digest ? (
          <p className="font-mono text-[11px] text-[var(--color-text-muted)]">
            Digest: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
        <Link
          href={home}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-surface-secondary)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] transition hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Back to community <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
