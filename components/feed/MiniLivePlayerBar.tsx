"use client";

import { useState } from "react";
import Link from "next/link";
import { Pause, Radio, X } from "lucide-react";
import { MINI_LIVE } from "@/lib/feed/mock-data";
import { getInitials } from "@/lib/utils";

export function MiniLivePlayerBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-[calc(240px+1rem)] right-4 z-40 hidden rounded-xl border border-gray-200 bg-white p-2 shadow-md lg:flex lg:items-center lg:gap-3 lg:right-[calc(33%+1rem)] xl:right-[calc(25%+1rem)] 2xl:right-[calc(42%+1rem)]">
      <Link
        href="/communities/live"
        className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-900"
        aria-label="Open live session"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Pause className="h-3 w-3 text-white" fill="white" />
          </span>
        </div>
        <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-red-500 px-1 py-px text-[8px] font-semibold uppercase text-white">
          <Radio className="h-2 w-2" />
          Live
        </span>
      </Link>

      <Link href="/communities/live" className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{MINI_LIVE.title}</p>
        <p className="text-xs text-gray-500">
          {MINI_LIVE.streamer} · {MINI_LIVE.viewers}
        </p>
      </Link>

      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-600">
        {getInitials(MINI_LIVE.streamer)}
      </span>

      <button
        type="button"
        aria-label="Close mini player"
        className="text-gray-400 hover:text-gray-600"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
