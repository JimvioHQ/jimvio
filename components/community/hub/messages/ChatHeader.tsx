"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MoreHorizontal,
  Phone,
  Search,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar, HubBadge } from "../hub-ui";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import type { HubPeerInfo, HubThread } from "./types";

function IconBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#F3F4F6] hover:text-[var(--color-text-primary)]"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ChatHeader({
  thread,
  peer,
  online,
  onBack,
  onAudioCall,
  onVideoCall,
  onSearch,
  onMore,
  onToggleDetails,
  voiceRoomHref,
  participants,
}: {
  thread: HubThread;
  peer: HubPeerInfo | null;
  online: boolean;
  onBack?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onMore?: () => void;
  onToggleDetails?: () => void;
  voiceRoomHref: string;
  participants?: Array<{ id: string; name: string; avatarUrl: string | null }>;
}) {
  const showCreator = thread.kind === "direct" && peer?.isCreator;
  const isSpaceChat = thread.kind === "group";

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] bg-white/90 px-3 py-2 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#F3F4F6] lg:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleDetails}
          className="flex min-w-0 items-center gap-2.5 text-left"
        >
          <HubAvatar
            name={thread.name}
            src={thread.avatarUrl}
            size={36}
            online={online}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                {thread.name}
              </p>
              <BlueVerifiedBadge verified={Boolean(peer?.isVerified)} size="sm" label="Verified account" />
              {showCreator && <HubBadge variant="orange">Creator</HubBadge>}
              {isSpaceChat && <HubBadge variant="default">Space</HubBadge>}
            </div>
            {isSpaceChat && thread.subtitle ? (
              <p className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
                {thread.subtitle}
              </p>
            ) : (
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-semibold",
                  online ? "text-emerald-600" : "text-[var(--color-text-muted)]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    online ? "bg-emerald-500" : "bg-zinc-400"
                  )}
                />
                {online ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <IconBtn icon={Phone} label="Audio call" onClick={onAudioCall} />
        <IconBtn icon={Video} label="Video call" onClick={onVideoCall} />
        <IconBtn icon={Search} label="Search in chat" onClick={onSearch} />
        <IconBtn icon={MoreHorizontal} label="More" onClick={onMore} />

        {participants && participants.length > 0 && (
          <div className="ml-1 hidden items-center -space-x-2 sm:flex">
            {participants.slice(0, 3).map((p) => (
              <HubAvatar
                key={p.id}
                name={p.name}
                src={p.avatarUrl}
                size={28}
                className="ring-2 ring-[var(--color-surface)]"
              />
            ))}
            {participants.length > 3 && (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[10px] font-bold text-[var(--color-text-muted)] ring-2 ring-[var(--color-surface)]">
                +{participants.length - 3}
              </span>
            )}
          </div>
        )}

        <Link
          href={voiceRoomHref}
          className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent,#fd5000)] px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover,#e04700)]"
        >
          <Mic className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Start Voice Room</span>
          <span className="sm:hidden">Voice</span>
        </Link>
      </div>
    </header>
  );
}
