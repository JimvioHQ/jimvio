/** Shared Live Studio design tokens — keep UI consistent, no new features. */

export const MOTION =
  "motion-safe:transition-all motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export const MOTION_COLORS =
  "motion-safe:transition-colors motion-safe:duration-150 motion-reduce:transition-none";

export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const FOCUS_RING_DARK =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

export const FOCUS_RING_INSET =
  "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900/20";

/** Cap rendered chat rows for long sessions (UI window; full history remains in memory if needed later). */
export const CHAT_RENDER_CAP = 200;
