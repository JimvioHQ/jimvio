/** Shared Live Studio design tokens — cinematic dark Live experience. */

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

/** Jimvio accent */
export const LIVE_ACCENT = "text-[#FF5A1F]";
export const LIVE_ACCENT_BG = "bg-[#FF5A1F]";

/**
 * Cinematic Live shell — deep navy/black stage environment.
 * Sheets/panels that float over the stage may still use light surfaces.
 */
export const LIVE_PAGE_BG = "bg-[#070B14]";
export const LIVE_SURFACE = "bg-[#0B1220]";
export const LIVE_STAGE_BG = "bg-[#0B1220]";
export const LIVE_STAGE_FALLBACK_BG =
  "bg-[radial-gradient(ellipse_at_50%_38%,#152238_0%,#0B1220_55%,#05080F_100%)]";
export const LIVE_BORDER = "border border-white/10";
export const LIVE_SHADOW = "shadow-[0_12px_40px_rgba(0,0,0,0.45)]";
export const LIVE_SHADOW_LG = "shadow-[0_20px_60px_rgba(0,0,0,0.55)]";
export const LIVE_RADIUS = "rounded-2xl";
export const LIVE_RADIUS_LG = "rounded-[20px]";
export const LIVE_TEXT = "text-white";
export const LIVE_TEXT_MUTED = "text-white/65";

/** Light sheet / panel surfaces (mobile chat, invite, desktop side panels). */
export const LIVE_SHEET_BG = "bg-white";
export const LIVE_SHEET_TEXT = "text-[#111827]";
export const LIVE_SHEET_MUTED = "text-[#64748B]";
export const LIVE_SHEET_BORDER = "border border-[#E5E7EB]";

/** Floating control dock chrome */
export const LIVE_DOCK_BG =
  "bg-[#0b1220]/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10";
