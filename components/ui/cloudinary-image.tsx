/**
 * components/ui/cloudinary-image.tsx
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Drop-in <CloudinaryImage> that works with:
 *   â€¢ Cloudinary URLs   â†’ injects w_, h_, q_auto, f_auto transformations
 *   â€¢ Supabase URLs     â†’ passes through as-is (graceful fallback)
 *   â€¢ Any other URL     â†’ passes through as-is
 *
 * All <img> tags that show user-uploaded content should use this component so
 * images get optimized automatically when Cloudinary is the source.
 */
"use client";

import React from "react";
import Image, { type ImageProps } from "next/image";
import { cloudinaryService } from "@/services/media/cloudinary";
import { cn } from "@/lib/utils";

interface CloudinaryImageProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  /** Cloudinary crop mode. Defaults to "fill". */
  crop?: "fill" | "fit" | "scale" | "thumb" | "pad";
  /** Gravity for smart cropping. Defaults to "auto". */
  gravity?: "auto" | "face" | "center";
  /** Fallback element or URL when src is empty */
  fallback?: React.ReactNode;
}

export function CloudinaryImage({
  src,
  width,
  height,
  alt = "",
  crop = "fill",
  gravity = "auto",
  className,
  fallback,
  ...rest
}: CloudinaryImageProps) {
  if (!src) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  const optimizedSrc = cloudinaryService.isCloudinaryUrl(src)
    ? cloudinaryService.getOptimizedUrl(src, {
        width:   typeof width === "number" ? width : undefined,
        height:  typeof height === "number" ? height : undefined,
        quality: "auto",
        format:  "auto",
        crop,
        gravity,
      })
    : src;

  return (
    <Image
      src={optimizedSrc}
      width={!rest.fill ? (width || 800) : undefined}
      height={!rest.fill ? (height || 800) : undefined}
      alt={alt}
      className={cn(className)}
      {...rest}
    />
  );
}

/**
 * <CloudinaryAvatar> â€” circular avatar with smart face-crop
 */
export function CloudinaryAvatar({
  src,
  size = 40,
  alt = "Avatar",
  className,
  fallback,
}: {
  src?: string | null;
  size?: number;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  return (
    <CloudinaryImage
      src={src}
      width={size}
      height={size}
      alt={alt}
      crop="thumb"
      gravity="face"
      className={cn("rounded-full object-cover", className)}
      fallback={fallback}
    />
  );
}

/**
 * <CloudinaryVideo> â€” video player with Cloudinary-optimized poster
 */
export function CloudinaryVideo({
  src,
  publicId,
  posterSecond = 0,
  className,
  ...rest
}: React.VideoHTMLAttributes<HTMLVideoElement> & {
  src?: string | null;
  publicId?: string;
  posterSecond?: number;
}) {
  const poster = publicId
    ? cloudinaryService.getVideoThumbnailUrl(publicId, posterSecond)
    : undefined;

  if (!src) return null;

  return (
    <video
      src={src}
      poster={poster}
      className={cn("w-full h-full object-cover", className)}
      {...rest}
    />
  );
}
