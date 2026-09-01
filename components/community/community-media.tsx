"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";
import { safeMediaUrl } from "@/lib/media/optimize-url";

type CoverProps = {
  name: string;
  src?: string | null;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  featured?: boolean;
};

/** Cover image with intentional letter fallback — never shows a broken image. */
export function CommunityCoverImage({
  name,
  src,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 50vw, 20vw",
  featured = false,
}: CoverProps) {
  const [failed, setFailed] = useState(false);
  const url = safeMediaUrl(src, featured ? 800 : 480);
  const showImage = Boolean(url) && !failed;

  if (!showImage) {
    return (
      <CommunityLetterAvatar
        name={name}
        className={cn(
          "absolute inset-0 bg-[var(--color-accent-light)]",
          className
        )}
        textClassName="text-[56px] font-black text-[var(--color-accent)]/90 sm:text-[64px]"
      />
    );
  }

  return (
    <Image
      src={url!}
      alt=""
      fill
      className={cn(
        "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
        imageClassName
      )}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}

type AvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
  size?: number;
};

/** Circular community avatar with letter fallback. */
export function CommunityAvatarImage({
  name,
  src,
  className,
  size = 40,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = safeMediaUrl(src, Math.max(size * 2, 96));
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const showImage = Boolean(url) && !failed;

  if (!showImage) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-[var(--color-accent-light)] font-bold text-[var(--color-accent)]",
          className
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <Image
      src={url!}
      alt=""
      width={size}
      height={size}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

type SafeImageProps = {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fallback?: React.ReactNode;
};

/** Generic image with error fallback for community UI surfaces. */
export function SafeCommunityImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  fallback = null,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const url = safeMediaUrl(src, width ?? 480);

  if (!url || failed) {
    return <>{fallback}</>;
  }

  if (fill) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        unoptimized={!url.includes("res.cloudinary.com")}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={width ?? 96}
      height={height ?? 96}
      className={className}
      unoptimized={!url.includes("res.cloudinary.com")}
      onError={() => setFailed(true)}
    />
  );
}
