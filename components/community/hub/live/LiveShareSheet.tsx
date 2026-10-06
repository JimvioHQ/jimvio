"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Link2,
  Loader2,
  MessageSquare,
  Radio,
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
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";

type ShareThread = {
  id: string;
  kind: "direct" | "group" | "space";
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
  communitySlug: string;
  roomId?: string | null;
};

type ShareTab = "people" | "spaces" | "communities";

function openExternalShare(
  kind: "whatsapp" | "facebook" | "x" | "telegram",
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
          : `https://t.me/share/url?url=${encoded}&text=${encodeURIComponent(title || "Jimvio Live")}`;
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
  variant = "dialog",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  title: string;
  onCopied: () => void;
  onMessaged: (name: string) => void;
  onError: (message: string) => void;
  communityBound?: boolean;
  /** dialog = modal; panel = embeddable right-rail content */
  variant?: "dialog" | "panel";
}) {
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [threads, setThreads] = useState<ShareThread[]>([]);
  const [q, setQ] = useState("");
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [tab, setTab] = useState<ShareTab>("people");
  const [visibleCount, setVisibleCount] = useState(6);

  const url = sessionId ? canonicalLiveUrl(sessionId) : "";

  useEffect(() => {
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
    setVisibleCount(6);
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
        (t) => t.kind === "space" && Boolean(t.roomId)
      ),
    [threads]
  );
  const communityThreads = useMemo(
    () =>
      threads.filter(
        (t) =>
          t.kind === "group" &&
          Boolean(t.communitySlug) &&
          (Boolean(t.roomId) || Boolean(t.id))
      ),
    [threads]
  );

  const list =
    tab === "people"
      ? directThreads
      : tab === "spaces"
        ? spaceThreads
        : communityThreads;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.subtitle ?? "").toLowerCase().includes(needle) ||
        t.communitySlug.toLowerCase().includes(needle)
    );
  }, [list, q]);

  const visible = filtered.slice(0, visibleCount);

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
            : { conversationId: thread.id };
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

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-4 border-b border-neutral-100 px-1">
        {(
          [
            { id: "people" as const, label: "Invite People" },
            { id: "spaces" as const, label: "Share to Space" },
            { id: "communities" as const, label: "Share to Communities" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setVisibleCount(6);
            }}
            className={cn(
              "shrink-0 border-b-2 px-0.5 pb-2.5 text-[12px] font-semibold",
              MOTION_COLORS,
              FOCUS_RING,
              tab === item.id
                ? "border-[#FF5A1F] text-[#FF5A1F]"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "people" || tab === "spaces" || tab === "communities" ? (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              tab === "people"
                ? "Search users, friends, or email..."
                : tab === "spaces"
                  ? "Search spaces..."
                  : "Search communities..."
            }
            className={cn(
              "mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:ring-2 focus:ring-[#FF5A1F]/20",
              FOCUS_RING
            )}
          />

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">
                {tab === "spaces"
                  ? "No accessible Spaces with chat yet. Copy the link instead."
                  : tab === "communities"
                    ? "No community chats available yet. Copy the link instead."
                    : "No conversations yet. Copy the link instead."}
              </p>
            ) : (
              <div className="space-y-0.5">
                {visible.map((t) => (
                  <div
                    key={t.id}
                    className="flex w-full min-w-0 items-center gap-3 rounded-xl px-1 py-2"
                  >
                    <HubAvatar name={t.name} src={t.avatarUrl} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate whitespace-nowrap text-[13px] font-semibold text-neutral-900">
                        {t.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!!sendingId}
                      onClick={() => void sendTo(t)}
                      className={cn(
                        "shrink-0 rounded-full bg-[#FF5A1F] px-3.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50",
                        FOCUS_RING
                      )}
                    >
                      {sendingId === t.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : tab === "people" ? (
                        "Invite"
                      ) : (
                        "Share"
                      )}
                    </button>
                  </div>
                ))}
                {filtered.length > visibleCount ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + 8)}
                    className="mt-1 w-full py-2 text-center text-[12px] font-semibold text-neutral-500 hover:text-neutral-800"
                  >
                    Show more
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <p className="mb-2 text-[12px] font-semibold text-neutral-900">Share Invite Link</p>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <p className="min-w-0 flex-1 truncate text-[12px] text-neutral-600">{url || "—"}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-neutral-800",
              FOCUS_RING
            )}
            aria-label="Copy invite link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <ShareTile
            label="Share to Space"
            active={tab === "spaces"}
            onClick={() => setTab("spaces")}
            icon={<Radio className="h-4 w-4" />}
          />
          <ShareTile
            label="Share to Communities"
            active={tab === "communities"}
            onClick={() => setTab("communities")}
            icon={<Users className="h-4 w-4" />}
          />
          <ShareTile
            label="Copy Link"
            onClick={() => void copyLink()}
            icon={<Link2 className="h-4 w-4" />}
          />
          {nativeAvailable ? (
            <ShareTile
              label="More"
              onClick={() => void nativeShare()}
              icon={<Share2 className="h-4 w-4" />}
            />
          ) : (
            <ShareTile
              label="WhatsApp"
              onClick={() => url && openExternalShare("whatsapp", url, title)}
              icon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
            />
          )}
          <ShareTile
            label="WhatsApp"
            onClick={() => url && openExternalShare("whatsapp", url, title)}
            icon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
          />
          <ShareTile
            label="X"
            onClick={() => url && openExternalShare("x", url, title)}
            icon={<Share2 className="h-4 w-4" />}
          />
          <ShareTile
            label="Facebook"
            onClick={() => url && openExternalShare("facebook", url, title)}
            icon={<Facebook className="h-4 w-4 text-blue-600" />}
          />
          <ShareTile
            label="Telegram"
            onClick={() => url && openExternalShare("telegram", url, title)}
            icon={<MessageSquare className="h-4 w-4 text-sky-500" />}
          />
        </div>
      </div>
    </div>
  );

  if (variant === "panel") {
    if (!open) return null;
    return <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-1">{body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-hidden border-neutral-200 bg-white p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-neutral-100 px-4 py-3.5">
          <DialogTitle className="text-[15px] font-semibold text-neutral-900">
            Invite & Share
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(72vh,640px)] overflow-y-auto px-4 pb-4 pt-3">{body}</div>
      </DialogContent>
    </Dialog>
  );
}

function ShareTile({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[10px] font-semibold text-neutral-600",
        FOCUS_RING,
        active
          ? "border-[#FF5A1F] bg-[#FF5A1F]/5 text-[#FF5A1F]"
          : "border-neutral-200 hover:bg-neutral-50"
      )}
    >
      {icon}
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </button>
  );
}
