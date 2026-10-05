"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Loader2,
  Mail,
  MessageSquare,
  Share2,
  Users,
} from "lucide-react";
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
  roomId?: string | null;
};

function openExternalShare(
  kind: "whatsapp" | "facebook" | "x" | "email",
  url: string,
  title: string
) {
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(`${title || "Jimvio Live"} — ${url}`);
  const href =
    kind === "whatsapp"
      ? `https://wa.me/?text=${text}`
      : kind === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
        : kind === "x"
          ? `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(title || "Jimvio Live")}`
          : `mailto:?subject=${encodeURIComponent(title || "Jimvio Live")}&body=${encoded}`;
  window.open(href, "_blank", "noopener,noreferrer");
}

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
  const [tab, setTab] = useState<"people" | "spaces">("people");

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
    setTab("people");
    void (async () => {
      try {
        const res = await fetch("/api/c/messages");
        const data = (await res.json()) as { threads?: ShareThread[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load conversations");
        if (!cancelled) {
          setThreads(
            (data.threads ?? []).filter((t) => {
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

  const directThreads = useMemo(
    () => threads.filter((t) => t.kind === "direct"),
    [threads]
  );
  const spaceThreads = useMemo(
    () =>
      threads.filter(
        (t) =>
          (t.kind === "group" || t.kind === "space") && Boolean(t.roomId)
      ),
    [threads]
  );

  const list = tab === "people" ? directThreads : spaceThreads;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.subtitle ?? "").toLowerCase().includes(needle)
    );
  }, [list, q]);

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
      const payload =
        thread.kind === "direct"
          ? { conversationId: thread.id }
          : thread.roomId
            ? { roomId: thread.roomId }
            : null;
      if (!payload) {
        onError(LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable);
        return;
      }
      const res = await fetch(`/api/c/live/sessions/${sessionId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          <DialogTitle className="text-lg font-black">Invite to Live</DialogTitle>
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
              Share
            </button>
          )}
        </div>

        {url ? (
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { id: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
                { id: "x" as const, label: "X", icon: Share2 },
                { id: "facebook" as const, label: "Facebook", icon: Facebook },
                { id: "email" as const, label: "Email", icon: Mail },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openExternalShare(item.id, url, title)}
                className="flex flex-col items-center gap-1 rounded-xl border border-[var(--color-border)] px-1 py-2 text-[10px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={() => setTab("people")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                tab === "people"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              Invite user
            </button>
            <button
              type="button"
              onClick={() => setTab("spaces")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
                tab === "spaces"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <Users className="h-3 w-3" />
              Share to Space
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              tab === "spaces" ? "Search spaces…" : "Search conversations…"
            }
            className="mb-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
          />
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              {tab === "spaces"
                ? "No accessible Spaces with chat yet. Copy the link instead."
                : "No conversations yet. Copy the link instead."}
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
                      {t.subtitle ??
                        (t.kind === "direct" ? "Direct message" : "Space")}
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
