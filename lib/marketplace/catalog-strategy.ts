/**
 * Jimvio product strategy 2026–2030 (owner research, Nov 2026).
 *
 * Focus on products people keep needing: useful, durable, saving time or
 * money, demonstrable on video. Used by the admin CJ import presets and the
 * catalog-refresh review.
 */

export type StrategyCategoryId =
  | "smart_home"
  | "power_energy"
  | "wearables_tech"
  | "beauty_care"
  | "creator_workspace"
  | "kitchen_everyday"
  | "pet_care"
  | "travel_mobility";

export type StrategyCategory = {
  id: StrategyCategoryId;
  label: string;
  priority: 1 | 2;
  /** Target number of live products in the first curated catalog (200 total). */
  target: number;
  /** Search terms for the CJ catalog (English, as CJ indexes them). */
  keywords: readonly string[];
};

export const STRATEGY_CATEGORIES: readonly StrategyCategory[] = [
  { id: "smart_home", label: "Smart Home & Security", priority: 1, target: 30, keywords: ["smart plug", "smart led bulb", "motion sensor light", "smart doorbell", "indoor security camera", "temperature humidity sensor"] },
  { id: "power_energy", label: "Power & Energy", priority: 1, target: 25, keywords: ["power bank", "portable solar panel", "rechargeable led light", "usb c fast charger", "charging station", "portable power station"] },
  { id: "wearables_tech", label: "Wearables & Personal Tech", priority: 1, target: 30, keywords: ["smart watch", "smart ring", "wireless earbuds", "bluetooth tracker", "fitness tracker"] },
  { id: "beauty_care", label: "Beauty & Personal Care", priority: 1, target: 30, keywords: ["facial cleansing brush", "hair styling tool", "hair dryer brush", "skincare device", "nail care kit"] },
  { id: "creator_workspace", label: "Creator & Workspace", priority: 1, target: 30, keywords: ["laptop stand", "wireless keyboard mouse", "usb c hub", "lavalier microphone", "ring light", "phone tripod"] },
  { id: "kitchen_everyday", label: "Kitchen & Everyday Essentials", priority: 2, target: 25, keywords: ["portable blender", "food storage container", "kitchen organizer", "insulated water bottle", "air fryer"] },
  { id: "pet_care", label: "Pet Care & Smart Pet", priority: 2, target: 15, keywords: ["automatic pet feeder", "pet water fountain", "interactive pet toy", "pet grooming tool", "dog harness"] },
  { id: "travel_mobility", label: "Travel & Everyday Mobility", priority: 2, target: 15, keywords: ["travel organizer", "anti theft backpack", "packing cubes", "luggage scale", "universal travel adapter"] },
];

export type RefreshInput = {
  inStrategy: boolean;
  isTrending: boolean;
  hasVideo: boolean;
  views: number;
  priceUsd: number | null;
  imageCount: number;
  /** 1 = best copy among near-identical titles in the same category. */
  duplicateRank: number;
};

export type RefreshDecision =
  | "keep_strategic"
  | "keep_trending"
  | "remove_duplicate"
  | "remove_low_value"
  | "remove_weak_photos"
  | "remove_off_strategy";

/**
 * Keep what fits the strategy or shows real demand; take off sale (reversibly)
 * duplicates, very low-value items with no demand signal, listings with too few
 * photos, and off-strategy items with no signal at all.
 */
export function decideRefresh(input: RefreshInput): RefreshDecision {
  if (input.duplicateRank > 1) return "remove_duplicate";
  if ((input.priceUsd ?? 0) < 1.5 && !input.isTrending) return "remove_low_value";
  if (input.imageCount < 3) return "remove_weak_photos";
  if (input.inStrategy) return "keep_strategic";
  if (input.isTrending || input.hasVideo || input.views >= 3) return "keep_trending";
  return "remove_off_strategy";
}

export const isRemoval = (decision: RefreshDecision) => decision.startsWith("remove_");
