/**
 * Jimvio homepage / product motion tokens.
 * Prefer transform + opacity. Keep timings restrained so the UI feels fast.
 */

export const jimvioEase = [0.22, 1, 0.36, 1] as const;
export const jimvioEaseCss = "cubic-bezier(0.22, 1, 0.36, 1)";

export const jimvioDuration = {
  /** Micro-interactions (buttons, arrows) */
  fast: 150,
  /** Hovers, border depth */
  hover: 200,
  /** Mid-weight UI transitions */
  medium: 280,
  /** Section / card viewport reveals */
  reveal: 480,
} as const;

export const jimvioStagger = {
  tight: 40,
  default: 55,
  loose: 70,
} as const;

export const jimvioDistance = {
  hero: 10,
  reveal: 12,
  revealMobile: 8,
  hoverLift: 2,
  arrow: 3,
} as const;

/** Framer-motion friendly section fade-up (use sparingly) */
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
      delayChildren: 0.03,
    },
  },
} as const;

export const jimvioHeroItem = {
  hidden: { opacity: 0, y: jimvioDistance.hero },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: jimvioEase,
      delay: i * (jimvioStagger.tight / 1000),
    },
  }),
} as const;
