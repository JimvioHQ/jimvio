export const dsFontFamily = {
  sans: "var(--font-dm-sans), system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), ui-monospace, monospace",
} as const;

export const dsFontSize = {
  xs: "var(--ds-text-xs)",
  sm: "var(--ds-text-sm)",
  md: "var(--ds-text-md)",
  lg: "var(--ds-text-lg)",
  xl: "var(--ds-text-xl)",
  "2xl": "var(--ds-text-2xl)",
  "3xl": "var(--ds-text-3xl)",
} as const;

export const dsFontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  black: "900",
} as const;

export const dsLineHeight = {
  tight: "1.2",
  snug: "1.35",
  normal: "1.5",
  relaxed: "1.65",
} as const;

export const dsLetterSpacing = {
  tight: "-0.02em",
  normal: "-0.01em",
  wide: "0.04em",
  wider: "0.14em",
} as const;
