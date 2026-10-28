import { parseMarketplacePage } from "@/lib/marketplace/constants";

/**
 * Canonical Physical / Digital marketplace experience.
 * Pathname is the product-type source of truth. Query params never override it.
 *
 * Copy is English source text, matching the rest of the marketplace UI
 * (this surface does not use a translation catalog).
 *
 * Digital benefit lines describe the hosted purchase flow in
 * lib/actions/digital-access.ts and app/api/files/access: a file is granted
 * after payment confirms, then opened from the buyer's library. They do not
 * say delivery is instant, that every file is encrypted, or that every seller
 * is verified. Affiliate listings stay external offers and are described on
 * the product page. Physical benefit lines are the existing physical strip.
 */

export type MarketplaceProductType = "physical" | "digital";

export const MARKETPLACE_CANONICAL_PATH: Record<MarketplaceProductType, string> = {
  physical: "/marketplace/physical",
  digital: "/marketplace/digital",
};

const MANAGED_QUERY_KEYS = [
  "type",
  "cat",
  "category",
  "q",
  "sort",
  "minPrice",
  "maxPrice",
  "minRating",
  "offer",
  "format",
  "arrivals",
  "purchased",
  "page",
  "brand",
  "shipping",
  "delivery",
] as const;

const PRESERVED_QUERY_KEYS = ["q", "sort", "brand"] as const;
const DELIVERY_TIMES = new Set(["fast", "standard", "economy"]);

/** Real products.is_free_shipping / products.is_flash_deal values. */
export const PHYSICAL_OFFERS = ["free_shipping", "flash_deal"] as const;
export type MarketplaceOffer = (typeof PHYSICAL_OFFERS)[number];

/** Real products.product_type values inside the digital marketplace. */
export const DIGITAL_FORMATS = ["digital", "course", "ebook", "software", "template", "coaching"] as const;
export type MarketplaceFormat = (typeof DIGITAL_FORMATS)[number];

export function readMarketplaceOffer(
  value: string | null | undefined,
  type: MarketplaceProductType,
): MarketplaceOffer | "" {
  if (type !== "physical") return "";
  return PHYSICAL_OFFERS.includes(value as MarketplaceOffer) ? (value as MarketplaceOffer) : "";
}

export function readMarketplaceFormat(
  value: string | null | undefined,
  type: MarketplaceProductType,
): MarketplaceFormat | "" {
  if (type !== "digital") return "";
  return DIGITAL_FORMATS.includes(value as MarketplaceFormat) ? (value as MarketplaceFormat) : "";
}

/** products.created_at within this window. Both marketplaces can query it. */
export const MARKETPLACE_NEW_ARRIVAL_MS = 30 * 24 * 60 * 60 * 1000;

export function marketplaceNewArrivalSince(now = Date.now()): string {
  return new Date(now - MARKETPLACE_NEW_ARRIVAL_MS).toISOString();
}

/** URL flags are only "1" or "true". Anything else is dropped. */
export function readMarketplaceFlag(value: string | null | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  return text === "1" || text === "true";
}

/** Open price ceiling. A max below this is an active price filter. */
export const MARKETPLACE_PRICE_CEILING = 5000;

export type MarketplaceBenefitIcon =
  | "shield"
  | "badge"
  | "check"
  | "truck"
  | "download"
  | "key"
  | "user"
  | "book";

export type MarketplaceBenefit = {
  title: string;
  subtitle: string;
  icon: MarketplaceBenefitIcon;
};

export const MARKETPLACE_BENEFITS: Record<MarketplaceProductType, readonly MarketplaceBenefit[]> = {
  physical: [
    { title: "Secure Payments", subtitle: "100% safe", icon: "shield" },
    { title: "Buyer Protection", subtitle: "Money-back guarantee", icon: "badge" },
    { title: "Verified Suppliers", subtitle: "Trusted & reliable", icon: "check" },
    { title: "Fast Delivery", subtitle: "Worldwide shipping", icon: "truck" },
  ],
  digital: [
    { title: "Digital Delivery", subtitle: "Hosted files after payment", icon: "download" },
    { title: "Buyer Access", subtitle: "Opens from your library", icon: "key" },
    { title: "Seller Status", subtitle: "Shown on each listing", icon: "user" },
    { title: "Learn, Create & Grow", subtitle: "Courses, ebooks, templates and more", icon: "book" },
  ],
};

export type MarketplaceGrowthPath = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

/**
 * Store creation lives on /commerce/stores (CreateStoreForm).
 * Signed-out visitors are sent to /login?next=/commerce/stores.
 * /activate/vendor is the business application, not store creation.
 */
export const MARKETPLACE_GROWTH_PATHS: readonly MarketplaceGrowthPath[] = [
  {
    id: "affiliates",
    title: "Earn commissions",
    description: "Share products, get paid per sale",
    href: "/affiliates",
    cta: "Start earning",
  },
  {
    id: "ugc",
    title: "Join UGC campaigns",
    description: "Create content brands pay for",
    href: "/ugc",
    cta: "Browse campaigns",
  },
  {
    id: "dropshipping",
    title: "Start Dropshipping",
    description: "Start your dropshipping business on Jimvio",
    href: "/commerce/stores",
    cta: "Start Dropshipping",
  },
  {
    id: "communities",
    title: "Join communities",
    description: "Learn, network & grow together",
    href: "/communities",
    cta: "Explore groups",
  },
];

export type MarketplaceSearchPlaceholder = { prefix: string; label: string };

export function marketplaceSearchPlaceholders(
  type: MarketplaceProductType,
): MarketplaceSearchPlaceholder[] {
  if (type === "digital") {
    return [
      { prefix: "Search for", label: "Online courses" },
      { prefix: "Search for", label: "Ebooks" },
      { prefix: "Search for", label: "Design templates" },
      { prefix: "Search for", label: "Business templates" },
      { prefix: "Search in", label: "Education & Learning" },
      { prefix: "Search in", label: "Design & Creative" },
    ];
  }
  return [
    { prefix: "Search for", label: "Wireless Earbuds" },
    { prefix: "Search for", label: "Gaming Headset" },
    { prefix: "Search for", label: "Smart Watch" },
    { prefix: "Search for", label: "Portable Speaker" },
    { prefix: "Search in", label: "Electronics" },
    { prefix: "Search in", label: "Home & Living" },
  ];
}

export function marketplacePopularSearches(type: MarketplaceProductType): string[] {
  return type === "digital"
    ? ["Online course", "Ebook", "Design template", "Business template"]
    : ["Wireless Earbuds", "Gaming Headset", "Smart Watch", "Portable Speaker"];
}

export function marketplaceEmptyCopy(
  type: MarketplaceProductType,
  searchTerm: string,
): { title: string; body: string } {
  if (searchTerm) {
    return {
      title: `No ${type} products found for “${searchTerm}”`,
      body:
        type === "digital"
          ? "Try a course, ebook, or template keyword, or clear search to browse digital products."
          : "Try another keyword or clear search to browse physical products.",
    };
  }
  return {
    title: `No ${type} products match your filters`,
    body:
      type === "digital"
        ? "Clear filters to browse every digital product."
        : "Clear filters to browse every physical product.",
  };
}

export function marketplaceTypeFromPathname(pathname: string | null | undefined): MarketplaceProductType | null {
  if (!pathname) return null;
  const path = pathname.split("?")[0] ?? "";
  if (path === "/marketplace/digital" || path.startsWith("/marketplace/digital/")) return "digital";
  if (path === "/marketplace/physical" || path.startsWith("/marketplace/physical/")) return "physical";
  return null;
}

export function canonicalMarketplacePath(type: MarketplaceProductType): string {
  return MARKETPLACE_CANONICAL_PATH[type];
}

/** PostgREST OR filter. Legacy rows with a null category_type stay on Physical. */
export function categoryTypeOrFilter(type: MarketplaceProductType): string {
  return type === "digital"
    ? "category_type.eq.digital"
    : "category_type.eq.physical,category_type.is.null";
}

export type MarketplaceQueryRecord = Record<string, string | string[] | undefined>;

export function marketplaceSearchParamsFromRecord(
  raw: MarketplaceQueryRecord | URLSearchParams,
): URLSearchParams {
  if (typeof URLSearchParams !== "undefined" && raw instanceof URLSearchParams) {
    return new URLSearchParams(raw);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw as MarketplaceQueryRecord)) {
    if (typeof value === "string" && value.trim()) params.set(key, value);
    else if (Array.isArray(value)) {
      const first = value.find((entry) => entry.trim());
      if (first) params.set(key, first);
    }
  }
  return params;
}

export type CompatibleQueryOptions = {
  dropCategory?: boolean;
  dropPage?: boolean;
  dropType?: boolean;
};

function appendPreserved(source: URLSearchParams, target: URLSearchParams) {
  for (const key of PRESERVED_QUERY_KEYS) {
    const value = source.get(key)?.trim();
    if (value) target.set(key, value);
  }
}

/** Query string that is valid on the destination product type. */
export function compatibleMarketplaceSearch(
  destination: MarketplaceProductType,
  source: URLSearchParams,
  options: CompatibleQueryOptions = {},
): URLSearchParams {
  const next = new URLSearchParams();
  appendPreserved(source, next);

  if (!options.dropCategory) {
    const category = (source.get("category") || source.get("cat") || "").trim();
    if (category) next.set("category", category);
  }

  const minPrice = source.get("minPrice")?.trim();
  const maxPrice = source.get("maxPrice")?.trim();
  if (minPrice && Number(minPrice) > 0) next.set("minPrice", minPrice);
  if (maxPrice && Number(maxPrice) > 0 && Number(maxPrice) < MARKETPLACE_PRICE_CEILING) {
    next.set("maxPrice", maxPrice);
  }
  const offer = readMarketplaceOffer(source.get("offer"), destination);
  const format = readMarketplaceFormat(source.get("format"), destination);
  if (offer) next.set("offer", offer);
  if (format) next.set("format", format);
  if (readMarketplaceFlag(source.get("arrivals"))) next.set("arrivals", "1");
  if (readMarketplaceFlag(source.get("purchased"))) next.set("purchased", "1");

  if (!options.dropPage) {
    const page = parseMarketplacePage(source.get("page"));
    if (page > 1) next.set("page", String(page));
  }

  if (destination === "physical") {
    const shipping = (source.get("shipping") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const delivery = (source.get("delivery") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => DELIVERY_TIMES.has(part));
    if (shipping.length) next.set("shipping", shipping.join(","));
    if (delivery.length) next.set("delivery", delivery.join(","));
  }

  if (!options.dropType) {
    const type = source.get("type");
    if (type === "physical" || type === "digital") next.set("type", type);
  }

  return next;
}

export function buildMarketplaceHref(
  type: MarketplaceProductType,
  managed: URLSearchParams,
  preserveFrom?: URLSearchParams,
): string {
  const params = new URLSearchParams(managed);
  if (preserveFrom) {
    for (const [key, value] of preserveFrom.entries()) {
      if (!MANAGED_QUERY_KEYS.includes(key as (typeof MANAGED_QUERY_KEYS)[number]) && !params.has(key)) {
        params.append(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = canonicalMarketplacePath(type);
  return qs ? `${path}?${qs}` : path;
}

/** Type change: keep shared filters, drop category, pagination, and physical-only filters. */
export function marketplaceSwitchHref(
  destination: MarketplaceProductType,
  source: URLSearchParams,
): string {
  const next = compatibleMarketplaceSearch(destination, source, {
    dropCategory: true,
    dropPage: true,
    dropType: true,
  });
  return buildMarketplaceHref(destination, next, source);
}

export function marketplaceIndexHref(raw: MarketplaceQueryRecord | URLSearchParams): string {
  const params = marketplaceSearchParamsFromRecord(raw);
  const type: MarketplaceProductType = params.get("type") === "digital" ? "digital" : "physical";
  const next = compatibleMarketplaceSearch(type, params, { dropType: true });
  return buildMarketplaceHref(type, next, params);
}

function stableQuery(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([key]) => MANAGED_QUERY_KEYS.includes(key as (typeof MANAGED_QUERY_KEYS)[number]))
    .sort(([a], [b]) => a.localeCompare(b) || 0)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export type MarketplaceEntryDecision = {
  redirectTo: string | null;
  category: string | null;
};

/**
 * Decide whether a canonical route URL should redirect.
 * A conflicting ?type= is sent to the other canonical path.
 * A matching ?type=, legacy ?cat=, or physical-only filter on Digital is normalized away.
 */
export function marketplaceEntryDecision(
  routeType: MarketplaceProductType,
  raw: MarketplaceQueryRecord | URLSearchParams,
): MarketplaceEntryDecision {
  const params = marketplaceSearchParamsFromRecord(raw);
  const queryType = params.get("type");
  if ((queryType === "digital" || queryType === "physical") && queryType !== routeType) {
    return { redirectTo: marketplaceSwitchHref(queryType, params), category: null };
  }

  const next = compatibleMarketplaceSearch(routeType, params, { dropType: true });
  if (stableQuery(params) !== stableQuery(next)) {
    return {
      redirectTo: buildMarketplaceHref(routeType, next, params),
      category: next.get("category"),
    };
  }
  return { redirectTo: null, category: next.get("category") };
}

export function marketplaceHrefWithoutCategory(
  type: MarketplaceProductType,
  raw: MarketplaceQueryRecord | URLSearchParams,
): string {
  const params = marketplaceSearchParamsFromRecord(raw);
  const next = compatibleMarketplaceSearch(type, params, {
    dropCategory: true,
    dropPage: true,
    dropType: true,
  });
  return buildMarketplaceHref(type, next, params);
}

export type MarketplaceFilterSnapshot = {
  category: string;
  priceRange: [number, number];
  minRating: number;
  offer: MarketplaceOffer | "";
  format: MarketplaceFormat | "";
  arrivals: boolean;
  purchased: boolean;
  shippingFrom: string[];
  deliveryTimes: Array<"fast" | "standard" | "economy">;
  page: number;
};

export function readMarketplaceFilters(
  raw: URLSearchParams,
  type: MarketplaceProductType,
): MarketplaceFilterSnapshot {
  const normalized = compatibleMarketplaceSearch(type, raw, { dropType: true });
  const minPrice = Number(normalized.get("minPrice"));
  const maxPrice = Number(normalized.get("maxPrice"));
  const low = Number.isFinite(minPrice) && minPrice > 0 ? minPrice : 0;
  const high = Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : MARKETPLACE_PRICE_CEILING;
  return {
    category: normalized.get("category") ?? "",
    priceRange: [low, Math.max(low, high)],
    minRating: 0,
    offer: readMarketplaceOffer(normalized.get("offer"), type),
    format: readMarketplaceFormat(normalized.get("format"), type),
    arrivals: readMarketplaceFlag(normalized.get("arrivals")),
    purchased: readMarketplaceFlag(normalized.get("purchased")),
    shippingFrom: (normalized.get("shipping") ?? "").split(",").filter(Boolean),
    deliveryTimes: (normalized.get("delivery") ?? "")
      .split(",")
      .filter((value): value is "fast" | "standard" | "economy" => DELIVERY_TIMES.has(value)),
    page: parseMarketplacePage(normalized.get("page")),
  };
}

export function filtersToSearchParams(
  type: MarketplaceProductType,
  filters: MarketplaceFilterSnapshot,
  keep?: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams();
  if (keep) appendPreserved(keep, next);
  if (filters.category.trim()) next.set("category", filters.category.trim());
  if (filters.priceRange[0] > 0) next.set("minPrice", String(filters.priceRange[0]));
  if (filters.priceRange[1] > 0 && filters.priceRange[1] < MARKETPLACE_PRICE_CEILING) {
    next.set("maxPrice", String(filters.priceRange[1]));
  }
  if (type === "physical" && filters.offer) next.set("offer", filters.offer);
  if (type === "digital" && filters.format) next.set("format", filters.format);
  if (filters.arrivals) next.set("arrivals", "1");
  if (filters.purchased) next.set("purchased", "1");
  if (type === "physical" && filters.shippingFrom.length) {
    next.set("shipping", filters.shippingFrom.join(","));
  }
  if (type === "physical" && filters.deliveryTimes.length) {
    next.set("delivery", filters.deliveryTimes.join(","));
  }
  if (filters.page > 1) next.set("page", String(filters.page));
  return next;
}

/** Full-catalog search URL. Keeps filters that are valid for this product type. */
export function marketplaceSearchResultsHref(
  type: MarketplaceProductType,
  query: string,
  filters?: Partial<MarketplaceFilterSnapshot>,
): string {
  const params = new URLSearchParams();
  const text = query.trim().replace(/\s+/g, " ");
  if (text) params.set("q", text);
  params.set("type", type);
  const category = filters?.category?.trim();
  if (category) params.set("category", category);
  if (filters?.priceRange && filters.priceRange[0] > 0) params.set("minPrice", String(filters.priceRange[0]));
  if (
    filters?.priceRange &&
    filters.priceRange[1] > 0 &&
    filters.priceRange[1] < MARKETPLACE_PRICE_CEILING
  ) {
    params.set("maxPrice", String(filters.priceRange[1]));
  }
  if (type === "physical" && filters?.offer) params.set("offer", filters.offer);
  if (type === "digital" && filters?.format) params.set("format", filters.format);
  if (filters?.arrivals) params.set("arrivals", "1");
  if (filters?.purchased) params.set("purchased", "1");
  return `/marketplace/search?${params.toString()}`;
}

export function marketplaceFiltersHref(
  type: MarketplaceProductType,
  filters: MarketplaceFilterSnapshot,
  current: URLSearchParams,
): string {
  return buildMarketplaceHref(type, filtersToSearchParams(type, filters, current), current);
}
