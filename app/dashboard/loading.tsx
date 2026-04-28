"use client";

import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[var(--color-bg)] space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-sm scale-150 animate-pulse" />
        <div className="relative w-12 h-12 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-[11px] font-bold text-stone-900 dark:text-white tracking-[0.3em] pl-[0.3em]">Accessing System</p>
        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Syncing secure nodes...</p>
      </div>
    </div>
  );
}

