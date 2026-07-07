import type { DbProduct } from "@/lib/utils";

export type ViewedProductStub = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: unknown;
  currency?: string;
  category_id?: string | null;
};

/** Client-side signals consumed by the ranking scaffold (future AI services plug in here). */
export type PersonalizationSignals = {
  viewedProductIds: string[];
  viewedProducts: ViewedProductStub[];
  viewedCategoryIds: string[];
  cartProductIds: string[];
  wishlistProductIds: string[];
  searchTerms: string[];
  countryCode: string;
  language: string;
  creatorInterestTags: string[];
};

export type PersonalizedSectionId =
  | "recommended-for-you"
  | "because-you-viewed"
  | "trending-near-you"
  | "popular-in-country"
  | "recently-viewed"
  | "continue-shopping"
  | "similar-interests"
  | "new-arrivals-for-you"
  | "top-picks-today";

export type FeedProduct = DbProduct & {
  vendors?: { id: string; verification_status?: string | null } | null;
  source?: string | null;
  product_videos?: Array<{ url?: string | null; video_url?: string | null; sort_order?: number | null }>;
};

export type PersonalizedSection = {
  id: PersonalizedSectionId;
  title: string;
  description: string;
  viewAllHref: string;
  products: FeedProduct[];
  /** Reserved for future AI explanation chips — not rendered yet. */
  rankingMeta?: {
    signalWeights: Partial<Record<keyof PersonalizationSignals, number>>;
    diversityScore?: number;
  };
};

export type BuildFeedInput = {
  catalog: FeedProduct[];
  flashDeals: FeedProduct[];
  newProductIds?: Set<string>;
  signals: PersonalizationSignals;
  productType: "physical" | "digital";
};

export type ProductLane = "physical" | "digital" | "course" | "ugc" | "affiliate";
