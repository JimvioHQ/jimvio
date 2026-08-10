"use client";

import { Loader2, Radio } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useHubLiveRail } from "@/components/feed/use-hub-live-rail";

/**
 * Compact Live Now row — real hub live data (no mocks).
 * Hides when nothing is live / featured.
 */
export function LiveNowCard() {
  const { live, loading } = useHubLiveRail();

  if (loading) {
    return (
      <section className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-6">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden />
        <span className="sr-only">Loading live sessions</span>
      </section>
    );
  }

  if (!live || (!live.live && !live.href)) return null;
  // Prefer true live sessions; featured non-live fallback only when marked live.
  if (!live.live) return null;

  const host = live.host || "Creator";

  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-900">
        <Radio className="h-3 w-3 text-[#FF5A1F]" aria-hidden />
        Live Now
      </h3>

      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="relative h-[72px] w-[72px] shrink-0 bg-zinc-900">
          {live.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={live.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
              <Radio className="h-5 w-5 text-white/35" aria-hidden />
            </div>
          )}
          <span className="absolute left-1 top-1 rounded bg-[#FF5A1F] px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white">
            Live
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2.5 py-2">
          <p className="truncate text-[12px] font-semibold leading-snug text-gray-900">
            {live.title}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[8px] font-semibold text-gray-600">
              {getInitials(host)}
            </span>
            <span className="truncate text-[11px] text-gray-500">{host}</span>
          </div>
          <button
            type="button"
            className="mt-0.5 inline-flex h-7 w-fit items-center rounded-md bg-[#FF5A1F] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#e64e18]"
            onClick={() => {
              window.location.assign(live.href || `/communities/live/${live.id}`);
            }}
          >
            Join Live
          </button>
        </div>
      </div>
    </section>
  );
}
