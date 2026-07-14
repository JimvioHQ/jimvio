import { getCategoryImageSrc } from "./category-images";
import { dedupeCategories } from "./category-dedup";
import { isRenderableUrl } from "@/lib/utils";

export type CuratedCategory = {
  name: string;
  slug: string;
  /** Keywords used to match rows from product_categories */
  matchKeywords: string[];
  /** Digital-only remote image; physical uses local asset mapping */
  imageUrl?: string;
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=600&h=450&fit=crop&crop=center&q=90&auto=format`;

/** Physical commerce categories — distinct from digital */
export const PHYSICAL_CATEGORY_CATALOG: CuratedCategory[] = [
  {
    name: "Electronics",
    slug: "electronics",
    matchKeywords: ["electron", "gadget", "phone", "smartphone", "computer", "tv", "audio"],
  },
  {
    name: "Fashion",
    slug: "fashion",
    matchKeywords: ["fashion", "cloth", "wear", "apparel", "men", "women", "dress", "shirt"],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    matchKeywords: ["home", "living", "furniture", "garden", "decor", "bedding", "lamp"],
  },
  {
    name: "Health & Beauty",
    slug: "health-beauty",
    matchKeywords: ["health", "beauty", "hair", "makeup", "cosmetic", "wellness", "skincare"],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    matchKeywords: ["sport", "fitness", "gym", "outdoor", "camping", "cycling", "running", "yoga"],
  },
  {
    name: "Automotive",
    slug: "automotive",
    matchKeywords: ["auto", "car", "vehicle", "motorcycle", "automotive"],
  },
  {
    name: "Creator Equipment",
    slug: "creator-equipment",
    matchKeywords: ["creator", "camera", "microphone", "streaming", "tripod", "lighting", "podcast"],
  },
  {
    name: "Gaming Accessories",
    slug: "gaming-accessories",
    matchKeywords: ["gaming", "game", "controller", "headset", "keyboard", "mouse", "console"],
  },
  {
    name: "Kitchen & Dining",
    slug: "kitchen-dining",
    matchKeywords: ["kitchen", "dining", "cookware", "utensil", "appliance", "food", "beverage"],
  },
  {
    name: "Toys & Kids",
    slug: "toys-kids",
    matchKeywords: ["toy", "kids", "children", "baby", "infant", "doll", "puzzle"],
  },
  {
    name: "Pet Supplies",
    slug: "pet-supplies",
    matchKeywords: ["pet", "dog", "cat", "animal", "aquarium"],
  },
  {
    name: "Office Equipment",
    slug: "office-equipment",
    matchKeywords: ["office", "desk", "chair", "stationery", "printer", "supplies"],
  },
];

/** Digital product categories — distinct from physical */
export const DIGITAL_CATEGORY_CATALOG: CuratedCategory[] = [
  {
    name: "Courses & Education",
    slug: "courses-education",
    matchKeywords: ["course", "education", "learning", "training", "tutorial", "class"],
    imageUrl: img("photo-1522202176988-66273c2fd55f"),
  },
  {
    name: "Ebooks",
    slug: "ebooks",
    matchKeywords: ["ebook", "e-book", "book", "reading", "publication"],
    imageUrl: img("photo-1512820790803-83ca734da794"),
  },
  {
    name: "Templates",
    slug: "templates",
    matchKeywords: ["template", "theme", "layout", "preset"],
    imageUrl: img("photo-1618005182384-a83a8bd57fbe"),
  },
  {
    name: "AI Tools",
    slug: "ai-tools",
    matchKeywords: ["ai", "artificial", "machine learning", "gpt", "automation tool"],
    imageUrl: img("photo-1677442136019-21780ecad995"),
  },
  {
    name: "SaaS Products",
    slug: "saas-products",
    matchKeywords: ["saas", "software", "subscription", "platform", "app"],
    imageUrl: img("photo-1551288049-bebda4e38f71"),
  },
  {
    name: "Creator Resources",
    slug: "creator-resources",
    matchKeywords: ["creator", "content", "influencer", "youtube", "social media"],
    imageUrl: img("photo-1611162616305-c69b3fa7fbe0"),
  },
  {
    name: "Design Assets",
    slug: "design-assets",
    matchKeywords: ["design", "graphic", "illustration", "icon", "font", "ui", "ux"],
    imageUrl: img("photo-1626785774573-4b799315345d"),
  },
  {
    name: "Freelance Services",
    slug: "freelance-services",
    matchKeywords: ["freelance", "service", "consulting", "gig", "coaching"],
    imageUrl: img("photo-1600880292203-757bb62b4baf"),
  },
  {
    name: "Marketing Tools",
    slug: "marketing-tools",
    matchKeywords: ["marketing", "seo", "ads", "email", "social", "analytics"],
    imageUrl: img("photo-1460925895917-afdab827c52f"),
  },
  {
    name: "Automation Software",
    slug: "automation-software",
    matchKeywords: ["automation", "workflow", "integrat", "zapier", "bot"],
    imageUrl: img("photo-1555949963-aa79dcee981c"),
  },
  {
    name: "Business Systems",
    slug: "business-systems",
    matchKeywords: ["business", "crm", "erp", "management", "enterprise", "system"],
    imageUrl: img("photo-1552664730-d307ca884978"),
  },
  {
    name: "Communities & Memberships",
    slug: "communities-memberships",
    matchKeywords: ["community", "membership", "group", "forum", "club", "bundle"],
    imageUrl: img("photo-1529156069898-49953e39b3ac"),
  },
];

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
  image_url: string | null;
  tint_color: string | null;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesCurated(db: CategoryRow, curated: CuratedCategory): boolean {
  const dbNorm = normalize(db.slug || db.name);
  const curatedNorm = normalize(curated.slug);
  if (dbNorm === curatedNorm) return true;
  if (dbNorm.includes(curatedNorm) || curatedNorm.includes(dbNorm)) return true;

  const dbWords = dbNorm.split(" ");
  return curated.matchKeywords.some((kw) => {
    const k = normalize(kw);
    return dbNorm.includes(k) || dbWords.some((w) => w.startsWith(k) || k.startsWith(w));
  });
}

function resolveCategoryImage(
  type: "physical" | "digital",
  curated: CuratedCategory,
  dbImageUrl: string | null | undefined,
): string {
  if (type === "physical") {
    if (dbImageUrl && isRenderableUrl(dbImageUrl) && dbImageUrl.includes("/images/categories/")) {
      return dbImageUrl.trim();
    }
    return getCategoryImageSrc(curated.name, curated.slug);
  }
  if (dbImageUrl && isRenderableUrl(dbImageUrl)) {
    return dbImageUrl.trim();
  }
  return curated.imageUrl ?? getCategoryImageSrc(curated.name, curated.slug);
}

/** Map DB categories onto the curated catalog for a marketplace type. */
export function resolveShopCategories(
  type: "physical" | "digital",
  dbCategories: CategoryRow[],
): CategoryRow[] {
  const catalog = type === "physical" ? PHYSICAL_CATEGORY_CATALOG : DIGITAL_CATEGORY_CATALOG;
  const usedDbIds = new Set<string>();
  const dedupedDb = dedupeCategories(dbCategories);

  return catalog.map((curated) => {
    const match = dedupedDb.find(
      (db) => !usedDbIds.has(db.id) && matchesCurated(db, curated),
    );
    if (match) usedDbIds.add(match.id);

    return {
      id: match?.id ?? `catalog-${type}-${curated.slug}`,
      name: curated.name,
      slug: match?.slug ?? curated.slug,
      product_count: match?.product_count ?? null,
      image_url: resolveCategoryImage(type, curated, match?.image_url),
      tint_color: null,
    };
  });
}

/** Jimvio orange gradient tokens for digital branding */
export const JIMVIO_ORANGE = {
  primary: "var(--color-accent)",
  mid: "#FF7A1F",
  light: "#FF8C42",
  gradient: "linear-gradient(90deg, var(--color-accent) 0%, #FF7A1F 50%, #FF8C42 100%)",
  gradient135: "linear-gradient(135deg, var(--color-accent) 0%, #FF7A1F 50%, #FF8C42 100%)",
  glow: "0 4px 20px rgba(255, 90, 31, 0.45)",
  glowSoft: "rgba(255, 90, 31, 0.55)",
} as const;
