
// "use client";

// import React from "react";
// import Image, { type ImageProps } from "next/image";
// import { cloudinaryService } from "@/services/media/cloudinary";
// import { cn } from "@/lib/utils";

// interface CloudinaryImageProps extends Omit<ImageProps, "src"> {
//   src?: string | null;
//   /** Cloudinary crop mode. Defaults to "fill". */
//   crop?: "fill" | "fit" | "scale" | "thumb" | "pad";
//   /** Gravity for smart cropping. Defaults to "auto". */
//   gravity?: "auto" | "face" | "center";
//   /** Fallback element or URL when src is empty */
//   fallback?: React.ReactNode;
// }

// export function CloudinaryImage({
//   src,
//   width,
//   height,
//   alt = "",
//   crop = "fill",
//   gravity = "auto",
//   className,
//   fallback,
//   ...rest
// }: CloudinaryImageProps) {
//   if (!src) {
//     if (fallback) return <>{fallback}</>;
//     return null;
//   }

//   const optimizedSrc = cloudinaryService.isCloudinaryUrl(src)
//     ? cloudinaryService.getOptimizedUrl(src, {
//         width:   typeof width === "number" ? width : undefined,
//         height:  typeof height === "number" ? height : undefined,
//         quality: "auto",
//         format:  "auto",
//         crop,
//         gravity,
//       })
//     : src;

//   return (
//     <Image
//       src={optimizedSrc}
//       width={!rest.fill ? (width || 800) : undefined}
//       height={!rest.fill ? (height || 800) : undefined}
//       alt={alt}
//       className={cn(className)}
//       {...rest}
//     />
//   );
// }

// /**
//  * <CloudinaryAvatar> — circular avatar with smart face-crop
//  */
// export function CloudinaryAvatar({
//   src,
//   size = 40,
//   alt = "Avatar",
//   className,
//   fallback,
// }: {
//   src?: string | null;
//   size?: number;
//   alt?: string;
//   className?: string;
//   fallback?: React.ReactNode;
// }) {
//   return (
//     <CloudinaryImage
//       src={src}
//       width={size}
//       height={size}
//       alt={alt}
//       crop="thumb"
//       gravity="face"
//       className={cn("rounded-sm object-cover", className)}
//       fallback={fallback}
//     />
//   );
// }

// /**
//  * <CloudinaryVideo> — video player with Cloudinary-optimized poster
//  */
// export function CloudinaryVideo({
//   src,
//   publicId,
//   posterSecond = 0,
//   className,
//   ...rest
// }: React.VideoHTMLAttributes<HTMLVideoElement> & {
//   src?: string | null;
//   publicId?: string;
//   posterSecond?: number;
// }) {
//   const poster = publicId
//     ? cloudinaryService.getVideoThumbnailUrl(publicId, posterSecond)
//     : undefined;

//   if (!src) return null;

//   return (
//     <video
//       src={src}
//       poster={poster}
//       className={cn("w-full h-full object-cover", className)}
//       {...rest}
//     />
//   );
// }

"use client";

import React, { useState } from "react";
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
  /** Show a skeleton shimmer while the image loads */
  showSkeleton?: boolean;
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
  showSkeleton = true,
  onLoad,
  onError,
  ...rest
}: CloudinaryImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  const isCloudinary = cloudinaryService.isCloudinaryUrl(src);

  const optimizedSrc = isCloudinary
    ? cloudinaryService.getOptimizedUrl(src, {
      width: typeof width === "number" ? width : undefined,
      height: typeof height === "number" ? height : undefined,
      quality: "auto",
      format: "auto",
      crop,
      gravity,
    })
    : src;

  // Low-quality image placeholder — Cloudinary can return a ~200px blurred
  // version we encode as base64 and hand to Next's blur placeholder.
  const blurDataURL =
    isCloudinary && typeof width === "number" && typeof height === "number"
      ? cloudinaryService.getOptimizedUrl(src, {
        width: 20,
        height: Math.round((20 / width) * (height as number)),
        quality: 30,
        format: "auto",
        crop: "fill",
      })
      : undefined;

  return (
    <span
      className={cn("relative inline-block overflow-hidden", className)}
      style={
        !rest.fill && width && height
          ? { width, height }
          : undefined
      }
      aria-busy={!loaded ? "true" : undefined}
    >
      {/* Skeleton shimmer — hidden once the image has loaded */}
      {showSkeleton && !loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse"
          style={{ background: "var(--color-surface-secondary)" }}
        />
      )}

      <Image
        src={optimizedSrc}
        width={!rest.fill ? (width || 800) : undefined}
        height={!rest.fill ? (height || 800) : undefined}
        alt={alt}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setErrored(true);
          onError?.(e);
        }}
        {...rest}
      />
    </span>
  );
}

/* ─────────────────────────────────────────────
   CloudinaryAvatar — circular avatar, face-crop
   ───────────────────────────────────────────── */
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
      className={cn("rounded-sm object-cover", className)}
      fallback={fallback}
    />
  );
}

/* ─────────────────────────────────────────────
   CloudinaryVideo — optimized video player
   ───────────────────────────────────────────── */
export function CloudinaryVideo({
  src,
  publicId,
  posterSecond = 0,
  className,
  fallback,
  ...rest
}: React.VideoHTMLAttributes<HTMLVideoElement> & {
  src?: string | null;
  publicId?: string;
  posterSecond?: number;
  fallback?: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);

// Derive a playback URL from publicId when no src is supplied.
  const resolvedSrc =
    src ?? (publicId ? cloudinaryService.getVideoUrl(publicId) : null);

  const poster = publicId
    ? cloudinaryService.getVideoThumbnailUrl(publicId, posterSecond)
    : undefined;

  if (!resolvedSrc || errored) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  return (
    <video
      src={resolvedSrc}
      poster={poster}
      className={cn("w-full h-full object-cover", className)}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}