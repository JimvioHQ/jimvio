// "use client";

// import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
// import { Zap, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
// import { cn, ImageInput, normalizeImages } from "@/lib/utils";

// interface ImageGalleryProps {
//     images: ImageInput;
//     productName: string;
//     isFeatured?: boolean;
//     savings?: number | null;
//     className?: string;
// }

// function useZoom() {
//     const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

//     const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
//         const rect = e.currentTarget.getBoundingClientRect();
//         const x = ((e.clientX - rect.left) / rect.width) * 100;
//         const y = ((e.clientY - rect.top) / rect.height) * 100;
//         setZoom({ active: true, x, y });
//     }, []);

//     const onLeave = useCallback(() => {
//         setZoom((z) => ({ ...z, active: false }));
//     }, []);

//     return { zoom, onMove, onLeave };
// }

// /* ─── Thumbnail strip ────────────────────────────────────────────────── */
// function Thumbnail({
//     src,
//     index,
//     active,
//     onClick,
// }: {
//     src: string;
//     index: number;
//     active: boolean;
//     onClick: () => void;
// }) {
//     return (
//         <button
//             onClick={onClick}
//             aria-label={`View image ${index + 1}`}
//             className={cn(
//                 "relative flex-shrink-0 w-[68px] h-[68px] overflow-hidden transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-foreground",
//                 active
//                     ? "ring-1 ring-foreground ring-offset-1 ring-offset-background opacity-100"
//                     : "opacity-40 hover:opacity-75"
//             )}
//         >
//             <img
//                 src={src}
//                 alt=""
//                 className="w-full h-full object-contain bg-card p-1.5"
//                 draggable={false}
//             />
//             <span
//                 className={cn(
//                     "absolute bottom-0 inset-x-0 h-[2px] transition-all duration-300",
//                     active ? "bg-foreground" : "bg-transparent"
//                 )}
//             />
//         </button>
//     );
// }

// /* ─── Main component ─────────────────────────────────────────────────── */
// export function ImageGallery({
//     images: imagesInput,
//     productName,
//     isFeatured,
//     savings,
//     className,
// }: ImageGalleryProps) {

//     const images = useMemo(() => normalizeImages(imagesInput), [imagesInput]);

//     const [activeIndex, setActiveIndex] = useState(0);
//     const [imageLoaded, setImageLoaded] = useState(false);
//     const [showZoomHint, setShowZoomHint] = useState(true);
//     const stripRef = useRef<HTMLDivElement>(null);
//     const { zoom, onMove, onLeave } = useZoom();

//     // Clamp activeIndex if the images array shrinks
//     useEffect(() => {
//         if (activeIndex >= images.length) {
//             setActiveIndex(0);
//         }
//     }, [images.length, activeIndex]);

//     const mainImage = images[activeIndex] ?? null;
//     const hasMultiple = images.length > 1;

//     const handleFirstHover = useCallback(() => {
//         setShowZoomHint(false);
//     }, []);

//     useEffect(() => {
//         setImageLoaded(false);
//     }, [activeIndex]);

//     useEffect(() => {
//         if (!stripRef.current) return;
//         const btn = stripRef.current.children[activeIndex] as HTMLElement;
//         btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
//     }, [activeIndex]);

//     useEffect(() => {
//         const handler = (e: KeyboardEvent) => {
//             if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(0, i - 1));
//             if (e.key === "ArrowRight")
//                 setActiveIndex((i) => Math.min(images.length - 1, i + 1));
//         };
//         window.addEventListener("keydown", handler);
//         return () => window.removeEventListener("keydown", handler);
//     }, [images.length]);

//     const prev = () => setActiveIndex((i) => Math.max(0, i - 1));
//     const next = () => setActiveIndex((i) => Math.min(images.length - 1, i + 1));

//     return (
//         <div className={cn("flex flex-col gap-3", className)}>
//             {/* ── Main image ─────────────────────────────────────────────── */}
//             <div
//                 className="relative aspect-square bg-card overflow-hidden select-none cursor-none group"
//                 style={{ isolation: "isolate" }}
//                 onMouseMove={(e) => {
//                     onMove(e);
//                     handleFirstHover();
//                 }}
//                 onMouseLeave={onLeave}
//             >
//                 <div
//                     className="absolute inset-0 opacity-[0.03] pointer-events-none"
//                     style={{
//                         backgroundImage:
//                             "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
//                         backgroundSize: "32px 32px",
//                     }}
//                 />

//                 {mainImage ? (
//                     <>
//                         {!imageLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}

//                         {zoom.active && (
//                             <div
//                                 className="absolute inset-0 pointer-events-none"
//                                 style={{
//                                     backgroundImage: `url(${mainImage})`,
//                                     backgroundSize: "250%",
//                                     backgroundPosition: `${zoom.x}% ${zoom.y}%`,
//                                     backgroundRepeat: "no-repeat",
//                                     opacity: 1,
//                                     zIndex: 5,
//                                 }}
//                             />
//                         )}

//                         <img
//                             key={mainImage}
//                             src={mainImage}
//                             alt={productName}
//                             onLoad={() => setImageLoaded(true)}
//                             className={cn(
//                                 "absolute inset-0 w-full h-full object-contain p-6 transition-opacity duration-300",
//                                 imageLoaded ? "opacity-100" : "opacity-0",
//                                 zoom.active ? "opacity-0" : "opacity-100"
//                             )}
//                             draggable={false}
//                         />
//                     </>
//                 ) : (
//                     <div className="w-full h-full flex items-center justify-center bg-muted">
//                         <span className="text-[120px] font-black text-muted-foreground/10 uppercase leading-none select-none">
//                             {productName[0]}
//                         </span>
//                     </div>
//                 )}

//                 {mainImage && (
//                     <div
//                         className="pointer-events-none absolute z-20 transition-opacity duration-150"
//                         style={{
//                             left: `${zoom.x}%`,
//                             top: `${zoom.y}%`,
//                             transform: "translate(-50%, -50%)",
//                             opacity: zoom.active ? 1 : 0,
//                         }}
//                     >
//                         <div className="relative w-8 h-8">
//                             <span className="absolute inset-0 m-auto w-[1px] h-full bg-foreground/60" />
//                             <span className="absolute inset-0 m-auto h-[1px] w-full bg-foreground/60" />
//                             <span className="absolute inset-0 rounded-full border border-foreground/30 scale-150" />
//                         </div>
//                     </div>
//                 )}

//                 <div className="absolute top-0 left-0 flex flex-col gap-px z-10">
//                     {savings != null && savings > 0 && (
//                         <span className="bg-foreground text-background text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 leading-none">
//                             −{savings}%
//                         </span>
//                     )}
//                     {isFeatured && (
//                         <span className="bg-[#fd5000] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 leading-none flex items-center gap-1.5">
//                             <Zap className="h-2.5 w-2.5 fill-white stroke-none" /> Hot
//                         </span>
//                     )}
//                 </div>

//                 {mainImage && showZoomHint && (
//                     <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
//                         <ZoomIn className="h-3 w-3" />
//                         Hover to zoom
//                     </div>
//                 )}

//                 {hasMultiple && (
//                     <div className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-sm border border-border px-2 py-1 text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
//                         {activeIndex + 1}/{images.length}
//                     </div>
//                 )}
//                 {hasMultiple && (
//                     <>
//                         <button
//                             onClick={prev}
//                             disabled={activeIndex === 0}
//                             className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-0 hover:bg-background"
//                             aria-label="Previous image"
//                         >
//                             <ChevronLeft className="h-4 w-4" />
//                         </button>
//                         <button
//                             onClick={next}
//                             disabled={activeIndex === images.length - 1}
//                             className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-0 hover:bg-background"
//                             aria-label="Next image"
//                         >
//                             <ChevronRight className="h-4 w-4" />
//                         </button>
//                     </>
//                 )}
//             </div>

//             {/* ── Thumbnail strip ─────────────────────────────────────────── */}
//             {hasMultiple && (
//                 <div
//                     ref={stripRef}
//                     className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5"
//                     style={{ scrollbarWidth: "none" }}
//                     role="tablist"
//                     aria-label="Product images"
//                 >
//                     {images.map((img, i) => (
//                         <Thumbnail
//                             key={i}
//                             src={img}
//                             index={i}
//                             active={i === activeIndex}
//                             onClick={() => setActiveIndex(i)}
//                         />
//                     ))}
//                 </div>
//             )}

//             {/* ── Dot indicators for mobile (hidden on md+) ────────────────── */}
//             {hasMultiple && (
//                 <div className="flex justify-center gap-1.5 md:hidden">
//                     {images.map((_, i) => (
//                         <button
//                             key={i}
//                             onClick={() => setActiveIndex(i)}
//                             className={cn(
//                                 "transition-all duration-300 rounded-full",
//                                 i === activeIndex ? "w-4 h-1.5 bg-foreground" : "w-1.5 h-1.5 bg-foreground/20"
//                             )}
//                             aria-label={`Go to image ${i + 1}`}
//                         />
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// }
"use client";

import React, {
    useState, useRef, useCallback, useEffect, useMemo, useId,
} from "react";
import { Zap, ZoomIn, ChevronLeft, ChevronRight, X, Maximize2, Play } from "lucide-react";
import { cn, ImageInput, normalizeImages } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageGalleryProps {
    images: ImageInput;
    productName: string;
    isFeatured?: boolean;
    savings?: number | null;
    className?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useZoom() {
    const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

    const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoom({ active: true, x, y });
    }, []);

    const onLeave = useCallback(() => {
        setZoom((z) => ({ ...z, active: false }));
    }, []);

    return { zoom, onMove, onLeave };
}

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
    const startX = useRef<number | null>(null);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) {
            dx < 0 ? onSwipeLeft() : onSwipeRight();
        }
        startX.current = null;
    }, [onSwipeLeft, onSwipeRight]);

    return { onTouchStart, onTouchEnd };
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
    images,
    activeIndex,
    productName,
    onClose,
    onPrev,
    onNext,
}: {
    images: string[];
    activeIndex: number;
    productName: string;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onPrev();
            if (e.key === "ArrowRight") onNext();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose, onPrev, onNext]);

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: "rgba(0,0,0,0.95)" }}
            onClick={onClose}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-[12px] font-semibold text-white/60 truncate max-w-[60%]">{productName}</p>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-white/40">{activeIndex + 1} / {images.length}</span>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                        <X className="h-4 w-4 text-white/80" />
                    </button>
                </div>
            </div>

            {/* Main image */}
            <div
                className="flex-1 flex items-center justify-center relative overflow-hidden px-16"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    key={activeIndex}
                    src={images[activeIndex]}
                    alt={`${productName} ${activeIndex + 1}`}
                    className="max-w-full max-h-full object-contain select-none"
                    style={{ animation: "fadeIn 0.2s ease" }}
                    draggable={false}
                />

                {images.length > 1 && (
                    <>
                        <button
                            onClick={onPrev}
                            disabled={activeIndex === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-0"
                            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                        >
                            <ChevronLeft className="h-5 w-5 text-white" />
                        </button>
                        <button
                            onClick={onNext}
                            disabled={activeIndex === images.length - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-0"
                            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                        >
                            <ChevronRight className="h-5 w-5 text-white" />
                        </button>
                    </>
                )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div
                    className="shrink-0 py-3 px-4 flex justify-center gap-2 overflow-x-auto"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => {/* handled via parent index */ }}
                            className={cn(
                                "h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all",
                                i === activeIndex
                                    ? "border-white opacity-100"
                                    : "border-transparent opacity-40 hover:opacity-70",
                            )}
                        >
                            <img src={img} alt="" className="w-full h-full object-contain bg-white/5 p-1" draggable={false} />
                        </button>
                    ))}
                </div>
            )}

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
    );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function Thumbnail({
    src,
    index,
    active,
    onClick,
}: {
    src: string;
    index: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={`View image ${index + 1}`}
            className={cn(
                "relative flex-shrink-0 w-[64px] h-[64px] rounded-lg overflow-hidden transition-all duration-200 outline-none",
                "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
            )}
            style={{
                border: active
                    ? "2px solid var(--color-text-primary)"
                    : "2px solid var(--color-border)",
                background: "var(--color-surface)",
                opacity: active ? 1 : 0.55,
            }}
        >
            <img
                src={src}
                alt=""
                className="w-full h-full object-contain p-1.5 transition-transform duration-200 hover:scale-105"
                draggable={false}
            />
            {/* Active indicator bar */}
            <span
                className="absolute bottom-0 inset-x-0 h-[2px] transition-all duration-300"
                style={{ background: active ? "var(--color-text-primary)" : "transparent" }}
            />
        </button>
    );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function ImageSkeleton() {
    return (
        <div
            className="absolute inset-0 animate-pulse"
            style={{ background: "var(--color-surface-secondary)" }}
        >
            <div
                className="absolute inset-0"
                style={{
                    background: "linear-gradient(90deg, transparent 0%, var(--color-border) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                }}
            />
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImageGallery({
    images: imagesInput,
    productName,
    isFeatured,
    savings,
    className,
}: ImageGalleryProps) {
    const images = useMemo(() => normalizeImages(imagesInput), [imagesInput]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [zoomHintDismissed, setZoomHintDismissed] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [prevIndex, setPrevIndex] = useState(0);

    const stripRef = useRef<HTMLDivElement>(null);
    const { zoom, onMove, onLeave } = useZoom();

    // Clamp activeIndex
    useEffect(() => {
        if (activeIndex >= images.length && images.length > 0) {
            setActiveIndex(0);
        }
    }, [images.length, activeIndex]);

    // Reset loaded state on image change
    useEffect(() => {
        setImageLoaded(false);
        setPrevIndex(activeIndex);
    }, [activeIndex]);

    // Scroll active thumbnail into view
    useEffect(() => {
        if (!stripRef.current) return;
        const btn = stripRef.current.children[activeIndex] as HTMLElement;
        btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, [activeIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (lightboxOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setActiveIndex((i) => Math.min(images.length - 1, i + 1));
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [images.length, lightboxOpen]);

    const prev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
    const next = useCallback(() => setActiveIndex((i) => Math.min(images.length - 1, i + 1)), [images.length]);

    const { onTouchStart, onTouchEnd } = useSwipe(next, prev);

    const mainImage = images[activeIndex] ?? null;
    const hasMultiple = images.length > 1;

    const handleMouseEnter = useCallback(() => {
        setZoomHintDismissed(true);
    }, []);

    return (
        <>
            <div className={cn("flex flex-col gap-3", className)}>

                {/* ── Main image ──────────────────────────────────────────────── */}
                <div
                    className="relative overflow-hidden select-none group"
                    style={{
                        aspectRatio: "1 / 1",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        isolation: "isolate",
                        cursor: zoom.active ? "none" : "crosshair",
                    }}
                    onMouseMove={(e) => { onMove(e); handleMouseEnter(); }}
                    onMouseLeave={onLeave}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Subtle grid texture */}
                    <div
                        className="absolute inset-0 opacity-[0.025] pointer-events-none z-0"
                        style={{
                            backgroundImage:
                                "linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                    />

                    {mainImage ? (
                        <>
                            {/* Skeleton */}
                            {!imageLoaded && <ImageSkeleton />}

                            {/* Zoom layer */}
                            <div
                                className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100"
                                style={{
                                    backgroundImage: `url(${mainImage})`,
                                    backgroundSize: "280%",
                                    backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                                    backgroundRepeat: "no-repeat",
                                    opacity: zoom.active && imageLoaded ? 1 : 0,
                                }}
                            />

                            {/* Main image */}
                            <img
                                key={mainImage}
                                src={mainImage}
                                alt={productName}
                                onLoad={() => setImageLoaded(true)}
                                className="absolute inset-0 w-full h-full object-contain p-6 transition-opacity duration-300 z-[1]"
                                style={{ opacity: zoom.active ? 0 : imageLoaded ? 1 : 0 }}
                                draggable={false}
                            />
                        </>
                    ) : (
                        /* Placeholder */
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: "var(--color-surface-secondary)" }}
                        >
                            <span
                                className="text-[100px] font-black uppercase leading-none select-none"
                                style={{ color: "var(--color-border-strong)", opacity: 0.3 }}
                            >
                                {productName[0]}
                            </span>
                        </div>
                    )}

                    {/* Custom zoom crosshair cursor */}
                    {mainImage && zoom.active && (
                        <div
                            className="pointer-events-none absolute z-20"
                            style={{
                                left: `${zoom.x}%`,
                                top: `${zoom.y}%`,
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            <div className="relative w-8 h-8">
                                <span className="absolute inset-0 m-auto w-[1px] h-full bg-white/50" />
                                <span className="absolute inset-0 m-auto h-[1px] w-full bg-white/50" />
                                <span
                                    className="absolute inset-0 rounded-full scale-150"
                                    style={{ border: "1px solid rgba(255,255,255,0.25)" }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Badges ────────────────────────────────────────────────── */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {savings != null && savings > 0 && (
                            <span
                                className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-md leading-none"
                                style={{
                                    background: "var(--color-text-primary)",
                                    color: "var(--color-bg)",
                                }}
                            >
                                −{savings}%
                            </span>
                        )}
                        {isFeatured && (
                            <span
                                className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-md leading-none flex items-center gap-1.5 text-white"
                                style={{ background: "var(--color-accent, #fd5000)" }}
                            >
                                <Zap className="h-2.5 w-2.5 fill-white stroke-none" />
                                Hot
                            </span>
                        )}
                    </div>

                    {/* ── Counter + Expand button ────────────────────────────────── */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                        {hasMultiple && (
                            <span
                                className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md tabular-nums"
                                style={{
                                    background: "rgba(0,0,0,0.45)",
                                    color: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(6px)",
                                }}
                            >
                                {activeIndex + 1}/{images.length}
                            </span>
                        )}
                        {mainImage && (
                            <button
                                onClick={() => setLightboxOpen(true)}
                                className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                style={{
                                    background: "rgba(0,0,0,0.45)",
                                    backdropFilter: "blur(6px)",
                                }}
                                aria-label="Expand image"
                            >
                                <Maximize2 className="h-3.5 w-3.5 text-white" />
                            </button>
                        )}
                    </div>

                    {/* ── Zoom hint ─────────────────────────────────────────────── */}
                    {mainImage && !zoomHintDismissed && (
                        <div
                            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium pointer-events-none transition-opacity duration-300"
                            style={{
                                background: "rgba(0,0,0,0.5)",
                                color: "rgba(255,255,255,0.75)",
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            <ZoomIn className="h-3 w-3" />
                            Hover to zoom
                        </div>
                    )}

                    {/* ── Prev / Next arrows ─────────────────────────────────────── */}
                    {hasMultiple && (
                        <>
                            <button
                                onClick={prev}
                                disabled={activeIndex === 0}
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:!opacity-0"
                                style={{
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                }}
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="h-4 w-4" style={{ color: "var(--color-text-primary)" }} />
                            </button>
                            <button
                                onClick={next}
                                disabled={activeIndex === images.length - 1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:!opacity-0"
                                style={{
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                }}
                                aria-label="Next image"
                            >
                                <ChevronRight className="h-4 w-4" style={{ color: "var(--color-text-primary)" }} />
                            </button>
                        </>
                    )}

                    {/* ── Swipe indicator on mobile (fades after first touch) ──── */}
                    {hasMultiple && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 md:hidden pointer-events-none">
                            <div
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-medium"
                                style={{
                                    background: "rgba(0,0,0,0.4)",
                                    color: "rgba(255,255,255,0.7)",
                                    backdropFilter: "blur(6px)",
                                }}
                            >
                                <ChevronLeft className="h-2.5 w-2.5" />
                                swipe
                                <ChevronRight className="h-2.5 w-2.5" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Thumbnail strip ──────────────────────────────────────────── */}
                {hasMultiple && (
                    <div
                        ref={stripRef}
                        className="flex gap-2 overflow-x-auto pb-0.5"
                        style={{ scrollbarWidth: "none" }}
                        role="tablist"
                        aria-label="Product images"
                    >
                        {images.map((img, i) => (
                            <Thumbnail
                                key={img + i}
                                src={img}
                                index={i}
                                active={i === activeIndex}
                                onClick={() => setActiveIndex(i)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Dot indicators (mobile only) ──────────────────────────────── */}
                {hasMultiple && images.length <= 12 && (
                    <div className="flex justify-center gap-1.5 md:hidden">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveIndex(i)}
                                className="transition-all duration-300 rounded-full"
                                style={{
                                    width: i === activeIndex ? "16px" : "6px",
                                    height: "6px",
                                    background: i === activeIndex
                                        ? "var(--color-text-primary)"
                                        : "var(--color-border-strong)",
                                    opacity: i === activeIndex ? 1 : 0.4,
                                }}
                                aria-label={`Go to image ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
            {lightboxOpen && mainImage && (
                <Lightbox
                    images={images}
                    activeIndex={activeIndex}
                    productName={productName}
                    onClose={() => setLightboxOpen(false)}
                    onPrev={prev}
                    onNext={next}
                />
            )}
        </>
    );
}