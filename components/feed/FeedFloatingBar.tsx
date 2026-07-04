"use client";

import { Radio, Users } from "lucide-react";
import { FLOATING_FEED_STATS } from "@/lib/feed/mock-data";

export function FeedFloatingBar() {
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 hidden -translate-x-1/2 lg:flex">
      <div className="flex items-center gap-4 rounded-full border border-gray-200 bg-white px-5 py-2.5 shadow-md">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <Users className="h-4 w-4 text-green-500" />
          <span className="font-semibold tabular-nums">{FLOATING_FEED_STATS.creatorsOnline.toLocaleString()}</span>
          creators online
        </span>
        <span className="h-4 w-px bg-gray-200" />
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <Radio className="h-4 w-4 text-red-500" />
          <span className="font-semibold tabular-nums">{FLOATING_FEED_STATS.liveSessions}</span>
          live sessions happening
        </span>
      </div>
    </div>
  );
}
