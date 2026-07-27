"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Eye, Loader2, Radio } from "lucide-react";
import { getInitials } from "@/lib/utils";

type LiveHit = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href: string;
};

/**
 * Live Now shelf — public lives from discovery (no mocks).
 * Hides when none are live.
 */
export function LiveNowCard() {
  const [live, setLive] = useState<LiveHit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/discover/recommendations?entity=live&limit=8");
        const json = (await res.json().catch(() => ({}))) as {
          results?: LiveHit[];
          hits?: LiveHit[];
          shelves?: Array<{ items?: LiveHit[] }>;
        };
        if (cancelled) return;
        const hits =
          json.results ??
          json.hits ??
          json.shelves?.flatMap((s) => s.items ?? []) ??
          [];
        const liveNow =
          hits.find((h) => (h.subtitle ?? "").toLowerCase().includes("live now")) ??
          hits.find((h) => h.href?.includes("/live/")) ??
          null;
        setLive(liveNow);
      } catch {
        if (!cancelled) setLive(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <section className="flex items-center justify-center rounded-2xl bg-gray-100 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden />
        <span className="sr-only">Loading live sessions</span>
      </section>
    );
  }

  if (!live) return null;

  const host = live.subtitle && !live.subtitle.toLowerCase().includes("live")
    ? live.subtitle
    : "Creator";

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
        <Radio className="h-3.5 w-3.5 text-orange-500" aria-hidden />
        Live Now
      </h3>

      <div className="relative overflow-hidden rounded-2xl bg-gray-900">
        {live.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={live.imageUrl} alt="" className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            <Radio className="h-12 w-12 text-white/30" aria-hidden />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Live
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
            Live
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h4 className="text-[15px] font-semibold leading-snug text-white">{live.title}</h4>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-semibold text-white ring-1 ring-white/30">
              {getInitials(host)}
            </span>
            <span className="text-sm font-medium text-white">{host}</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
              <BadgeCheck className="h-2.5 w-2.5 text-gray-900" strokeWidth={2.5} />
            </span>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
              onClick={() => {
                window.location.assign(live.href || `/communities/live/${live.id}`);
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
