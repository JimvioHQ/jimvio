"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  BellOff,
  Copy,
  Flag,
  Link2,
  MoreHorizontal,
  Pin,
  Share2,
  Star,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type WorkspaceActionId =
  | "invite"
  | "share"
  | "copy"
  | "favorite"
  | "mute"
  | "pin"
  | "report";

export type WorkspaceActionItem = {
  id: WorkspaceActionId;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  active?: boolean;
  onSelect?: () => void;
};

/**
 * Premium overflow menu for Groups & Channels — keyboard + ARIA safe.
 */
export function WorkspaceActionMenu({
  label = "More actions",
  items,
  className,
  align = "right",
}: {
  label?: string;
  items: WorkspaceActionItem[];
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full",
          "text-[var(--color-text-muted)] transition",
          "hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
          open && "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute z-40 mt-1.5 min-w-[200px] overflow-hidden rounded-2xl",
            "border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5",
            "shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)]",
            "animate-in fade-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium",
                  "transition hover:bg-[var(--color-surface-secondary)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]",
                  item.danger
                    ? "text-red-600"
                    : "text-[var(--color-text-primary)]",
                  item.active && "text-[var(--color-accent)]"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function buildWorkspaceActions(opts: {
  copyUrl?: string;
  isFavorite?: boolean;
  muted?: boolean;
  pinned?: boolean;
  onInvite?: () => void;
  onFavorite?: () => void;
  onMute?: () => void;
  onPin?: () => void;
  onReport?: () => void;
}): WorkspaceActionItem[] {
  const resolveUrl = () => {
    if (!opts.copyUrl) {
      return typeof window !== "undefined" ? window.location.href : "";
    }
    if (opts.copyUrl.startsWith("http") || typeof window === "undefined") {
      return opts.copyUrl;
    }
    return `${window.location.origin}${opts.copyUrl}`;
  };

  const items: WorkspaceActionItem[] = [];

  if (opts.onInvite) {
    items.push({
      id: "invite",
      label: "Invite people",
      icon: <UserPlus className="h-3.5 w-3.5" />,
      onSelect: opts.onInvite,
    });
  }

  items.push({
    id: "share",
    label: "Share",
    icon: <Share2 className="h-3.5 w-3.5" />,
    onSelect: async () => {
      const url = resolveUrl();
      try {
        if (navigator.share && url) {
          await navigator.share({ url });
          return;
        }
      } catch {
        /* fall through */
      }
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    },
  });

  items.push({
    id: "copy",
    label: "Copy link",
    icon: <Copy className="h-3.5 w-3.5" />,
    onSelect: async () => {
      const url = resolveUrl();
      if (!url) return;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    },
  });

  if (opts.onFavorite) {
    items.push({
      id: "favorite",
      label: opts.isFavorite ? "Remove favorite" : "Favorite",
      icon: <Star className={cn("h-3.5 w-3.5", opts.isFavorite && "fill-amber-400 text-amber-500")} />,
      active: opts.isFavorite,
      onSelect: opts.onFavorite,
    });
  }

  if (opts.onMute) {
    items.push({
      id: "mute",
      label: opts.muted ? "Unmute notifications" : "Mute notifications",
      icon: opts.muted ? (
        <Bell className="h-3.5 w-3.5" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      ),
      onSelect: opts.onMute,
    });
  }

  if (opts.onPin) {
    items.push({
      id: "pin",
      label: opts.pinned ? "Unpin" : "Pin",
      icon: <Pin className="h-3.5 w-3.5" />,
      active: opts.pinned,
      onSelect: opts.onPin,
    });
  }

  items.push({
    id: "report",
    label: "Report",
    icon: <Flag className="h-3.5 w-3.5" />,
    danger: true,
    onSelect:
      opts.onReport ??
      (() => toast.message("Thanks — our team will review this.")),
  });

  return items;
}

/** Decorative empty illustration block — soft brand gradient. */
export function WorkspaceEmptyArt({
  emoji = "✨",
  className,
}: {
  emoji?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem]",
        "bg-gradient-to-br from-[var(--color-accent)]/20 via-[var(--color-surface-secondary)] to-transparent",
        "ring-1 ring-[var(--color-border)]/70",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(253,80,0,0.25),transparent_55%)]" />
      <span className="relative text-[28px]">{emoji}</span>
      <Link2 className="absolute bottom-2 right-2 h-3.5 w-3.5 text-[var(--color-accent)]/50" />
    </div>
  );
}
