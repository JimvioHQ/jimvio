"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuickActionId } from "./types";

export type SharePayload = {
  type: Exclude<QuickActionId, "ai" | "more">;
  title: string;
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
};

type CourseItem = { id: string; title: string; href: string; community_name?: string };
type SpaceItem = { id: string; name: string; href: string; community_name?: string };

export function ShareActionSheet({
  open,
  action,
  onOpenChange,
  onShare,
}: {
  open: boolean;
  action: Exclude<QuickActionId, "ai" | "more"> | null;
  onOpenChange: (v: boolean) => void;
  onShare: (payload: SharePayload) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [clipUrl, setClipUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [signalPair, setSignalPair] = useState("EURUSD");
  const [signalSide, setSignalSide] = useState("Buy");
  const [signalEntry, setSignalEntry] = useState("");

  useEffect(() => {
    if (!open || !action) return;
    let cancelled = false;
    (async () => {
      if (action === "course") {
        setLoading(true);
        try {
          const res = await fetch("/api/c/courses");
          const data = await res.json();
          if (!cancelled) setCourses(data.courses ?? []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      if (action === "space") {
        setLoading(true);
        try {
          const res = await fetch("/api/c/spaces");
          const data = await res.json();
          if (!cancelled) setSpaces(data.spaces ?? []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, action]);

  const title =
    action === "course"
      ? "Send Course"
      : action === "clip"
        ? "Share Clip"
        : action === "space"
          ? "Invite to Space"
          : action === "product"
            ? "Share Product"
            : action === "signal"
              ? "Share Signal"
              : "Share";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : action === "course" ? (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {courses.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                No courses available
              </p>
            ) : (
              courses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full flex-col rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-left hover:bg-[var(--color-surface-secondary)]"
                  onClick={() =>
                    onShare({
                      type: "course",
                      title: c.title,
                      body: `📚 Course: ${c.title}${c.community_name ? ` · ${c.community_name}` : ""}\n${c.href}`,
                      href: c.href,
                      metadata: { course_id: c.id },
                    })
                  }
                >
                  <span className="text-[13px] font-bold">{c.title}</span>
                  {c.community_name && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {c.community_name}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        ) : action === "space" ? (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {spaces.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                No spaces available
              </p>
            ) : (
              spaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full flex-col rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-left hover:bg-[var(--color-surface-secondary)]"
                  onClick={() =>
                    onShare({
                      type: "space",
                      title: s.name,
                      body: `🚀 You're invited to ${s.name}${s.community_name ? ` in ${s.community_name}` : ""}\n${s.href}`,
                      href: s.href,
                      metadata: { space_id: s.id },
                    })
                  }
                >
                  <span className="text-[13px] font-bold">{s.name}</span>
                  {s.community_name && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {s.community_name}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        ) : action === "clip" ? (
          <div className="space-y-3">
            <input
              value={clipUrl}
              onChange={(e) => setClipUrl(e.target.value)}
              placeholder="Paste clip URL"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
            />
            <button
              type="button"
              disabled={!clipUrl.trim()}
              className="h-10 w-full rounded-xl bg-[var(--color-accent,#fd5000)] text-sm font-bold text-white disabled:opacity-40"
              onClick={() =>
                onShare({
                  type: "clip",
                  title: "Shared clip",
                  body: `🎬 Shared a clip\n${clipUrl.trim()}`,
                  href: clipUrl.trim(),
                })
              }
            >
              Share clip
            </button>
          </div>
        ) : action === "product" ? (
          <div className="space-y-3">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
            />
            <input
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="Product URL (optional)"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
            />
            <button
              type="button"
              disabled={!productName.trim()}
              className="h-10 w-full rounded-xl bg-[var(--color-accent,#fd5000)] text-sm font-bold text-white disabled:opacity-40"
              onClick={() =>
                onShare({
                  type: "product",
                  title: productName.trim(),
                  body: `🛍️ ${productName.trim()}${productUrl.trim() ? `\n${productUrl.trim()}` : ""}`,
                  href: productUrl.trim() || undefined,
                  metadata: { name: productName.trim() },
                })
              }
            >
              Share product
            </button>
          </div>
        ) : action === "signal" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={signalPair}
                onChange={(e) => setSignalPair(e.target.value)}
                placeholder="Pair"
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none"
              />
              <select
                value={signalSide}
                onChange={(e) => setSignalSide(e.target.value)}
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none"
              >
                <option>Buy</option>
                <option>Sell</option>
              </select>
            </div>
            <input
              value={signalEntry}
              onChange={(e) => setSignalEntry(e.target.value)}
              placeholder="Entry / notes"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none"
            />
            <button
              type="button"
              className="h-10 w-full rounded-xl bg-[var(--color-accent,#fd5000)] text-sm font-bold text-white"
              onClick={() =>
                onShare({
                  type: "signal",
                  title: `${signalSide} ${signalPair}`,
                  body: `📈 Signal: ${signalSide} ${signalPair}${signalEntry.trim() ? `\nEntry: ${signalEntry.trim()}` : ""}`,
                  metadata: {
                    pair: signalPair,
                    side: signalSide,
                    entry: signalEntry,
                  },
                })
              }
            >
              Share signal
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
