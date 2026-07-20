"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  MessageSquareText,
  Scissors,
  ShieldAlert,
  Sparkles,
  Subtitles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION, MOTION_COLORS } from "./studio-ui";

const ACTIONS = [
  { id: "summarize", label: "Summarize chat", icon: MessageSquareText },
  { id: "poll", label: "Generate poll", icon: ClipboardList },
  { id: "announce", label: "Announcement", icon: Sparkles },
  { id: "moments", label: "Highlight moments", icon: Scissors },
  { id: "spam", label: "Detect spam", icon: ShieldAlert },
  { id: "captions", label: "Captions", icon: Subtitles },
] as const;

export function AiFab({
  hidden,
  onAction,
}: {
  hidden?: boolean;
  onAction?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-28 sm:right-5">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto rounded-full bg-neutral-900/90 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
        >
          {toast}
        </div>
      )}

      {open && (
        <div
          role="menu"
          aria-label="Live AI actions"
          className={cn(
            "pointer-events-auto w-[240px] overflow-hidden rounded-2xl bg-white/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
          )}
        >
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <p className="text-[11px] font-medium tracking-[-0.01em] text-neutral-500">AI</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md p-1 text-neutral-400 hover:text-neutral-700",
                MOTION_COLORS,
                FOCUS_RING
              )}
              aria-label="Close AI"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <div className="space-y-0.5 pb-0.5">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onAction?.(a.id);
                  setToast(a.label);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-neutral-50",
                  MOTION_COLORS,
                  FOCUS_RING
                )}
              >
                <a.icon className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.6} aria-hidden />
                <span className="text-[12px] font-medium text-neutral-800">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full",
          "bg-neutral-900/90 text-white backdrop-blur-sm",
          MOTION,
          FOCUS_RING,
          "hover:scale-[1.03] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
          open && "bg-neutral-900"
        )}
        aria-label={open ? "Close Live AI" : "Open Live AI"}
        title="Live AI"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
      </button>
    </div>
  );
}
