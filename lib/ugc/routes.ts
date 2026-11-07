/**
 * Canonical UGC Brand Workspace routes and legacy aliases.
 * Keep next.config redirects and App Router pages in sync with these values.
 */
export const UGC_BRAND_WORKSPACE_CANONICAL = "/ugc/campaign-center";

/** Paths that must never be treated as campaign IDs under /ugc/[id]. */
export const UGC_BRAND_WORKSPACE_ALIASES = [
  "/ugc/brand-workspace",
] as const;

export function isUgcBrandWorkspaceAlias(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || pathname;
  return (UGC_BRAND_WORKSPACE_ALIASES as readonly string[]).includes(path);
}
