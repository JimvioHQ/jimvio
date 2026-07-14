/** Jimvio Design System — canonical token map (mirrors CSS custom properties). */

export const dsColors = {
  /* Core primitives */
  paper: "var(--color-paper)",
  paperDim: "var(--color-paper-dim)",
  paperDark: "var(--color-paper-dark)",
  ink: "var(--color-ink)",
  inkDeep: "var(--color-ink-deep)",
  inkMuted: "var(--color-ink-muted)",
  inkSubtle: "var(--color-ink-subtle)",

  /* Semantic tokens */
  bg: "var(--color-bg)",
  bgElevated: "var(--color-bg-elevated)",
  surface: "var(--color-surface)",
  surfaceSecondary: "var(--color-surface-secondary)",
  border: "var(--color-border)",
  borderStrong: "var(--color-border-strong)",
  accent: "var(--color-accent)",
  accentHover: "var(--color-accent-hover)",
  accentLight: "var(--color-accent-light)",
  accentSubtle: "var(--color-accent-subtle)",
  accentSoft: "var(--color-accent-soft)",
  accentForeground: "var(--color-accent-foreground)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  bgDark: "var(--color-bg-dark)",
  bgDarker: "var(--color-bg-darker)",

  /* Section tints — derived from ink + accent */
  growth: "var(--color-growth)",
  events: "var(--color-events)",
  live: "var(--color-live)",
  social: "var(--color-social)",

  /* Status */
  success: "var(--color-success)",
  successLight: "var(--color-success-light)",
  warning: "var(--color-warning)",
  warningLight: "var(--color-warning-light)",
  danger: "var(--color-danger)",
  dangerLight: "var(--color-danger-light)",
} as const;

export const dsSpacing = {
  0: "0",
  1: "var(--space-1)",
  2: "var(--space-2)",
  3: "var(--space-3)",
  4: "var(--space-4)",
  5: "var(--space-5)",
  6: "var(--space-6)",
  7: "var(--space-7)",
  8: "var(--space-8)",
  9: "var(--space-9)",
  10: "var(--space-10)",
} as const;

export const dsRadius = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  full: "var(--radius-full)",
} as const;

export const dsShadow = {
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
  glow: "var(--shadow-glow)",
} as const;

export const dsElevation = {
  0: "var(--ds-elevation-0)",
  1: "var(--ds-elevation-1)",
  2: "var(--ds-elevation-2)",
  3: "var(--ds-elevation-3)",
  4: "var(--ds-elevation-4)",
} as const;

export const dsOpacity = {
  disabled: "var(--ds-opacity-disabled)",
  muted: "var(--ds-opacity-muted)",
  overlay: "var(--ds-opacity-overlay)",
} as const;

export const dsDuration = {
  fast: "var(--ds-duration-fast)",
  normal: "var(--ds-duration-normal)",
  slow: "var(--ds-duration-slow)",
} as const;

export const dsBlur = {
  sm: "var(--ds-blur-sm)",
  md: "var(--ds-blur-md)",
  lg: "var(--ds-blur-lg)",
} as const;

export const dsContainer = {
  sm: "var(--ds-container-sm)",
  md: "var(--ds-container-md)",
  lg: "var(--ds-container-lg)",
  xl: "var(--ds-container-xl)",
  max: "var(--container-max)",
} as const;
