"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, MessageSquare, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HubAvatar } from "@/components/community/hub/hub-ui";
import { canonicalLiveUrl } from "@/lib/live/live-url";
import {
  canUseNativeShare,
  copyTextToClipboard,
  nativeShareLive,
} from "@/lib/live/native-share";
import { LIVE_SHARE_CLIENT_MESSAGE, type LiveShareCode } from "@/lib/live/share-messages";

type ShareThread = {
  id: string;
  kind: "direct" | "group" | "space";
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
  communitySlug: string;
};

export function LiveShareSheet({
  open,
  onOpenChange,
  sessionId,
  title,
  onCopied,
  onMessaged,
  onError,
  communityBound = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  title: string;
  onCopied: () => void;
  onMessaged: (name: string) => void;
  onError: (message: string) => void;
  communityBound?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [threads, setThreads] = useState<ShareThread[]>([]);
  const [q, setQ] = useState("");
  const [nativeAvailable, setNativeAvailable] = useState(false);

  const url = sessionId ? canonicalLiveUrl(sessionId) : "";

  useEffect(() => {
    // Native Share is browser-only; detect after mount to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNativeAvailable(canUseNativeShare());
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setQ("");
    void (async () => {
      try {
        const res = await fetch("/api/c/messages");
        const data = (await res.json()) as { threads?: ShareThread[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load conversations");
        if (!cancelled) {
          setThreads(
            (data.threads ?? []).filter((t) => {
              if (t.kind !== "direct") return false;
              if (!communityBound) return true;
              return Boolean(t.communitySlug);
            })
          );
        }
      } catch {
        if (!cancelled) setThreads([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, communityBound]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.subtitle ?? "").toLowerCase().includes(needle)
    );
  }, [threads, q]);

  async function copyLink() {
    if (!url) {
      onError("No live session to share");
      return;
    }
    const ok = await copyTextToClipboard(url);
    if (!ok) {
      onError("Could not copy the Live link.");
      return;
    }
    setCopied(true);
    onCopied();
    setTimeout(() => setCopied(false), 1600);
  }

  async function nativeShare() {
    if (!url) {
      onError("No live session to share");
      return;
    }
    const result = await nativeShareLive({
      title: title || "Jimvio Live",
      text: "Join this Jimvio Live",
      url,
    });
    if (result === "cancelled") return;
    if (result === "unsupported" || result === "failed") {
      const ok = await copyTextToClipboard(url);
      if (ok) {
        setCopied(true);
        onCopied();
        setTimeout(() => setCopied(false), 1600);
        return;
      }
      onError("Could not share link");
    }
  }

  async function sendTo(thread: ShareThread) {
    if (!sessionId || sendingId) return;
    setSendingId(thread.id);
    try {
      const res = await fetch(`/api/c/live/sessions/${sessionId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: thread.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: LiveShareCode;
      };
      if (!res.ok) {
        const mapped =
          data.code && LIVE_SHARE_CLIENT_MESSAGE[data.code]
            ? LIVE_SHARE_CLIENT_MESSAGE[data.code]
            : data.error ?? LIVE_SHARE_CLIENT_MESSAGE.send_failed;
        onError(mapped);
        return;
      }
      onMessaged(thread.name);
      onOpenChange(false);
    } catch {
      onError(LIVE_SHARE_CLIENT_MESSAGE.send_failed);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Share Live</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] text-[13px] font-semibold hover:bg-[var(--color-surface-secondary)]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          {nativeAvailable && (
            <button
              type="button"
              onClick={() => void nativeShare()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] text-[13px] font-semibold hover:bg-[var(--color-surface-secondary)]"
            >
              <Share2 className="h-4 w-4" />
              Device share
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations…"
            className="mb-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
          />
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              No conversations yet. Copy the link instead.
            </p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={!!sendingId}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--color-surface-secondary)] disabled:opacity-50"
                  onClick={() => void sendTo(t)}
                >
                  <HubAvatar name={t.name} src={t.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{t.name}</p>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                      {t.subtitle ?? "Direct message"}
                    </p>
                  </div>
                  {sendingId === t.id && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
