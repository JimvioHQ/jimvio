// hooks/use-is-mobile.ts
"use client";

import { useEffect, useState } from "react";

/* ─── Breakpoint tokens (matches Tailwind defaults) ──────────────── */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/* ─── Core hook: useMediaQuery ───────────────────────────────────── */

/**
 * SSR-safe media query hook.
 *
 * Returns `false` on the server and during the first client render to
 * prevent hydration mismatches. Updates to the real value after mount.
 *
 * @example
 * const isDark = useMediaQuery("(prefers-color-scheme: dark)");
 * const isWide = useMediaQuery("(min-width: 1024px)");
 */
export function useMediaQuery(query: string): boolean {
  // Always start with `false` so server and first-paint client agree.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(query);

    // Sync to actual value on mount
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    // addEventListener is the modern API; older Safari needs addListener
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } else {
      // legacy Safari fallback
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, [query]);

  return matches;
}

/* ─── useIsMobile — the main hook ────────────────────────────────── */

/**
 * Detects mobile-sized viewport.
 *
 * Mobile is defined as `< breakpoint` (default: < 768px / Tailwind `md`).
 *
 * Returns:
 * - `isMobile`: viewport is below the breakpoint
 * - `isReady`: hook has hydrated (false during SSR + first render)
 *
 * Always returns `isMobile = false` until `isReady = true`. This means
 * server and client agree on the first render, and you can safely use
 * `isMobile` in JSX without hydration warnings — provided you also
 * gate any size-changing UI on `isReady`.
 *
 * @example
 * const { isMobile, isReady } = useIsMobile();
 * if (!isReady) return <DesktopShell />;  // or null, or skeleton
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 */
export function useIsMobile(breakpoint: Breakpoint | number = "md") {
  const px = typeof breakpoint === "number" ? breakpoint : BREAKPOINTS[breakpoint];
  const matches = useMediaQuery(`(max-width: ${px - 1}px)`);
  const isReady = useHasMounted();

  return {
    isMobile: isReady ? matches : false,
    isReady,
  };
}

/* ─── useIsTablet ─────────────────────────────────────────────────── */

/**
 * Detects tablet-sized viewport (between md and lg by default: 768–1023px).
 */
export function useIsTablet(
  min: Breakpoint | number = "md",
  max: Breakpoint | number = "lg"
) {
  const minPx = typeof min === "number" ? min : BREAKPOINTS[min];
  const maxPx = typeof max === "number" ? max : BREAKPOINTS[max];
  const matches = useMediaQuery(`(min-width: ${minPx}px) and (max-width: ${maxPx - 1}px)`);
  const isReady = useHasMounted();

  return {
    isTablet: isReady ? matches : false,
    isReady,
  };
}

/* ─── useIsDesktop ────────────────────────────────────────────────── */

/**
 * Detects desktop-sized viewport (>= lg by default: 1024px+).
 */
export function useIsDesktop(breakpoint: Breakpoint | number = "lg") {
  const px = typeof breakpoint === "number" ? breakpoint : BREAKPOINTS[breakpoint];
  const matches = useMediaQuery(`(min-width: ${px}px)`);
  const isReady = useHasMounted();

  return {
    isDesktop: isReady ? matches : false,
    isReady,
  };
}

/* ─── useBreakpoint — full responsive picture ────────────────────── */

export type DeviceType = "mobile" | "tablet" | "desktop";

/**
 * Returns the current viewport bucket and device type.
 *
 * Convention:
 * - mobile:  < 768px  (below md)
 * - tablet:  768–1023px (md to <lg)
 * - desktop: >= 1024px (lg and up)
 */
export function useBreakpoint(): {
  width: number | null;
  device: DeviceType;
  is: Record<Breakpoint, boolean>;
  isReady: boolean;
} {
  const isReady = useHasMounted();
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setWidth(window.innerWidth);
    update();

    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const w = width ?? 0;

  const is: Record<Breakpoint, boolean> = {
    sm: w >= BREAKPOINTS.sm,
    md: w >= BREAKPOINTS.md,
    lg: w >= BREAKPOINTS.lg,
    xl: w >= BREAKPOINTS.xl,
    "2xl": w >= BREAKPOINTS["2xl"],
  };

  const device: DeviceType =
    !isReady ? "desktop"   // SSR-safe default
    : w < BREAKPOINTS.md ? "mobile"
    : w < BREAKPOINTS.lg ? "tablet"
    : "desktop";

  return { width: isReady ? width : null, device, is, isReady };
}

/* ─── Bonus utility hooks ─────────────────────────────────────────── */

/**
 * Returns true once the component has mounted on the client.
 * Useful for gating any client-only UI.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Detects touch-capable devices (rough proxy for "phone-like UX").
 * Note: a laptop with a touchscreen also returns true.
 */
export function useIsTouchDevice(): boolean {
  const isReady = useHasMounted();
  const matches = useMediaQuery("(hover: none) and (pointer: coarse)");
  return isReady ? matches : false;
}

/**
 * Returns the user's preferred color scheme.
 */
export function usePrefersDark(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * Respects the OS-level "reduce motion" preference.
 * Use this to skip non-essential animations.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Returns viewport orientation. Useful for tablet/landscape adjustments.
 */
export function useOrientation(): "portrait" | "landscape" | null {
  const isReady = useHasMounted();
  const portrait = useMediaQuery("(orientation: portrait)");
  if (!isReady) return null;
  return portrait ? "portrait" : "landscape";
}