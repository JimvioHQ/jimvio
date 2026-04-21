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
      className="fixed inset-0 z-[10001] flex flex-col bg-[var(--color-bg)] animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-room-overlay-title"
    >
      {/* Premium Background Elements */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_140%_100%_at_50%_-20%,rgba(34,197,94,0.08),transparent_50%)]" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-50" />

      <header className="relative z-10 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1.5 sm:px-6 sm:py-2.5 flex items-center gap-3 sm:gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-none border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 hover:scale-105 active:scale-95 transition-all duration-200"
          onClick={onClose}
          aria-label="Back to workspace"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70 leading-none">{communityName}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
             {spaceIcon && <span className="text-base sm:text-lg leading-none w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[var(--color-surface-secondary)] rounded-none border border-[var(--color-border)] shadow-none">{spaceIcon}</span>}
             <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap leading-tight">
                   <span className="text-[11px] font-bold text-[var(--color-text-muted)] tracking-tight">{spaceName}</span>
                   <span className="text-[var(--color-border)] opacity-60 text-xs">/</span>
                   <h1 id="workspace-room-overlay-title" className="text-sm sm:text-base font-black tracking-tight text-[var(--color-text-primary)] truncate">
                     {roomName}
                   </h1>
                </div>
             </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-none shadow-none transition-all duration-300",
              "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] group hover:border-[var(--color-accent)]/40"
            )}
          >
            <Sparkles className="h-3 w-3 text-[var(--color-accent)] animate-pulse" />
            {roomTypeLabel(roomType)}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden bg-[var(--color-bg)]/50 ">
        {children}
      </main>

      {/* Decorative footer-like edge */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-20 shrink-0" />
    </div>
  );

  if (!mounted) return node;
  return createPortal(node, document.body);
}

