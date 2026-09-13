/** Viewport column counts for storefront product grids. Independent of Tailwind. */
export function storefrontGridColumnCount(
  viewportWidth: number,
  configuredCols: number = 4
): number {
  const cols = Math.min(6, Math.max(2, Math.round(Number(configuredCols)) || 4));
  if (viewportWidth < 768) return 2;
  if (viewportWidth < 1024) return 3;
  return cols;
}

export function storefrontProductGridTemplate(
  viewportWidth: number,
  configuredCols: number = 4
): string {
  const n = storefrontGridColumnCount(viewportWidth, configuredCols);
  return `repeat(${n}, minmax(0, 1fr))`;
}
