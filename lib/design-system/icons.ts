/** Icon sizing & stroke rules — use with DsIcon wrapper. */
export const dsIconSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type DsIconSize = keyof typeof dsIconSize;

export const dsIconStroke = 2;

export function dsIconClassName(size: DsIconSize = "md"): string {
  const px = dsIconSize[size];
  return `size-[${px}px] shrink-0`;
}
