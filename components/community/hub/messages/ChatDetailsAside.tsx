"use client";

import Link from "next/link";
import {
  Bell,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  MoreHorizontal,
  Phone,
  Pin,
  User,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HubAvatar, HubBadge, HubSectionTitle } from "../hub-ui";
import type { HubChatMessage, HubPeerInfo, HubThread, MediaTabId } from "./types";
import {
  extractLinks,
  formatFileSize,
  isAudioAttachment,
  isImageAttachment,
  isVideoAttachment,
} from "./utils";

function QuickAction({
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
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-black/[0.06] px-1.5 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-[#F7F8FA] hover:text-[var(--color-text-primary)]"
    >
      <Icon className="h-4 w-4" />
      <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
    </button>
  );
}

export function ChatDetailsAside({
  thread,
  peer,
  online,
  messages,
  pinnedCount,
  mediaTab,
  onMediaTabChange,
  notificationsOn,
  onNotificationsChange,
  muted,
  onMutedChange,
  onClose,
  onAudio,
  onVideo,
  onProfile,
  onMute,
  onMore,
  onOpenPinned,
  onOpenMedia,
  className,
}: {
  thread: HubThread;
  peer: HubPeerInfo | null;
  online: boolean;
  messages: HubChatMessage[];
  pinnedCount: number;
  mediaTab: MediaTabId;
  onMediaTabChange: (t: MediaTabId) => void;
  notificationsOn: boolean;
  onNotificationsChange: (v: boolean) => void;
  muted: boolean;
  onMutedChange: (v: boolean) => void;
  onClose: () => void;
  onAudio?: () => void;
  onVideo?: () => void;
  onProfile?: () => void;
  onMute?: () => void;
  onMore?: () => void;
  onOpenPinned?: () => void;
  onOpenMedia?: (url: string, kind: "image" | "video") => void;
  className?: string;
}) {
  const attachments = messages.flatMap((m) =>
    (m.attachments ?? []).map((a, i) => ({
      ...a,
      messageId: m.id,
      messageType: m.message_type,
      body: m.body,
      key: `${m.id}-${i}`,
    }))
  );
  const mediaItems = attachments.filter(
    (a) => isImageAttachment(a) || isVideoAttachment(a)
  );
  const fileItems = attachments.filter(
    (a) =>
      a.mime &&
      !a.mime.startsWith("image/") &&
      !a.mime.startsWith("video/") &&
      !a.mime.startsWith("audio/")
  );
  const voiceItems = attachments.filter((a) =>
    isAudioAttachment(a, a.messageType)
  );
  const links = messages.flatMap((m) =>
    extractLinks(m.body).map((url, i) => ({ url, key: `${m.id}-l-${i}` }))
  );

  const level = peer?.level ?? 1;
  const streak = peer?.streakDays ?? 0;
  const topLabel = peer?.topPercentLabel ?? (level >= 20 ? "Top 5% Creators" : "Creator");

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-y-auto border-l border-black/[0.06] bg-[#FAFBFC] xl:w-[280px] xl:shrink-0",
        className
      )}
      style={{ scrollbarWidth: "thin" }}
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2.5">
        <h2 className="text-[12.5px] font-semibold tracking-tight">About this chat</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:bg-white hover:shadow-sm"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 py-4 text-center">
        <HubAvatar
          name={thread.name}
          src={thread.avatarUrl}
          size={72}
          live={online}
          className="mx-auto ring-2 ring-white shadow-sm"
        />
        <p className="mt-2.5 text-[15px] font-semibold tracking-tight">{thread.name}</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <HubBadge variant="orange">Creator</HubBadge>
          <span
            className={cn(
              "text-[11px] font-medium",
              online ? "text-emerald-600" : "text-[var(--color-text-muted)]"
            )}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
        {peer?.bio && (
          <p className="mt-1.5 text-[12px] leading-snug text-[var(--color-text-secondary)]">
            {peer.bio}
          </p>
        )}
      </div>

      <div className="mx-3 grid grid-cols-3 gap-2 rounded-xl border border-black/[0.04] bg-white p-2.5 text-center shadow-sm">
        <div>
          <p className="text-[13px] font-black">Level {level}</p>
          <p className="text-[9px] text-[var(--color-text-muted)]">Level</p>
        </div>
        <div>
          <p className="text-[13px] font-black">
            {streak} 🔥
          </p>
          <p className="text-[9px] text-[var(--color-text-muted)]">Day Streak</p>
        </div>
        <div>
          <p className="text-[12px] font-black leading-tight">{topLabel.includes("Top") ? topLabel.split(" ")[0] + " " + topLabel.split(" ")[1] : "Top"}</p>
          <p className="text-[9px] text-[var(--color-text-muted)]">🏆 Creators</p>
        </div>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-5 gap-1.5">
        <QuickAction icon={Phone} label="Audio" onClick={onAudio} />
        <QuickAction icon={Video} label="Video" onClick={onVideo} />
        <QuickAction icon={User} label="Profile" onClick={onProfile} />
        <QuickAction icon={muted ? VolumeX : Bell} label="Mute" onClick={onMute} />
        <QuickAction icon={MoreHorizontal} label="More" onClick={onMore} />
      </div>

      <div className="mt-5 space-y-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12px] font-semibold">Notifications</span>
          <Switch checked={notificationsOn} onCheckedChange={onNotificationsChange} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12px] font-semibold">Mute chat</span>
          <Switch checked={muted} onCheckedChange={onMutedChange} />
        </div>
        <button
          type="button"
          onClick={onOpenPinned}
          className="flex w-full items-center justify-between text-[12px] font-semibold text-[var(--color-accent,#fd5000)]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5" />
            Pinned messages ({pinnedCount})
          </span>
          <Info className="h-3.5 w-3.5 opacity-60" />
        </button>
      </div>

      {peer && peer.sharedCommunities.length > 0 && (
        <div className="mt-5 px-4">
          <HubSectionTitle title="Shared in this chat" />
          {peer.sharedCommunities.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="flex items-center justify-between border-t border-[var(--color-border)] py-2.5 first:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold">{c.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {c.messageCount ? `${c.messageCount} messages` : "Community"}
                </p>
              </div>
              <Link2 className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 px-4 pb-6">
        <div className="mb-3 flex gap-3 overflow-x-auto border-b border-[var(--color-border)] scrollbar-hide">
          {(["Media", "Files", "Links", "Voice"] as MediaTabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onMediaTabChange(tab)}
              className={cn(
                "relative shrink-0 pb-2 text-[11px] font-bold transition-colors",
                mediaTab === tab
                  ? "text-[var(--color-accent,#fd5000)]"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              {tab}
              {mediaTab === tab && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--color-accent,#fd5000)]" />
              )}
            </button>
          ))}
        </div>

        {mediaTab === "Media" &&
          (mediaItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaItems.slice(0, 9).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    item.url &&
                    onOpenMedia?.(
                      item.url,
                      isVideoAttachment(item) ? "video" : "image"
                    )
                  }
                  className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]"
                >
                  {item.url && isImageAttachment(item) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : item.url && isVideoAttachment(item) ? (
                    <>
                      <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                        {item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, "0")}` : "0:30"}
                      </span>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-zinc-300" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
              No shared media yet
            </p>
          ))}

        {mediaTab === "Files" &&
          (fileItems.length > 0 ? (
            fileItems.slice(0, 8).map((f) => (
              <div
                key={f.key}
                className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] p-2.5"
              >
                <FileText className="h-4 w-4 shrink-0 text-[var(--color-accent,#fd5000)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{f.name ?? "File"}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {formatFileSize(f.size)}
                  </p>
                </div>
                {f.url && (
                  <a
                    href={f.url}
                    download
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-accent,#fd5000)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
              No files shared yet
            </p>
          ))}

        {mediaTab === "Links" &&
          (links.length > 0 ? (
            links.slice(0, 8).map((l) => (
              <a
                key={l.key}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="mb-2 block truncate rounded-xl border border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-accent,#fd5000)] hover:bg-[var(--color-surface-secondary)]"
              >
                {l.url}
              </a>
            ))
          ) : (
            <p className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
              No links shared yet
            </p>
          ))}

        {mediaTab === "Voice" &&
          (voiceItems.length > 0 ? (
            voiceItems.slice(0, 8).map((v) => (
              <div
                key={v.key}
                className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] p-2.5"
              >
                <Volume2 className="h-4 w-4 text-[var(--color-accent,#fd5000)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">Voice note</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {formatFileSize(v.size)}
                  </p>
                </div>
                {v.url && (
                  <a href={v.url} download className="text-[var(--color-text-muted)]">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-[11px] text-[var(--color-text-muted)]">
              No voice notes yet
            </p>
          ))}
      </div>
    </aside>
  );
}
