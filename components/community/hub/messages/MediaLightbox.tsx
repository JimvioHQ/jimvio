"use client";

import { Download, X } from "lucide-react";
import { toPlayableCommunityVideoUrl } from "@/lib/community-chat-upload";

export function MediaLightbox({
  url,
  kind,
  onClose,
}: {
  url: string;
  kind: "image" | "video";
  onClose: () => void;
}) {
  const videoSrc = kind === "video" ? toPlayableCommunityVideoUrl(url) : url;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[min(960px,95vw)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 right-0 flex gap-2">
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {kind === "video" ? (
          <video
            src={videoSrc}
            controls
            playsInline
            preload="metadata"
            // muted + autoPlay satisfies mobile autoplay policies; user can unmute
            muted
            autoPlay
            className="max-h-[85vh] max-w-full rounded-2xl"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />
        )}
      </div>
    </div>
  );
}
