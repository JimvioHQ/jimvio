"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Share2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useFeedUser } from "@/lib/feed/use-feed-user";

export type ShareableGroup = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
};

type PostShareMenuProps = {
  postId: string;
  permalinkPath: string;
  defaultCommunityId?: string | null;
  open: boolean;
  onClose: () => void;
  onShared?: () => void;
};

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  if (path.startsWith("http")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function recordShare(
  postId: string,
  type: string,
  communityId?: string | null,
): Promise<{ ok: boolean; error?: string; repost_id?: string | null; duplicate?: boolean }> {
  const res = await fetch(`/api/posts/${postId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, communityId: communityId || undefined }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    repost_id?: string | null;
    duplicate?: boolean;
  };
  if (!res.ok) return { ok: false, error: data.error || "Share failed" };
  return {
    ok: true,
    repost_id: data.repost_id,
    duplicate: data.duplicate,
  };
}

export function PostShareMenu({
  postId,
  permalinkPath,
  defaultCommunityId,
  open,
  onClose,
  onShared,
}: PostShareMenuProps) {
  const { isAuthenticated } = useFeedUser();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"menu" | "groups">("menu");
  const [groups, setGroups] = useState<ShareableGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkFallback, setLinkFallback] = useState<string | null>(null);

  const url = absoluteUrl(permalinkPath);

  useEffect(() => {
    if (!open) {
      setMode("menu");
      setCopied(false);
      setLinkFallback(null);
      setBusy(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    }
    // Defer so the opening click doesn't immediately close.
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointer);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, onClose]);

  const loadGroups = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingGroups(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from("community_memberships")
        .select("community_id, communities(id, name, slug, avatar_url, is_active)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(40);
      type MembershipRow = {
        communities:
          | {
              id: string;
              name: string | null;
              slug: string | null;
              avatar_url: string | null;
              is_active: boolean | null;
            }
          | {
              id: string;
              name: string | null;
              slug: string | null;
              avatar_url: string | null;
              is_active: boolean | null;
            }[]
          | null;
      };
      const rows = ((memberships ?? []) as MembershipRow[])
        .map((m) => {
          const c = Array.isArray(m.communities) ? m.communities[0] : m.communities;
          if (!c || c.is_active === false) return null;
          return {
            id: c.id,
            name: c.name || "Community",
            slug: c.slug || "",
            avatar_url: c.avatar_url ?? null,
          } satisfies ShareableGroup;
        })
        .filter(Boolean) as ShareableGroup[];
      setGroups(rows);
    } finally {
      setLoadingGroups(false);
    }
  }, [isAuthenticated]);

  async function requireAuth(): Promise<boolean> {
    if (isAuthenticated) return true;
    toast.message("Sign in to share");
    return false;
  }

  async function copyLink() {
    setBusy("copy");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied");
        if (isAuthenticated) {
          void recordShare(postId, "copy");
          onShared?.();
        }
      } else {
        setLinkFallback(url);
      }
    } catch {
      setLinkFallback(url);
    } finally {
      setBusy(null);
    }
  }

  async function nativeShare() {
    setBusy("native");
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Jimvio post" });
        if (isAuthenticated) {
          await recordShare(postId, "link");
          onShared?.();
        }
      } else {
        await copyLink();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyLink();
    } finally {
      setBusy(null);
    }
  }

  async function repost() {
    if (!(await requireAuth())) return;
    setBusy("repost");
    try {
      const result = await recordShare(postId, "repost", defaultCommunityId);
      if (!result.ok) {
        toast.error(result.error || "Could not repost");
        return;
      }
      toast.success(result.duplicate ? "Already reposted" : "Reposted");
      onShared?.();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function shareToGroup(communityId: string) {
    if (!(await requireAuth())) return;
    setBusy(communityId);
    try {
      const result = await recordShare(postId, "community", communityId);
      if (!result.ok) {
        toast.error(result.error || "Could not share to group");
        return;
      }
      toast.success(result.duplicate ? "Already shared there" : "Shared to group");
      onShared?.();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  function openExternal(kind: "whatsapp" | "facebook" | "x" | "email") {
    const encoded = encodeURIComponent(url);
    const href =
      kind === "whatsapp"
        ? `https://wa.me/?text=${encoded}`
        : kind === "facebook"
          ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
          : kind === "x"
            ? `https://twitter.com/intent/tweet?url=${encoded}`
            : `mailto:?subject=${encodeURIComponent("Check this on Jimvio")}&body=${encoded}`;
    window.open(href, "_blank", "noopener,noreferrer");
    if (isAuthenticated) {
      void recordShare(postId, kind);
      onShared?.();
    }
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="absolute bottom-full left-0 z-40 mb-2 w-[min(100vw-2rem,280px)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2.5">
        <p id={titleId} className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {mode === "groups" ? "Share to Groups" : "Share"}
        </p>
        <button
          type="button"
          aria-label="Close share menu"
          onClick={onClose}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {mode === "menu" ? (
        <div className="p-1.5">
          <MenuButton
            icon={Copy}
            label={copied ? "Copied" : "Copy link"}
            busy={busy === "copy"}
            done={copied}
            onClick={() => void copyLink()}
          />
          <MenuButton
            icon={Share2}
            label="Share…"
            busy={busy === "native"}
            onClick={() => void nativeShare()}
          />
          <MenuButton
            icon={RefreshCw}
            label="Repost"
            busy={busy === "repost"}
            onClick={() => void repost()}
          />
          <MenuButton
            icon={Users}
            label="Share to Groups"
            onClick={() => {
              if (!isAuthenticated) {
                toast.message("Sign in to share to groups");
                return;
              }
              setMode("groups");
              void loadGroups();
            }}
          />
          <div className="my-1 border-t border-[var(--color-border)]" />
          <MenuButton icon={ExternalLink} label="WhatsApp" onClick={() => openExternal("whatsapp")} />
          <MenuButton icon={Facebook} label="Facebook" onClick={() => openExternal("facebook")} />
          <MenuButton icon={Link2} label="X" onClick={() => openExternal("x")} />
          <MenuButton icon={Mail} label="Email" onClick={() => openExternal("email")} />
          {linkFallback ? (
            <div className="mt-1 rounded-xl bg-[var(--color-surface-secondary)] p-2">
              <p className="mb-1 text-[11px] text-[var(--color-text-muted)]">Select and copy:</p>
              <input
                readOnly
                value={linkFallback}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] text-[var(--color-text-primary)]"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto p-1.5">
          <button
            type="button"
            onClick={() => setMode("menu")}
            className="mb-1 w-full rounded-xl px-3 py-2 text-left text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
          >
            ← Back
          </button>
          {loadingGroups ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[12px]">Loading groups…</span>
            </div>
          ) : groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-[var(--color-text-muted)]">
              Join a community to share there.
            </p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                type="button"
                disabled={busy === g.id}
                onClick={() => void shareToGroup(g.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-[var(--color-surface-secondary)] disabled:opacity-60"
              >
                {g.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFF1EB] text-[11px] font-bold text-[#fd5000]">
                    {g.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                  {g.name}
                </span>
                {busy === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  busy,
  done,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
  done?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-primary)]",
        "hover:bg-[var(--color-surface-secondary)] disabled:opacity-60",
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
      ) : done ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
      )}
      {label}
    </button>
  );
}
