/** Local category assets — /public/images/categories/ */
export const CATEGORY_IMAGE_BASE = "/images/categories/";

/** Explicit physical catalog slug → asset file */
const PHYSICAL_SLUG_TO_FILE: Record<string, string> = {
  electronics: "Consumer Electronics.png",
  fashion: "Women's Clothing.png",
  "home-living": "Home, Garden & Furniture.png",
  "health-beauty": "Health, Beauty & Hair.png",
  "sports-outdoors": "Sports & Outdoors.png",
  automotive: "Automobiles & Motorcycles.png",
  "creator-equipment": "Consumer Electronics.png",
  "gaming-accessories": "Consumer Electronics.png",
  "kitchen-dining": "Home, Garden & Furniture.png",
  "toys-kids": "Toys, Kids & Babies.png",
  "pet-supplies": "Pet Supplies.png",
  "office-equipment": "Computer & Office.png",
};

const CATEGORY_IMAGE_MAP: { keywords: string[]; file: string }[] = [
  { keywords: ["auto", "car", "vehicle", "motorcycle", "bike", "motor", "automotive"], file: "Automobiles & Motorcycles.png" },
  { keywords: ["bag", "shoe", "sneaker", "backpack", "purse", "footwear", "boot", "sandal", "luggage", "fashion"], file: "Bags & Shoes.png" },
  { keywords: ["computer", "office", "laptop", "pc", "printer", "stationery", "monitor", "keyboard", "mouse", "desk"], file: "Computer & Office.png" },
  { keywords: ["electron", "gadget", "tv", "television", "camera", "audio", "speaker", "smart", "wearable", "drone", "gaming", "creator", "stream"], file: "Consumer Electronics.png" },
  { keywords: ["health", "beauty", "hair", "makeup", "cosmetic", "wellness", "skincare"], file: "Health, Beauty & Hair.png" },
  { keywords: ["home improvement", "tool", "hardware", "diy", "repair", "drill", "saw", "plumbing", "electrical"], file: "Home Improvement.png" },
  { keywords: ["home", "garden", "furniture", "kitchen", "living", "household", "plant", "sofa", "cookware", "bedding", "decor", "lamp", "curtain", "dining"], file: "Home, Garden & Furniture.png" },
  { keywords: ["jewel", "watch", "ring", "earring", "necklace", "bracelet", "accessory", "pendant", "gemstone"], file: "Jewelry & Watches.png" },
  { keywords: ["men", "shirt", "jacket", "trouser", "pant", "coat", "outerwear", "suit", "hoodie", "sweatshirt"], file: "Men's Clothing.png" },
  { keywords: ["pet", "dog", "cat", "animal", "aquarium", "bird", "hamster"], file: "Pet Supplies.png" },
  { keywords: ["phone", "smartphone", "mobile", "tablet", "iphone", "android", "charger", "case", "screen protector"], file: "Phones & Accessories.png" },
  { keywords: ["sport", "fitness", "gym", "outdoor", "camping", "basketball", "soccer", "cycling", "running", "yoga", "hiking"], file: "Sports & Outdoors.png" },
  { keywords: ["toy", "kids", "children", "baby", "infant", "game", "puzzle", "doll", "lego"], file: "Toys, Kids & Babies.png" },
  { keywords: ["women", "dress", "tops", "blouse", "skirt", "cloth", "wear", "leggings", "lingerie", "apparel"], file: "Women's Clothing.png" },
];

const DEFAULT_CATEGORY_FILE = "Consumer Electronics.png";

/** Resolve a physical category image from slug and/or display name. */
export function getCategoryImageSrc(name: string, slug?: string | null): string {
  const normalizedSlug = slug?.trim().toLowerCase();
  if (normalizedSlug && PHYSICAL_SLUG_TO_FILE[normalizedSlug]) {
    return `${CATEGORY_IMAGE_BASE}${PHYSICAL_SLUG_TO_FILE[normalizedSlug]}`;
  }

  const n = name.toLowerCase();
  const match = CATEGORY_IMAGE_MAP.find(({ keywords }) =>
    keywords.some((kw) => n.includes(kw)),
  );
  return `${CATEGORY_IMAGE_BASE}${match ? match.file : DEFAULT_CATEGORY_FILE}`;
}

/** All mapped asset filenames (for fallback rotation on error). */
export function getCategoryImageFallbacks(name: string, slug?: string | null): string[] {
  const primary = getCategoryImageSrc(name, slug);
  const seen = new Set<string>([primary]);
  const fallbacks: string[] = [primary];

  for (const { file } of CATEGORY_IMAGE_MAP) {
    const url = `${CATEGORY_IMAGE_BASE}${file}`;
    if (!seen.has(url)) {
      seen.add(url);
      fallbacks.push(url);
    }
  }
  return fallbacks;
}
