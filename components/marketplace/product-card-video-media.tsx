"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn, isRenderableImageSrc } from "@/lib/utils";
import {
  productHasVideos,
  resolveProductVideoUrls,
  resolveVideoPlayback,
  type VideoPlayback,
} from "@/lib/product-videos";
import { VideoCommerceEngine } from "@/lib/marketplace/video-commerce-engine";
import {
  ImagePreviewEngine,
  preloadPreviewImages,
} from "@/lib/marketplace/image-preview-engine";

export type ProductVideoSource = {
  product_videos?: Array<{ url?: string | null; video_url?: string | null; sort_order?: number | null; thumbnail_url?: string | null }> | null;
  videos?: unknown;
  source?: string | null;
  description?: string | null;
  source_metadata?: unknown;
};

export interface ProductCardVideoMediaProps {
  productId: string;
  product: ProductVideoSource;
  alt: string;
  imageSrc?: string | null;
  /** Up to 3 renderable image URLs for smart preview (non-video products only) */
  previewImages?: string[];
  className?: string;
  imageClassName?: string;
  /** Image fit — video always uses cover per commerce spec */
  imageFit?: "cover" | "contain";
  hovered?: boolean;
  priority?: boolean;
  sizes?: string;
  imageError?: boolean;
  onImageError?: () => void;
  /** Use next/image when true (default), plain img when false */
  useNextImage?: boolean;
  /** `fill` = absolute inset (default cards); `fit` = contained in padded area (trending grid) */
  layout?: "fill" | "fit";
  fallback?: ReactNode;
  children?: ReactNode;
  grayscale?: boolean;
}

const VISIBILITY_THRESHOLD = 0.2;
const VISIBILITY_THRESHOLDS = [0, 0.1, 0.2, 0.35, 0.5, 0.75, 1];
const CROSSFADE_MS = 300;
const TOUCH_HOLD_MS = 180;

export function ProductCardVideoMedia({
  productId,
  product,
  alt,
  imageSrc,
  previewImages,
  className,
  imageClassName,
  imageFit = "cover",
  hovered = false,
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  imageError = false,
  onImageError,
  useNextImage = true,
  layout = "fill",
  fallback,
  children,
  grayscale = false,
}: ProductCardVideoMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [previewActive, setPreviewActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const hasVideo = useMemo(() => productHasVideos(product), [product]);
  const slideshowImages = useMemo(() => {
    if (hasVideo) return [] as string[];
    const fromProp = (previewImages ?? []).filter(isRenderableImageSrc).slice(0, 3);
    if (fromProp.length > 0) return fromProp;
    if (imageSrc && isRenderableImageSrc(imageSrc)) return [imageSrc];
    return [] as string[];
  }, [hasVideo, previewImages, imageSrc]);
  const enableImagePreview = !hasVideo && slideshowImages.length > 1 && !reducedMotion;
  const videoUrl = useMemo(() => resolveProductVideoUrls(product)[0] ?? null, [product]);
  const playback: VideoPlayback | null = useMemo(
    () => (videoUrl ? resolveVideoPlayback(videoUrl) : null),
    [videoUrl],
  );

  const posterSrc = slideshowImages[0] ?? imageSrc ?? null;
  const isYoutube = playback?.kind === "youtube-embed";
  const showVideoLayer = isActive && hasFrame;

  const clearSlideTimer = useCallback(() => {
    if (slideTimerRef.current) {
      clearInterval(slideTimerRef.current);
      slideTimerRef.current = null;
    }
  }, []);

  const handlePreviewStart = useCallback(() => {
    setPreviewActive(true);
    preloadPreviewImages(slideshowImages.slice(1));
    clearSlideTimer();
    if (slideshowImages.length > 1) {
      setSlideIndex(1);
    } else {
      setSlideIndex(0);
    }
    slideTimerRef.current = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slideshowImages.length);
    }, ImagePreviewEngine.slideIntervalMs);
  }, [slideshowImages, clearSlideTimer]);

  const handlePreviewStop = useCallback(() => {
    clearSlideTimer();
    setPreviewActive(false);
    setSlideIndex(0);
  }, [clearSlideTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncDesktop = () => setIsDesktop(hoverMq.matches);
    const syncMotion = () => setReducedMotion(motionMq.matches);
    syncDesktop();
    syncMotion();
    hoverMq.addEventListener("change", syncDesktop);
    motionMq.addEventListener("change", syncMotion);
    return () => {
      hoverMq.removeEventListener("change", syncDesktop);
      motionMq.removeEventListener("change", syncMotion);
    };
  }, []);

  useEffect(() => {
    if (!enableImagePreview) return;
    const engine = ImagePreviewEngine.getInstance();
    engine.register(productId, {
      onStart: handlePreviewStart,
      onStop: handlePreviewStop,
    });
    return () => {
      engine.unregister(productId);
      clearSlideTimer();
    };
  }, [
    productId,
    enableImagePreview,
    handlePreviewStart,
    handlePreviewStop,
    clearSlideTimer,
  ]);

  useEffect(() => {
    if (!enableImagePreview || !isDesktop) return;
    const engine = ImagePreviewEngine.getInstance();
    if (hovered) engine.requestStart(productId);
    else engine.requestStop(productId);
  }, [hovered, enableImagePreview, isDesktop, productId]);

  const handleActivate = useCallback(() => {
    setIsActive(true);
    const video = videoRef.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setHasFrame(true);
    }
  }, []);

  const handleDeactivate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsActive(false);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!hasVideo) return;

    const engine = VideoCommerceEngine.getInstance();
    engine.register(productId, {
      hasVideo: true,
      onActivate: handleActivate,
      onDeactivate: handleDeactivate,
    });

    return () => engine.unregister(productId);
  }, [productId, hasVideo, handleActivate, handleDeactivate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasVideo) return;

    const engine = VideoCommerceEngine.getInstance();
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0;
        setIsVisible(ratio >= VISIBILITY_THRESHOLD);
        engine.updateVisibility(productId, ratio);
      },
      { threshold: VISIBILITY_THRESHOLDS, rootMargin: "0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      engine.updateVisibility(productId, 0);
      setIsVisible(false);
    };
  }, [productId, hasVideo]);

  useEffect(() => {
    if (!hasVideo) return;
    VideoCommerceEngine.getInstance().setHovered(productId, hovered);
  }, [productId, hovered, hasVideo]);

  // Keep video element mounted — set src once and reuse cached media
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playback || isYoutube || !hasVideo) return;

    const src = playback.src;
    const resolved =
      typeof window !== "undefined"
        ? new URL(src, window.location.origin).href
        : src;
    if (video.src !== resolved) {
      video.src = src;
    }
  }, [playback, isYoutube, hasVideo]);

  // Play immediately when activated — no reload, no remount
  useEffect(() => {
    if (!isActive || !playback || isYoutube) return;

    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setHasFrame(true);
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    return () => {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    };
  }, [isActive, playback, isYoutube]);

  const handleTouchStart = useCallback(() => {
    if (hasVideo) {
      VideoCommerceEngine.getInstance().setTouched(productId, true);
      return;
    }
    if (!enableImagePreview || isDesktop) return;
    if (touchHoldRef.current) clearTimeout(touchHoldRef.current);
    touchHoldRef.current = setTimeout(() => {
      ImagePreviewEngine.getInstance().requestStart(productId);
    }, TOUCH_HOLD_MS);
  }, [hasVideo, enableImagePreview, isDesktop, productId]);

  const handleTouchEnd = useCallback(() => {
    if (touchHoldRef.current) {
      clearTimeout(touchHoldRef.current);
      touchHoldRef.current = null;
    }
    if (hasVideo) {
      VideoCommerceEngine.getInstance().setTouched(productId, false);
      return;
    }
    if (!enableImagePreview || isDesktop) return;
    ImagePreviewEngine.getInstance().requestStop(productId);
  }, [hasVideo, enableImagePreview, isDesktop, productId]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn(
        "overflow-hidden",
        layout === "fill" ? "absolute inset-0" : "relative flex h-full w-full items-center justify-center",
        "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]",
        className,
      )}
      style={{ transform: "translateZ(0)", willChange: isActive ? "opacity" : "auto" }}
    >
      {/* Poster / smart image preview / fallback */}
      {enableImagePreview && !imageError ? (
        slideshowImages.map((src, i) => {
          const visibleIndex = previewActive ? slideIndex : 0;
          const isVisibleLayer = i === visibleIndex;
          const fitClass =
            imageFit === "contain" ? "object-contain object-center" : "object-cover object-center";
          const opacityClass = isVisibleLayer ? "opacity-100" : "opacity-0";
          const sharedClass = cn(
            fitClass,
            "transition-opacity ease-out",
            opacityClass,
            grayscale && "grayscale",
            imageClassName,
          );
          const transitionStyle = {
            transitionDuration: `${CROSSFADE_MS}ms`,
            transform: "translateZ(0)",
          };

          if (useNextImage && layout === "fill") {
            return (
              <Image
                key={`${src}-${i}`}
                src={src}
                alt={i === 0 ? alt : ""}
                aria-hidden={i !== 0}
                fill
                sizes={sizes}
                priority={priority && i === 0}
                className={cn("absolute inset-0", sharedClass)}
                style={transitionStyle}
                onError={i === 0 ? onImageError : undefined}
              />
            );
          }

          if (layout === "fit") {
            return (
              <div
                key={`${src}-${i}`}
                className="absolute inset-0 flex items-center justify-center"
                style={transitionStyle}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={i === 0 ? alt : ""}
                  aria-hidden={i !== 0}
                  loading={i === 0 ? "lazy" : "eager"}
                  decoding="async"
                  className={cn("max-h-full max-w-full", sharedClass)}
                  onError={i === 0 ? onImageError : undefined}
                />
              </div>
            );
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${src}-${i}`}
              src={src}
              alt={i === 0 ? alt : ""}
              aria-hidden={i !== 0}
              loading={i === 0 ? "lazy" : "eager"}
              decoding="async"
              className={cn("absolute inset-0 h-full w-full", sharedClass)}
              style={transitionStyle}
              onError={i === 0 ? onImageError : undefined}
            />
          );
        })
      ) : posterSrc && !imageError ? (
        useNextImage ? (
          <Image
            src={posterSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn(
              imageFit === "contain" ? "object-contain object-center" : "object-cover object-center",
              "transition-opacity duration-200 ease-out",
              showVideoLayer && hasVideo ? "opacity-0" : "opacity-100",
              grayscale && "grayscale",
              imageClassName,
            )}
            onError={onImageError}
          />
        ) : layout === "fit" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "mx-auto max-h-full max-w-full",
              imageFit === "contain" ? "object-contain object-center" : "object-cover object-center",
              "transition-opacity duration-200 ease-out",
              showVideoLayer && hasVideo ? "opacity-0" : "opacity-100",
              grayscale && "grayscale",
              imageClassName,
            )}
            onError={onImageError}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-0 h-full w-full",
              imageFit === "contain" ? "object-contain object-center" : "object-cover object-center",
              "transition-opacity duration-200 ease-out",
              showVideoLayer && hasVideo ? "opacity-0" : "opacity-100",
              grayscale && "grayscale",
              imageClassName,
            )}
            onError={onImageError}
          />
        )
      ) : (
        fallback
      )}

      {/* Native video — always mounted, reused across play cycles */}
      {hasVideo && playback && !isYoutube && (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay={false}
          loop={false}
          controls={false}
          preload={isVisible ? "auto" : "metadata"}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
            "transition-opacity duration-200 ease-out",
            showVideoLayer ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{ transform: "translateZ(0)" }}
          onLoadedData={() => setHasFrame(true)}
          onCanPlay={() => setHasFrame(true)}
          onPlaying={() => {
            setHasFrame(true);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* YouTube — mount when active only */}
      {isActive && isYoutube && playback && (
        <iframe
          src={`${playback.src}?autoplay=1&mute=1&controls=0&playsinline=1&loop=0&modestbranding=1&rel=0`}
          title={alt}
          className="absolute inset-0 h-full w-full border-0 object-cover opacity-100"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
          onLoad={() => {
            setHasFrame(true);
            setIsPlaying(true);
          }}
        />
      )}

      {/* Play icon badge — top-right, hidden while video is playing */}
      {hasVideo && !isPlaying && (
        <span
          className={cn(
            "absolute top-2 right-2 z-30 pointer-events-none",
            "flex size-5 sm:size-6 items-center justify-center rounded-full",
            "bg-[#FF5A1F]",
            "shadow-[0_2px_8px_rgba(255,90,31,0.25)]",
            "transition-opacity duration-150",
          )}
          style={{ transform: "translateZ(0)" }}
          aria-hidden
        >
          <Play className="size-2 sm:size-2.5 fill-white text-white" strokeWidth={0} />
        </span>
      )}

      {children}
    </div>
  );
}
