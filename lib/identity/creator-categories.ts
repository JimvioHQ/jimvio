/**
 * What a creator makes. Grouped so the picker stays easy to scan; people can
 * also type their own. A profile keeps up to MAX_CATEGORIES.
 */
export const MAX_CATEGORIES = 3;

export const CREATOR_CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  { group: "Music & audio", items: ["Music", "Afrobeats", "Hip-hop & rap", "Gospel & worship", "DJ & mixes", "Music production", "Podcasts", "Singing & covers"] },
  { group: "Entertainment", items: ["Comedy & skits", "Film & video", "Animation", "Anime", "Dance", "Theatre & acting", "Celebrity & pop culture", "Reactions"] },
  { group: "Technology", items: ["Technology", "AI", "Software & coding", "Gadgets & reviews", "Crypto & Web3", "Cybersecurity", "Science"] },
  { group: "Gaming", items: ["Gaming", "Esports", "Mobile gaming", "Live streaming"] },
  { group: "Style & beauty", items: ["Fashion", "Beauty & makeup", "Skincare", "Hair", "Nails", "Luxury", "Streetwear"] },
  { group: "Health & fitness", items: ["Fitness", "Yoga", "Running", "Martial arts", "Nutrition", "Health & wellness", "Mental wellness"] },
  { group: "Food & drink", items: ["Food & cooking", "Street food", "Restaurants", "Baking", "Drinks"] },
  { group: "Travel & places", items: ["Travel", "Outdoors & adventure", "Cities & culture", "Hotels & stays"] },
  { group: "Money & work", items: ["Finance", "Business", "Entrepreneurship", "Marketing", "Careers", "Real estate", "Productivity", "E-commerce"] },
  { group: "Learning", items: ["Education", "Languages", "History & culture", "Books & writing", "Motivation", "Law"] },
  { group: "Sports", items: ["Football", "Basketball", "Athletics", "Cycling", "Boxing", "Motorsport", "Sports news"] },
  { group: "Life & home", items: ["Lifestyle", "Family & parenting", "Kids", "Relationships", "Weddings & events", "Home & interior", "DIY & crafts", "Gardening", "Pets & animals"] },
  { group: "Art & design", items: ["Art & illustration", "Photography", "Graphic design", "Architecture", "Poetry"] },
  { group: "Cars & machines", items: ["Cars", "Motorcycles", "Aviation"] },
  { group: "Community & world", items: ["News & current affairs", "Faith & spirituality", "Agriculture", "Environment", "Charity & social impact", "Shopping & deals", "Unboxing"] },
];

export const CREATOR_CATEGORIES: string[] = CREATOR_CATEGORY_GROUPS.flatMap((g) => g.items);

export function cleanCategories(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const value = raw.replace(/\s+/g, " ").trim().slice(0, 40);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_CATEGORIES) break;
  }
  return out;
}
