/**
 * Canonical UGC Brand Workspace routes and legacy aliases.
 * Keep next.config redirects and App Router pages in sync with these values.
 */
export const UGC_BRAND_WORKSPACE_CANONICAL = "/ugc/campaign-center";

/** Paths that must never be treated as campaign IDs under /ugc/[id]. */
export const UGC_BRAND_WORKSPACE_ALIASES = [
  "/ugc/brand-workspace",
] as const;

/**
 * Static Brand Workspace child paths that must not fall through to
 * /ugc/[id]/… (e.g. /ugc/campaign-center/dashboard → [id]=campaign-center).
 */
export const UGC_BRAND_WORKSPACE_CHILD_REDIRECTS = [
  {
    source: "/ugc/campaign-center/dashboard",
    destination: UGC_BRAND_WORKSPACE_CANONICAL,
  },
] as const;

const CAMPAIGN_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUgcBrandWorkspaceAlias(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || pathname;
  return (UGC_BRAND_WORKSPACE_ALIASES as readonly string[]).includes(path);
}

/** True when a /ugc/[id] segment is a real campaign UUID. */
export function isUgcCampaignId(id: string | null | undefined): boolean {
  return typeof id === "string" && CAMPAIGN_ID_RE.test(id.trim());
}
