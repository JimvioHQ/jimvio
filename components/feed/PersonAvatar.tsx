"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { isUsableAvatarUrl } from "@/lib/feed/post-identity";
import { cn } from "@/lib/utils";

/** Person image with the standard icon when the URL is missing or fails. */
export function PersonAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = isUsableAvatarUrl(url) && !failed;

  if (!showImage) {
    return (
      <span
        role="img"
        aria-label={name}
        className={cn(
          "flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]",
          className,
        )}
      >
        <UserRound className="h-1/2 w-1/2" aria-hidden />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url!}
      alt={name}
      className={cn("rounded-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
