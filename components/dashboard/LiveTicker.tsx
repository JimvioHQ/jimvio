"use client";

import { Radio } from "lucide-react";
import type { TickerItem } from "@/types/dashboard";

interface LiveTickerProps {
  items: TickerItem[];
  onlineCount: number;
}

export function LiveTicker({ items, onlineCount }: LiveTickerProps) {
  const doubled = [...items, ...items];

  return (
    <div className="w-full bg-[#0a0a0a] dark:bg-[#050505] border-b border-[#1e1e1e] overflow-hidden flex items-center h-9">
      {/* LIVE badge */}
      <div className="flex-shrink-0 flex items-center gap-1.5 bg-[#fd5000] text-white text-[10px] font-bold tracking-widest px-3 h-full rounded-r-full">
        <Radio size={10} aria-hidden="true" />
        LIVE
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-track flex items-center whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 mx-8 text-[11px] text-[#888]">
              <span className="text-white font-medium">{item.text}</span>
              <span className="text-[#555]">{item.time}</span>
              <span className="text-[#2a2a2a] mx-2">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Online count */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 text-[11px] text-[#666]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#30a46c] shadow-[0_0_6px_#30a46c]" />
        {onlineCount.toLocaleString()} users online
      </div>
    </div>
  );
}
