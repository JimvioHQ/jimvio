"use client";

import { cn } from "@/lib/utils";
import { safeMediaUrl } from "@/lib/media/optimize-url";

type SpaceAvatarProps = {
  name: string;
  src?: string | null;
  icon?: string | null;
  size?: number;
  className?: string;
};

/**
 * Polished Space avatar — image (including parent community logo via
 * resolveSpaceAvatarSrc), emoji icon, or neutral initials as last resort.
 */
export function SpaceAvatar({
  name,
  src,
  icon,
  size = 36,
  className,
}: SpaceAvatarProps) {
  const letter = (name.trim()[0] || "S").toUpperCase();
  const image = safeMediaUrl(src, Math.max(size * 2, 96));
  const emoji = icon && !/^https?:\/\//i.test(icon) ? icon : null;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        "bg-[var(--color-accent)] text-white",
        "ring-1 ring-black/[0.08] dark:ring-white/15",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`${name} space`}
          className="h-full w-full object-cover"
        />
      ) : emoji ? (
        <span
          className="leading-none"
          style={{ fontSize: Math.round(size * 0.44) }}
        >
          {emoji}
        </span>
      ) : (
        <span
          className="font-bold leading-none"
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          {letter}
        </span>
      )}
    </span>
  );
}
