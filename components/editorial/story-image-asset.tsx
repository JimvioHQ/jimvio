"use client";

import { useState } from "react";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { isAllowedImageHost } from "@/lib/media/image-hosts";

function shouldUseImageOptimizer(src: string): boolean {
  // Local assets are safe to optimize. External editorial images only use the
  // optimizer when their hostname is explicitly allowlisted; all other HTTPS
  // sources load directly, avoiding Next's remote-host rejection while
  // preserving the security boundary that protects the image optimization quota.
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return url.protocol === "https:" && isAllowedImageHost(url.hostname);
  } catch {
    return false;
  }
}

export function StoryImageAsset({
  src,
  alt,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || "Jimvio Media story image unavailable"}
        className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f5f6f8_0%,#e9edf2_55%,#f8f9fb_100%)]"
      >
        <div className="flex flex-col items-center gap-2 text-[#98a2b3]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/75 shadow-sm">
            <Newspaper className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em]">Jimvio Media</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      unoptimized={!shouldUseImageOptimizer(src)}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
      onError={() => setFailed(true)}
    />
  );
}
