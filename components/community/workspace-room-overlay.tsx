"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function roomTypeLabel(roomType: string) {
  switch (roomType) {
    case "chat":
      return "Live chat";
    case "posts":
      return "Posts & discussions";
    case "course":
      return "Course";
    case "tasks":
      return "Tasks";
    case "resources":
      return "Resources";
    default:
      return roomType;
  }
}

export function WorkspaceRoomOverlay({
  communityName,
  spaceName,
  spaceIcon,
  roomName,
  roomType,
  onClose,
  children,
}: {
  communityName: string;
  spaceName: string;
  spaceIcon: string | null;
  roomName: string;
  roomType: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const node = (
    <div
      className="fixed inset-0 z-[10001] flex flex-col bg-[var(--color-bg)] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-room-overlay-title"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(249,115,22,0.08),transparent_55%)]" />
      <header className="relative z-10 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40"
            onClick={onClose}
            aria-label="Back to workspace"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] truncate">{communityName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-lg leading-none w-7 text-center shrink-0">{spaceIcon || "·"}</span>
              <span className="text-xs font-bold text-[var(--color-text-muted)] truncate">{spaceName}</span>
              <span className="text-[var(--color-border)] hidden sm:inline">/</span>
              <h1 id="workspace-room-overlay-title" className="text-base sm:text-lg font-black text-[var(--color-text-primary)] truncate">
                {roomName}
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full",
                "bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/25"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {roomTypeLabel(roomType)}
            </span>
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/25">
            {roomTypeLabel(roomType)}
          </span>
        </div>
      </header>
      <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden">{children}</div>
    </div>
  );

  /* SSR + first client paint: render in-tree so HTML matches. After mount, portal to body for stacking above shell/nav. */
  if (!mounted) return node;
  return createPortal(node, document.body);
}
