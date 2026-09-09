/** GPU-accelerated motion utilities — use with `ds-motion-*` classes or inline style. */
export const dsMotion = {
  fadeIn: "ds-motion-fade-in",
  fadeOut: "ds-motion-fade-out",
  scaleIn: "ds-motion-scale-in",
  slideUp: "ds-motion-slide-up",
  slideDown: "ds-motion-slide-down",
} as const;

export const dsTransition = {
  default: "transform var(--ds-duration-normal) ease-out, opacity var(--ds-duration-normal) ease-out",
  fast: "transform var(--ds-duration-fast) ease-out, opacity var(--ds-duration-fast) ease-out",
  colors: "background-color var(--ds-duration-fast) ease-out, border-color var(--ds-duration-fast) ease-out, color var(--ds-duration-fast) ease-out",
} as const;

/** Re-export Jimvio homepage motion tokens for a single import surface */
export {
  jimvioDuration,
  jimvioEase,
  jimvioEaseCss,
  jimvioStagger,
  jimvioDistance,
  jimvioFadeUp,
  jimvioStaggerContainer,
  jimvioHeroItem,
} from "@/lib/motion/jimvio-motion";
