/** Shared Live Studio design tokens — keep UI consistent, no new features. */

export const MOTION =
  "motion-safe:transition-all motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export const MOTION_COLORS =
  "motion-safe:transition-colors motion-safe:duration-150 motion-reduce:transition-none";

export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const FOCUS_RING_DARK =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

export const FOCUS_RING_INSET =
  "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25";

/** Cap rendered chat rows for long sessions (UI window; full history remains in memory if needed later). */
export const CHAT_RENDER_CAP = 200;

/** Premium Live studio surfaces */
export const LIVE_SURFACE = "bg-white";
export const LIVE_PAGE_BG = "bg-[#F8FAFC]";
export const LIVE_STAGE_BG = "bg-[#0a0c10]";
export const LIVE_BORDER = "border border-neutral-200/80";
export const LIVE_SHADOW =
  "shadow-[0_8px_30px_rgba(15,23,42,0.06)]";
export const LIVE_SHADOW_LG =
  "shadow-[0_20px_60px_rgba(0,0,0,0.28)]";
export const LIVE_RADIUS = "rounded-2xl";
export const LIVE_RADIUS_LG = "rounded-[20px]";
export const LIVE_ACCENT = "text-[#FF5A1F]";
export const LIVE_ACCENT_BG = "bg-[#FF5A1F]";
