/**
 * Affiliate Center discovery categories.
 * Labels are presentation-only. Database product_type values and category
 * slugs stay unchanged. Featured is a real is_featured filter, not a badge.
 *
 * A product lands in exactly one category. Unknown product types are left
 * unmapped so they are not silently hidden inside Others.
 */

import { DIGITAL_TAXONOMY, type DigitalTaxonomyNode } from "@/lib/products/digital-taxonomy";

export const AFFILIATE_DISCOVERY_CATEGORIES = [
  { id: "featured", label: "Featured", icon: "star" },
  { id: "physical", label: "Physical Products", icon: "bag" },
  { id: "digital", label: "Digital Products", icon: "laptop" },
  { id: "ebooks", label: "eBooks & Guides", icon: "book" },
  { id: "services", label: "Websites & Online Services", icon: "globe" },
  { id: "courses", label: "Courses & Learning", icon: "cap" },
  { id: "software", label: "Apps & Software", icon: "grid" },
  { id: "others", label: "Others", icon: "dots" },
] as const;

export type AffiliateDiscoveryCategoryId =
  (typeof AFFILIATE_DISCOVERY_CATEGORIES)[number]["id"];

export type AffiliateDiscoveryBucket = Exclude<AffiliateDiscoveryCategoryId, "featured">;

export type DiscoveryCategoryIds = Record<AffiliateDiscoveryBucket, string[]>;

/** product_type enum values from schema.sql. Keep this list in sync with that enum. */
export const KNOWN_AFFILIATE_PRODUCT_TYPES = [
  "physical",
  "digital",
  "subscription",
  "course",
  "software",
  "template",
  "ebook",
  "coaching",
  "community",
  "bundle",
] as const;

const KNOWN_TYPE_SET = new Set<string>(KNOWN_AFFILIATE_PRODUCT_TYPES);

export type AffiliateClassifiableProduct = {
  productType?: string | null;
  isDigital?: boolean | null;
  isFeatured?: boolean | null;
  categorySlug?: string | null;
  name?: string | null;
  slug?: string | null;
  shortDescription?: string | null;
};

export type AffiliateClassification = {
  category: AffiliateDiscoveryBucket | null;
  featured: boolean;
  unmapped: boolean;
};

type SlugBucket = Exclude<AffiliateDiscoveryBucket, "physical" | "digital">;

const EXTRA_SLUGS: Record<string, SlugBucket> = {
  ebooks: "ebooks",
  courses: "courses",
  software: "software",
  "ai-tools": "software",
};

function bucketFromText(text: string): SlugBucket | null {
  const value = text.toLowerCase();
  if (/(^|[^a-z])other([^a-z]|$)|misc/.test(value)) return "others";
  if (/(ebook|e-book|guide|workbook|manual|audiobook|\bbooks?\b|\bpdf\b)/.test(value)) {
    return "ebooks";
  }
  if (
    /(course|tutorial|workshop|masterclass|lesson|study|exam|teaching|certification|training|coaching|learning|education)/.test(
      value,
    )
  ) {
    return "courses";
  }
  if (
    /(software|saas|plugin|extension|source-code|developer|no-code|low-code|automation|\bapps?\b|\bapi\b|\bcode\b)/.test(
      value,
    )
  ) {
    return "software";
  }
  if (/(subscription|membership|website|webinar|community|ticket)/.test(value)) {
    return "services";
  }
  return null;
}

function walkTaxonomy(
  node: DigitalTaxonomyNode,
  parent: SlugBucket | null,
  into: Map<string, SlugBucket>,
) {
  const own = bucketFromText(`${node.slug} ${node.name}`) ?? parent;
  if (own) into.set(node.slug, own);
  for (const child of node.children ?? []) walkTaxonomy(child, own, into);
}

function buildSlugBuckets(): Map<string, SlugBucket> {
  const buckets = new Map<string, SlugBucket>();
  for (const node of DIGITAL_TAXONOMY) walkTaxonomy(node, null, buckets);
  for (const [slug, bucket] of Object.entries(EXTRA_SLUGS)) buckets.set(slug, bucket);
  return buckets;
}

const SLUG_BUCKETS = buildSlugBuckets();

export function affiliateSlugBucket(slug: string | null | undefined): SlugBucket | null {
  const key = slug?.trim().toLowerCase() ?? "";
  if (!key) return null;
  return SLUG_BUCKETS.get(key) ?? null;
}

export function discoveryCategorySlugs(): string[] {
  return [...SLUG_BUCKETS.keys()];
}

export function emptyDiscoveryCategoryIds(): DiscoveryCategoryIds {
  return {
    physical: [],
    digital: [],
    ebooks: [],
    courses: [],
    software: [],
    services: [],
    others: [],
  };
}

export function parseAffiliateDiscoveryCategory(
  raw: string | null | undefined,
): AffiliateDiscoveryCategoryId | null {
  const value = raw?.trim().toLowerCase() ?? "";
  if (!value) return null;
  const match = AFFILIATE_DISCOVERY_CATEGORIES.find((category) => category.id === value);
  return match?.id ?? null;
}

export function affiliateDiscoveryLabel(id: AffiliateDiscoveryCategoryId): string {
  return AFFILIATE_DISCOVERY_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function affiliateDiscoverySectionTitle(id: AffiliateDiscoveryCategoryId): string {
  if (id === "featured") return "Featured products to promote";
  if (id === "others") return "Other products to promote";
  return `${affiliateDiscoveryLabel(id)} to promote`;
}

/** Strip characters that would change a PostgREST or() filter. */
export function normalizeAffiliateSearch(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/[%_(),\\"'`&=?#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function affiliateDiscoveryHref(
  category: AffiliateDiscoveryCategoryId,
  search = "",
  options?: { includeCategory?: boolean },
): string {
  const params = new URLSearchParams();
  if (options?.includeCategory !== false) params.set("category", category);
  const q = normalizeAffiliateSearch(search);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/affiliates?${query}` : "/affiliates";
}

export function filterDiscoveryCategories(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [...AFFILIATE_DISCOVERY_CATEGORIES];
  return AFFILIATE_DISCOVERY_CATEGORIES.filter((category) => {
    const label = category.label.toLowerCase();
    return label.includes(q) || category.id.includes(q);
  });
}

export function classifyAffiliateProduct(
  product: AffiliateClassifiableProduct,
): AffiliateClassification {
  const type = (product.productType ?? "").trim().toLowerCase();
  const slugBucket = affiliateSlugBucket(product.categorySlug);
  const featured = product.isFeatured === true;
  let category: AffiliateDiscoveryBucket | null = null;
  let unmapped = false;

  switch (type) {
    case "physical":
      category = "physical";
      break;
    case "ebook":
      category = "ebooks";
      break;
    case "course":
    case "coaching":
      category = "courses";
      break;
    case "software":
      category = "software";
      break;
    case "subscription":
    case "community":
      category = "services";
      break;
    case "digital":
      category = slugBucket ?? "digital";
      break;
    case "template":
    case "bundle":
      // No dedicated Affiliate Center category. A more specific slug still wins.
      category = slugBucket ?? "others";
      break;
    case "":
      if (product.isDigital === true) category = slugBucket ?? "digital";
      else if (product.isDigital === false) category = "physical";
      else if (slugBucket) category = slugBucket;
      else unmapped = true;
      break;
    default:
      if (slugBucket) category = slugBucket;
      else unmapped = true;
      break;
  }

  if (type && !KNOWN_TYPE_SET.has(type) && !slugBucket) unmapped = true;
  return { category, featured, unmapped };
}

export function productMatchesAffiliateSearch(
  product: AffiliateClassifiableProduct,
  search: string,
): boolean {
  const q = normalizeAffiliateSearch(search).toLowerCase();
  if (!q) return true;
  return [product.name, product.slug, product.shortDescription].some((value) =>
    (value ?? "").toLowerCase().includes(q),
  );
}

export type AffiliateDiscoveryQueryPlan = {
  /** Normalized catalog search. Non-empty searches ignore the selected category. */
  search: string;
  /** Category scope used only when search is empty. */
  category: AffiliateDiscoveryCategoryId | null;
};

/**
 * A product search covers every eligible affiliate product.
 * The selected category applies again only after the search is cleared.
 */
export function affiliateDiscoveryQuery(input: {
  category?: AffiliateDiscoveryCategoryId | null;
  search?: string | null;
}): AffiliateDiscoveryQueryPlan {
  const search = normalizeAffiliateSearch(input.search);
  if (search) return { search, category: null };
  return { search: "", category: input.category ?? null };
}

/** Category filter, or a catalog-wide search when a query is present. */
export function productMatchesDiscoveryView(
  product: AffiliateClassifiableProduct,
  category: AffiliateDiscoveryCategoryId,
  search = "",
): boolean {
  const plan = affiliateDiscoveryQuery({ category, search });
  if (plan.search) return productMatchesAffiliateSearch(product, plan.search);
  if (plan.category === "featured") return product.isFeatured === true;
  if (plan.category) return classifyAffiliateProduct(product).category === plan.category;
  return true;
}

function quoteIlike(term: string): string {
  return `"%${term.replace(/"/g, '""')}%"`;
}

export function affiliateSearchOrFilter(search: string): string | null {
  const term = normalizeAffiliateSearch(search);
  if (!term) return null;
  const pattern = quoteIlike(term);
  return [`name.ilike.${pattern}`, `slug.ilike.${pattern}`, `short_description.ilike.${pattern}`].join(
    ",",
  );
}

function idList(ids: string[]): string {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].join(",");
}

function joinOr(clauses: Array<string | null | undefined | false>): string {
  return clauses.filter((clause): clause is string => Boolean(clause)).join(",");
}

/**
 * PostgREST or() clause matching classifyAffiliateProduct for one category.
 * Featured is applied separately with is_featured = true.
 */
export function affiliateDiscoveryOrFilter(
  category: AffiliateDiscoveryBucket,
  ids: DiscoveryCategoryIds,
): string {
  const ebookIds = idList(ids.ebooks);
  const courseIds = idList(ids.courses);
  const softwareIds = idList(ids.software);
  const serviceIds = idList(ids.services);
  const otherIds = idList(ids.others);
  const specific = idList([...ids.ebooks, ...ids.courses, ...ids.software, ...ids.services]);
  const exclude = idList([
    ...ids.ebooks,
    ...ids.courses,
    ...ids.software,
    ...ids.services,
    ...ids.others,
  ]);

  const slugClause = (types: string, categoryIds: string) =>
    categoryIds
      ? `and(product_type.in.(${types}),category_id.in.(${categoryIds}))`
      : null;
  const nullDigitalSlug = (categoryIds: string) =>
    categoryIds
      ? `and(product_type.is.null,is_digital.eq.true,category_id.in.(${categoryIds}))`
      : null;

  switch (category) {
    case "physical":
      return joinOr([
        "product_type.eq.physical",
        "and(product_type.is.null,is_digital.eq.false)",
      ]);
    case "ebooks":
      return joinOr([
        "product_type.eq.ebook",
        slugClause("digital,template,bundle", ebookIds),
        nullDigitalSlug(ebookIds),
      ]);
    case "courses":
      return joinOr([
        "product_type.in.(course,coaching)",
        slugClause("digital,template,bundle", courseIds),
        nullDigitalSlug(courseIds),
      ]);
    case "software":
      return joinOr([
        "product_type.eq.software",
        slugClause("digital,template,bundle", softwareIds),
        nullDigitalSlug(softwareIds),
      ]);
    case "services":
      return joinOr([
        "product_type.in.(subscription,community)",
        slugClause("digital,template,bundle", serviceIds),
        nullDigitalSlug(serviceIds),
      ]);
    case "digital": {
      const digitalCategory = exclude
        ? `and(product_type.eq.digital,or(category_id.is.null,category_id.not.in.(${exclude})))`
        : "product_type.eq.digital";
      const untyped = exclude
        ? `and(product_type.is.null,is_digital.eq.true,or(category_id.is.null,category_id.not.in.(${exclude})))`
        : "and(product_type.is.null,is_digital.eq.true)";
      return joinOr([digitalCategory, untyped]);
    }
    case "others": {
      const residual = specific
        ? joinOr([
            "and(product_type.in.(template,bundle),category_id.is.null)",
            `and(product_type.in.(template,bundle),category_id.not.in.(${specific}))`,
          ])
        : "product_type.in.(template,bundle)";
      return joinOr([
        residual,
        slugClause("digital,template,bundle", otherIds),
        nullDigitalSlug(otherIds),
      ]);
    }
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}
