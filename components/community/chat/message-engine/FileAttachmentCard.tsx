"use client";

import Image from "next/image";
import {
  Download,
  ExternalLink,
  FileText,
  FileIcon,
  Film,
  Music,
  Sparkles,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";
import {
  classifyFile,
  formatFileSize,
  type FileKind,
} from "@/lib/community/chat/message-experience";
import { isTrustedChatMediaUrl } from "@/lib/community/chat/sanitize-attachments";
import { WaAudioPlayer } from "../WaAudioPlayer";

const KIND_META: Record<
  FileKind,
  { label: string; icon: typeof FileIcon }
> = {
  image: { label: "Image", icon: FileIcon },
  video: { label: "Video", icon: Film },
  audio: { label: "Audio", icon: Music },
  pdf: { label: "PDF", icon: FileText },
  document: { label: "Document", icon: FileText },
  other: { label: "File", icon: FileIcon },
};

export function FileAttachmentCard({
  attachment,
  isOwn,
  compact,
}: {
  attachment: Attachment;
  isOwn?: boolean;
  compact?: boolean;
}) {
  const kind = classifyFile(attachment);
  const Meta = KIND_META[kind];
  const Icon = Meta.icon;
  const sizeLabel = formatFileSize(
    typeof (attachment as { size?: number }).size === "number"
      ? (attachment as { size?: number }).size
      : null
  );

  if (kind === "image") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-md"
        aria-label={`Open image ${attachment.name || ""}`}
      >
        <Image
          src={attachment.url}
          alt={attachment.name || "Image attachment"}
          width={compact ? 200 : 320}
          height={compact ? 140 : 220}
          className="max-h-56 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          unoptimized
        />
      </a>
    );
  }

  if (kind === "video") {
    return (
      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-black/90">
        <video
          src={attachment.url}
          controls
          preload="metadata"
          className="max-h-56 w-full"
          aria-label={attachment.name || "Video"}
        />
        <FileCardFooter
          name={attachment.name || "Video"}
          kindLabel={Meta.label}
          sizeLabel={sizeLabel}
          url={attachment.url}
          Icon={Icon}
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="min-w-[220px] space-y-1">
        <WaAudioPlayer src={attachment.url} isOwn={isOwn} />
        <FileCardFooter
          name={attachment.name || "Audio"}
          kindLabel={Meta.label}
          sizeLabel={sizeLabel}
          url={attachment.url}
          Icon={Icon}
          subtle
        />
      </div>
    );
  }

  if (kind === "pdf") {
    const trusted = isTrustedChatMediaUrl(attachment.url);
    return (
      <div
        className={cn(
          "w-full max-w-sm overflow-hidden rounded-md border border-[var(--color-border)]",
          "bg-[var(--color-surface)]"
        )}
      >
        {trusted ? (
          <div className="flex aspect-[4/3] max-h-40 items-center justify-center bg-[var(--color-surface-secondary)]">
            <iframe
              title={attachment.name || "PDF preview"}
              src={`${attachment.url}#toolbar=0&navpanes=0`}
              className="h-full w-full"
              loading="lazy"
              sandbox=""
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}
        <FileCardFooter
          name={attachment.name || "PDF"}
          kindLabel={Meta.label}
          sizeLabel={sizeLabel}
          url={attachment.url}
          Icon={Icon}
          future
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col gap-2 rounded-md border border-[var(--color-border)]",
        "bg-[var(--color-surface)] p-3"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {attachment.name || "File"}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {Meta.label}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        </div>
      </div>
      <FileActions url={attachment.url} future />
    </div>
  );
}

function FileCardFooter({
  name,
  kindLabel,
  sizeLabel,
  url,
  Icon,
  subtle,
  future,
}: {
  name: string;
  kindLabel: string;
  sizeLabel: string;
  url: string;
  Icon: typeof FileIcon;
  subtle?: boolean;
  future?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2",
        !subtle && "border-t border-[var(--color-border)]"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary)]">
          {name}
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          {kindLabel}
          {sizeLabel ? ` · ${sizeLabel}` : ""}
        </p>
      </div>
      <FileActions url={url} future={future} />
    </div>
  );
}

function FileActions({ url, future }: { url: string; future?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open file"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={url}
        download
        aria-label="Download file"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
      {future && (
        <>
          <button
            type="button"
            disabled
            title="AI Summary — coming soon"
            aria-label="AI Summary (coming soon)"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--color-text-muted)] opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled
            title="Search in file — coming soon"
            aria-label="Search in file (coming soon)"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--color-text-muted)] opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
