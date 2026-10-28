import type {
  BuildFeedInput,
  FeedProduct,
  PersonalizedSection,
  PersonalizedSectionId,
  ProductLane,
} from "./types";
import { canonicalMarketplacePath } from "@/lib/marketplace/experience";
import { getSectionDefinition } from "./sections-config";

const SECTION_LIMIT = 12;
const MIN_PRODUCTS = 3;

const COURSE_TYPES = new Set(["course", "ebook", "coaching", "software", "template"]);

function classifyLane(product: FeedProduct): ProductLane {
  if ((product.affiliate_commission_rate ?? 0) > 0) return "affiliate";
  if (COURSE_TYPES.has(product.product_type)) return "course";
  if (product.source === "ugc" || product.source === "creator") return "ugc";
  if (product.product_type === "physical") return "physical";
  return "digital";
}

/** Interleave lanes so rails feel diverse — not a recommendation algorithm. */
export function diversifyProducts(products: FeedProduct[], limit = SECTION_LIMIT): FeedProduct[] {
  if (products.length <= 1) return products.slice(0, limit);

  const buckets = new Map<ProductLane, FeedProduct[]>();
  for (const p of products) {
    const lane = classifyLane(p);
    const list = buckets.get(lane) ?? [];
    list.push(p);
    buckets.set(lane, list);
  }

  const lanes = [...buckets.keys()];
  const result: FeedProduct[] = [];
  const seen = new Set<string>();
  let round = 0;

  while (result.length < limit && round < limit * 2) {
    let added = false;
    for (const lane of lanes) {
      const bucket = buckets.get(lane);
      if (!bucket?.length) continue;
      const next = bucket.shift();
      if (!next || seen.has(next.id)) continue;
      seen.add(next.id);
      result.push(next);
      added = true;
      if (result.length >= limit) break;
    }
    if (!added) break;
    round += 1;
  }

  return result;
}

function byViewCount(a: FeedProduct, b: FeedProduct) {
  return (b.view_count ?? 0) - (a.view_count ?? 0);
}

function bySaleCount(a: FeedProduct, b: FeedProduct) {
  return (b.sale_count ?? 0) - (a.sale_count ?? 0);
}

function matchesCountry(product: FeedProduct, countryCode: string) {
  const region = (product.shipping_from ?? "").toUpperCase();
  if (!region) return false;
  return region.includes(countryCode) || countryCode.includes(region.slice(0, 2));
}

function matchesSearchInterest(product: FeedProduct, terms: string[]) {
  if (!terms.length) return false;
  const haystack = product.name.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function matchesRouteType(product: FeedProduct, productType: "physical" | "digital"): boolean {
  if (productType === "physical") return product.product_type === "physical";
  return Boolean(product.product_type) && product.product_type !== "physical";
}

function matchesViewedCategory(product: FeedProduct, categoryIds: string[]) {
  if (!categoryIds.length || !product.category_id) return false;
  return categoryIds.includes(product.category_id);
}

function takeUnique(
  pool: FeedProduct[],
  used: Set<string>,
  limit: number,
  predicate?: (p: FeedProduct) => boolean,
): FeedProduct[] {
  const picked: FeedProduct[] = [];
  for (const p of pool) {
    if (picked.length >= limit) break;
    if (used.has(p.id)) continue;
    if (predicate && !predicate(p)) continue;
    used.add(p.id);
    picked.push(p);
  }
  return picked;
}

function buildSection(
  id: PersonalizedSectionId,
  products: FeedProduct[],
  productType: "physical" | "digital",
  viewAllOverride?: string,
): PersonalizedSection | null {
  const diversified = diversifyProducts(products, SECTION_LIMIT);
  if (diversified.length < MIN_PRODUCTS) return null;

  const def = getSectionDefinition(id);
  const baseHref = canonicalMarketplacePath(productType);
  const viewAllHref =
    viewAllOverride ??
    (def.viewAllHash.startsWith("/") ? def.viewAllHash : `${baseHref}${def.viewAllHash}`);
  const description =
    productType === "digital" && id === "trending-near-you"
      ? "Popular digital picks right now."
      : productType === "digital" && id === "popular-in-country"
        ? "Digital products shoppers are buying."
        : def.description;

  return {
    id,
    title: def.title,
    description,
    viewAllHref,
    products: diversified,
    rankingMeta: {
      signalWeights: {},
      diversityScore: diversified.length / SECTION_LIMIT,
    },
  };
}

/**
 * Frontend ranking scaffold — deterministic placeholders until AI services connect.
 * Reads signals only; does not call APIs or change backend logic.
 */
export function buildPersonalizedFeed(input: BuildFeedInput): PersonalizedSection[] {
  const { catalog, flashDeals, newProductIds, signals, productType } = input;
  const pool = catalog.filter((product) => matchesRouteType(product, productType));
  const typedFlashDeals = flashDeals.filter((product) => matchesRouteType(product, productType));
  if (!pool.length) return [];
  const usedAcrossSections = new Set<string>();
  const sections: PersonalizedSection[] = [];

  const push = (
    id: PersonalizedSectionId,
    products: FeedProduct[],
    viewAll?: string,
    trackDedupe = true,
  ) => {
    const section = buildSection(id, products, productType, viewAll);
    if (!section) return;
    sections.push(section);
    if (trackDedupe) {
      for (const p of section.products) usedAcrossSections.add(p.id);
    }
  };

  const pick = (
    source: FeedProduct[],
    limit: number,
    predicate?: (p: FeedProduct) => boolean,
    trackDedupe = true,
  ) =>
    takeUnique(
      source,
      trackDedupe ? usedAcrossSections : new Set<string>(),
      limit,
      predicate,
    );

  // Recommended — high engagement, deprioritize already viewed
  let recommended = pick(
    [...pool].sort(byViewCount),
    SECTION_LIMIT,
    (p) => !signals.viewedProductIds.includes(p.id),
  );
  if (recommended.length < MIN_PRODUCTS) {
    recommended = [
      ...recommended,
      ...pick([...pool].sort(byViewCount), SECTION_LIMIT - recommended.length),
    ].slice(0, SECTION_LIMIT);
  }
  push("recommended-for-you", recommended);

  push(
    "because-you-viewed",
    pick(
      [...pool].sort(bySaleCount),
      SECTION_LIMIT,
      (p) => matchesViewedCategory(p, signals.viewedCategoryIds),
    ),
  );

  push(
    "trending-near-you",
    pick(
      [...pool].sort(byViewCount),
      SECTION_LIMIT,
      (p) => matchesCountry(p, signals.countryCode),
    ),
  );

  push(
    "popular-in-country",
    pick(
      [...pool].sort(bySaleCount),
      SECTION_LIMIT,
      (p) => matchesCountry(p, signals.countryCode) || (p.sale_count ?? 0) > 0,
    ),
  );

  const viewedProducts = signals.viewedProducts
    .map((stub) => pool.find((p) => p.id === stub.id))
    .filter((p): p is FeedProduct => Boolean(p));
  push("recently-viewed", viewedProducts.slice(0, SECTION_LIMIT), undefined, false);

  push(
    "continue-shopping",
    signals.cartProductIds
      .map((id) => pool.find((p) => p.id === id))
      .filter((p): p is FeedProduct => Boolean(p)),
    "/cart",
    false,
  );

  push(
    "similar-interests",
    pick(pool, SECTION_LIMIT, (p) => matchesSearchInterest(p, signals.searchTerms)),
  );

  const newArrivals = newProductIds?.size
    ? pool.filter((p) => newProductIds.has(p.id))
    : [...pool].sort(byViewCount).slice(0, SECTION_LIMIT * 2);
  push("new-arrivals-for-you", pick(newArrivals, SECTION_LIMIT));

  const topPool = [...typedFlashDeals, ...pool].sort(byViewCount);
  push(
    "top-picks-today",
    pick(topPool, SECTION_LIMIT),
    `${canonicalMarketplacePath(productType)}#flash-deals-section`,
  );

  return sections;
}
