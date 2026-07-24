"use client";

import Image from "next/image";
import Link from "next/link";
import { Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresencePeer, TypingPeer } from "@/lib/community/presence/use-community-presence";

export function TypingDots({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <p
      className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)]"
      aria-live="polite"
    >
      <span className="inline-flex gap-0.5" aria-hidden>
        <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-accent)] [animation-delay:-0.2s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-accent)] [animation-delay:-0.1s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--color-accent)]" />
      </span>
      {label}…
    </p>
  );
}

export function OnlinePresenceBar({
  peers,
  typing,
  membersHref,
  className,
  maxAvatars = 8,
}: {
  peers: PresencePeer[];
  typing?: TypingPeer[];
  membersHref?: string;
  className?: string;
  maxAvatars?: number;
}) {
  const visible = peers.slice(0, maxAvatars);
  const overflow = Math.max(0, peers.length - visible.length);
  const typingNames = (typing ?? []).map((t) => t.name);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)]",
        "bg-[var(--color-surface)] px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Radio className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-primary)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {peers.length} online now
          </p>
          <TypingDots names={typingNames} />
          {typingNames.length === 0 && (
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Live presence across this community
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center" role="list" aria-label="Online members">
          {visible.map((p, i) => (
            <div
              key={p.userId}
              role="listitem"
              title={p.name}
              className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-secondary)]"
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }}
            >
              {p.avatarUrl ? (
                <Image
                  src={p.avatarUrl}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)]">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {overflow > 0 && (
            <span
              className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] font-bold text-[var(--color-text-secondary)]"
              style={{ marginLeft: -8 }}
            >
              +{overflow}
            </span>
          )}
        </div>
        {membersHref && (
          <Link
            href={membersHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            Members
          </Link>
        )}
      </div>
    </div>
  );
}
