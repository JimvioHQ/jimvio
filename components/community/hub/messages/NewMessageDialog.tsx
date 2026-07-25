"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HubAvatar } from "../hub-ui";
import type { HubThread } from "./types";

export function NewMessageDialog({
  open,
  onOpenChange,
  threads,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  threads: HubThread[];
  onSelect: (threadId: string) => void;
}) {
  const [q, setQ] = useState("");
  const direct = useMemo(() => {
    const list = threads.filter((t) => t.kind === "direct");
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.subtitle?.toLowerCase().includes(needle)
    );
  }, [threads, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">New message</DialogTitle>
        </DialogHeader>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
        />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {direct.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              No direct conversations found
            </p>
          ) : (
            direct.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--color-surface-secondary)]"
                onClick={() => {
                  onSelect(t.id);
                  onOpenChange(false);
                }}
              >
                <HubAvatar name={t.name} src={t.avatarUrl} size={36} live={t.isOnline} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{t.name}</p>
                  <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                    {t.subtitle ?? "Direct message"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
