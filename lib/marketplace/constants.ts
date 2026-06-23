/** Products shown per page on the main marketplace grid */
export const MARKETPLACE_PAGE_SIZE = 24;

export function parseMarketplacePage(raw: string | null | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
