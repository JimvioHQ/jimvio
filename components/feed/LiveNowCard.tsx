import { BadgeCheck, Eye } from "lucide-react";
import { FEATURED_LIVE } from "@/lib/feed/mock-data";
import { getInitials } from "@/lib/utils";

export function LiveNowCard() {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
        <span aria-hidden>🔥</span>
        Live Now
      </h3>

      <div className="relative overflow-hidden rounded-2xl bg-gray-900">
        <img
          src={FEATURED_LIVE.thumbnail}
          alt=""
          className="aspect-[3/4] w-full object-cover"
        />

        {/* Dark gradient overlay for bottom content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Live
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
            {FEATURED_LIVE.viewers}
          </span>
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h4 className="text-[15px] font-semibold leading-snug text-white">
            {FEATURED_LIVE.title}
          </h4>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-semibold text-white ring-1 ring-white/30">
              {getInitials(FEATURED_LIVE.streamer)}
            </span>
            <span className="text-sm font-medium text-white">{FEATURED_LIVE.streamer}</span>
            {FEATURED_LIVE.verified && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                <BadgeCheck className="h-2.5 w-2.5 text-gray-900" strokeWidth={2.5} />
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white">
              {FEATURED_LIVE.category}
            </span>
            {FEATURED_LIVE.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center">
              {FEATURED_LIVE.viewerAvatars.map((initial, index) => (
                <span
                  key={initial}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-900 bg-gray-600 text-[10px] font-semibold text-white"
                  style={{
                    marginLeft: index === 0 ? 0 : -8,
                    zIndex: FEATURED_LIVE.viewerAvatars.length - index,
                  }}
                >
                  {initial}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
              onClick={() => {
                window.location.assign("/communities/live");
              }}
            >
              Join Live
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
