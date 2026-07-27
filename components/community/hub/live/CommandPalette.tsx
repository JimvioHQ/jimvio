"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  MicOff,
  Monitor,
  Radio,
  Search,
  Share2,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
};

export function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  // Reset filter when palette opens (via remount key from parent)
  const visible = open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[active];
        if (item) {
          item.run();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[18vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-200"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-2xl bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] backdrop-blur-xl",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
        )}
      >
        <div className="flex items-center gap-3 border-b border-black/[0.04] px-4">
          <Search className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Jump to an action…"
            className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
          <kbd className="hidden rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-[320px] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-[12px] text-neutral-400">No matches</li>
          ) : (
            filtered.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    a.run();
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                    MOTION_COLORS,
                    FOCUS_RING,
                    i === active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-50"
                  )}
                >
                  <span className={cn("opacity-70", i === active && "opacity-100")}>{a.icon}</span>
                  <span className="flex-1 text-[13px] font-medium">{a.label}</span>
                  {a.hint && (
                    <span className={cn("text-[10px]", i === active ? "text-white/50" : "text-neutral-400")}>
                      {a.hint}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function defaultLiveCommands(handlers: {
  invite: () => void;
  muteAll: () => void;
  poll: () => void;
  share: () => void;
  record: () => void;
  pauseRecord?: () => void;
  resumeRecord?: () => void;
  analytics: () => void;
  searchPeople: () => void;
  copyLink?: () => void;
}): CommandAction[] {
  const icon = (node: React.ReactNode) => (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/[0.04]">{node}</span>
  );
  const actions: CommandAction[] = [
    {
      id: "invite",
      label: "Invite Speaker",
      hint: "I",
      icon: icon(<UsersRound className="h-3.5 w-3.5" />),
      run: handlers.invite,
    },
    {
      id: "mute-all",
      label: "Mute All",
      icon: icon(<MicOff className="h-3.5 w-3.5" />),
      run: handlers.muteAll,
    },
    {
      id: "poll",
      label: "Start Poll",
      hint: "P",
      icon: icon(<ClipboardList className="h-3.5 w-3.5" />),
      run: handlers.poll,
    },
    {
      id: "share",
      label: "Share Screen",
      hint: "S",
      icon: icon(<Monitor className="h-3.5 w-3.5" />),
      run: handlers.share,
    },
    {
      id: "record",
      label: "Record",
      hint: "R",
      icon: icon(<Radio className="h-3.5 w-3.5" />),
      run: handlers.record,
    },
  ];
  if (handlers.pauseRecord) {
    actions.push({
      id: "pause-record",
      label: "Pause Recording",
      icon: icon(<Radio className="h-3.5 w-3.5" />),
      run: handlers.pauseRecord,
    });
  }
  if (handlers.resumeRecord) {
    actions.push({
      id: "resume-record",
      label: "Resume Recording",
      icon: icon(<Radio className="h-3.5 w-3.5" />),
      run: handlers.resumeRecord,
    });
  }
  actions.push(
    {
      id: "analytics",
      label: "Open Analytics",
      icon: icon(<BarChart3 className="h-3.5 w-3.5" />),
      run: handlers.analytics,
    },
    {
      id: "people",
      label: "Search Participants",
      icon: icon(<Search className="h-3.5 w-3.5" />),
      run: handlers.searchPeople,
    },
    {
      id: "share-link",
      label: "Copy Invite Link",
      icon: icon(<Share2 className="h-3.5 w-3.5" />),
      run: handlers.copyLink ?? handlers.invite,
    },
    {
      id: "users",
      label: "Open People",
      icon: icon(<Users className="h-3.5 w-3.5" />),
      run: handlers.searchPeople,
    }
  );
  return actions;
}
