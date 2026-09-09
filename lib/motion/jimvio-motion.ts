/**
 * Jimvio homepage / product motion tokens.
 * Prefer transform + opacity. Keep timings in one place.
 */

export const jimvioEase = [0.22, 1, 0.36, 1] as const;
export const jimvioEaseCss = "cubic-bezier(0.22, 1, 0.36, 1)";

export const jimvioDuration = {
  /** Micro-interactions (buttons, arrows) */
  fast: 180,
  /** Hovers, border/shadow depth */
  hover: 220,
  /** Mid-weight UI transitions */
  medium: 380,
  /** Section / card viewport reveals */
  reveal: 600,
} as const;

export const jimvioStagger = {
  tight: 50,
  default: 70,
  loose: 90,
} as const;

export const jimvioDistance = {
  hero: 12,
  reveal: 24,
  revealMobile: 16,
  hoverLift: 3,
  arrow: 3,
} as const;

/** Framer-motion friendly section fade-up */
export const jimvioFadeUp = {
  hidden: { opacity: 0, y: jimvioDistance.reveal },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: jimvioDuration.reveal / 1000,
      ease: jimvioEase,
    },
  },
} as const;

export const jimvioStaggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: jimvioStagger.default / 1000,
      delayChildren: 0.04,
    },
  },
} as const;

export const jimvioHeroItem = {
  hidden: { opacity: 0, y: jimvioDistance.hero },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: jimvioEase,
      delay: i * (jimvioStagger.default / 1000),
    },
  }),
} as const;
