/** Breakpoints in px — align with Tailwind defaults + foldable/large monitor tokens. */
export const dsBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  fold: 280,
  laptop: 1024,
  desktop: 1280,
  ultrawide: 1920,
} as const;

export type DsBreakpoint = keyof typeof dsBreakpoints;

export const dsMediaQueries = {
  sm: `(min-width: ${dsBreakpoints.sm}px)`,
  md: `(min-width: ${dsBreakpoints.md}px)`,
  lg: `(min-width: ${dsBreakpoints.lg}px)`,
  xl: `(min-width: ${dsBreakpoints.xl}px)`,
  "2xl": `(min-width: ${dsBreakpoints["2xl"]}px)`,
  ultrawide: `(min-width: ${dsBreakpoints.ultrawide}px)`,
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;
