export const JIMVIO_STORE_SLUG = "jimvio-store";
export const JIMVIO_STORE_LOGO_SRC = "/jimvio-logo-mark.png";

/** Official Jimvio mark — used when the Jimvio Store row has no uploaded logo. */
export function storefrontLogoSrc(vendor: {
  business_logo?: string | null;
  business_slug?: string | null;
} | null | undefined): string | null {
  const uploaded = vendor?.business_logo?.trim();
  if (uploaded) return uploaded;
  if (vendor?.business_slug === JIMVIO_STORE_SLUG) return JIMVIO_STORE_LOGO_SRC;
  return null;
}

/** Customer-facing store follower count: social-proof baseline, never below real follows. */
export function storefrontFollowerCount(vendor: {
  follower_count?: number | null;
  display_follower_count?: number | null;
} | null | undefined): number {
  const real = Math.max(0, Number(vendor?.follower_count ?? 0) || 0);
  const display = Math.max(0, Number(vendor?.display_follower_count ?? 0) || 0);
  return Math.max(real, display);
}

export function formatFollowerCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1000) {
    const compact = count / 1000;
    const text = compact >= 10 ? compact.toFixed(0) : compact.toFixed(1);
    return `${text.replace(/\.0$/, "")}K`;
  }
  return count.toLocaleString();
}

export function formatFollowersLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "No followers yet";
  return `${formatFollowerCount(count)} Followers`;
}

/** Store rating for customer-facing UI — never presents 0.0 as a reviewed score. */
export function formatStoreRating(vendor: {
  rating?: number | null;
  review_count?: number | null;
} | null | undefined): {
  hasRating: boolean;
  score: number | null;
  label: string;
  reviewLabel: string | null;
} {
  const score = Number(vendor?.rating);
  const reviews = Math.max(0, Number(vendor?.review_count ?? 0) || 0);

  // If rating is 0/null, treat as unreviewed even if a stale 0.0 is stored.
  if (!Number.isFinite(score) || score <= 0) {
    return {
      hasRating: false,
      score: null,
      label: "No ratings yet",
      reviewLabel: null,
    };
  }

  return {
    hasRating: true,
    score,
    label: score.toFixed(1),
    reviewLabel: reviews > 0 ? `${reviews.toLocaleString()} reviews` : null,
  };
}

/** Successful/paid sales count from the vendor's authoritative total_sales field. */
export function formatStoreSales(totalSales: number | null | undefined): {
  count: number;
  label: string;
} {
  const count = Math.max(0, Math.floor(Number(totalSales ?? 0) || 0));
  return {
    count,
    label: count.toLocaleString(),
  };
}
