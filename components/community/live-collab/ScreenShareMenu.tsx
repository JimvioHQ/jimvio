"use client";

import { Monitor, Presentation, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCREEN_SHARE_QUALITY,
  SCREEN_SHARE_TARGETS,
  useLiveCollabStore,
  type ScreenShareQuality,
  type ScreenShareTarget,
} from "@/lib/community/live-collab";

const TARGET_LABELS: Record<ScreenShareTarget, string> = {
  entire_screen: "Entire screen",
  window: "Window",
  browser_tab: "Browser tab",
};

/**
 * Screen share prefs — media plane still uses getDisplayMedia picker;
 * prefs hint quality + presenter mode.
 */
export function ScreenShareMenu({
  onStart,
  sharing,
  onStop,
  onSwitchSource,
}: {
  onStart: () => void;
  sharing?: boolean;
  onStop?: () => void;
  onSwitchSource?: () => void;
}) {
  const target = useLiveCollabStore((s) => s.shareTarget);
  const quality = useLiveCollabStore((s) => s.shareQuality);
  const presenterMode = useLiveCollabStore((s) => s.presenterMode);
  const setSharePrefs = useLiveCollabStore((s) => s.setSharePrefs);
  const setPresenterMode = useLiveCollabStore((s) => s.setPresenterMode);

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        <Monitor className="h-3.5 w-3.5" />
        Screen share
      </p>
      <div className="flex flex-wrap gap-1">
        {SCREEN_SHARE_TARGETS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSharePrefs(t, quality)}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold",
              target === t
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600"
            )}
          >
            {TARGET_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {SCREEN_SHARE_QUALITY.map((q: ScreenShareQuality) => (
          <button
            key={q}
            type="button"
            onClick={() => setSharePrefs(target, q)}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold capitalize",
              quality === q
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600"
            )}
          >
            {q} quality
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPresenterMode(!presenterMode)}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold",
          presenterMode
            ? "bg-amber-100 text-amber-900"
            : "bg-neutral-100 text-neutral-700"
        )}
      >
        <Presentation className="h-3.5 w-3.5" />
        Presenter mode {presenterMode ? "on" : "off"}
      </button>
      {sharing ? (
        <div className="space-y-1.5">
          {onSwitchSource && (
            <button
              type="button"
              onClick={onSwitchSource}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-2 text-[12px] font-semibold text-neutral-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Change window / tab
            </button>
          )}
          <button
            type="button"
            onClick={onStop}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-[12px] font-semibold text-white"
          >
            Stop sharing
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-[12px] font-semibold text-white"
        >
          Start share
        </button>
      )}
    </div>
  );
}
