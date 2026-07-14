import type { GraphNodeKind, GraphSectionId } from "./types";

export const GRAPH_NODE_META: Record<
  GraphNodeKind,
  { emoji: string; label: string; accent: string }
> = {
  product: { emoji: "🛍️", label: "Product", accent: "var(--color-accent)" },
  creator: { emoji: "👤", label: "Creator", accent: "#7c3aed" },
  community: { emoji: "⭐", label: "Community", accent: "#ca8a04" },
  course: { emoji: "🎓", label: "Course", accent: "#db2777" },
  campaign: { emoji: "🎥", label: "Campaign", accent: "#2563eb" },
  bundle: { emoji: "📦", label: "Bundle", accent: "#0891b2" },
  collection: { emoji: "📚", label: "Collection", accent: "#4f46e5" },
  "live-event": { emoji: "🔴", label: "Live Event", accent: "#dc2626" },
  affiliate: { emoji: "💰", label: "Affiliate", accent: "#16a34a" },
};

export const GRAPH_SECTION_META: Record<
  GraphSectionId,
  { title: string; description?: string }
> = {
  "related-creators": {
    title: "Related Creators",
    description: "Creators connected to this item",
  },
  "related-products": {
    title: "Related Products",
    description: "Products in the same commerce graph",
  },
  "people-also-bought": {
    title: "People also bought",
    description: "Frequently purchased together",
  },
  "creators-promoting": {
    title: "Creators promoting this",
    description: "Affiliate creators driving sales",
  },
  "ugc-using": {
    title: "UGC using this product",
    description: "Creator content featuring this item",
  },
  "communities-discussing": {
    title: "Communities discussing this",
    description: "Active hubs around this topic",
  },
  "courses-teaching": {
    title: "Courses teaching this topic",
    description: "Learn and monetize the same niche",
  },
  "upcoming-events": {
    title: "Upcoming Live Events",
    description: "Sessions connected to this graph",
  },
  "affiliate-opportunities": {
    title: "Affiliate Opportunities",
    description: "Earn by promoting connected items",
  },
  bundles: {
    title: "Bundles",
    description: "Curated product bundles",
  },
  collections: {
    title: "Collections",
    description: "Digital collections in this graph",
  },
  "creator-products": {
    title: "Products",
    description: "From this creator's store",
  },
  "creator-communities": {
    title: "Communities",
    description: "Hubs run by this creator",
  },
  "creator-campaigns": {
    title: "Campaigns",
    description: "UGC and affiliate campaigns",
  },
  "creator-courses": {
    title: "Courses",
    description: "Educational offers from this creator",
  },
  "community-creators": {
    title: "Creators in this hub",
    description: "People powering this community",
  },
  "community-products": {
    title: "Products in this community",
    description: "Commerce connected to this hub",
  },
  "community-courses": {
    title: "Courses in this community",
    description: "Learning paths in this hub",
  },
  "community-events": {
    title: "Events in this community",
    description: "Live sessions and meetups",
  },
};

export const STRENGTH_STYLES = {
  strong: { label: "Strong", color: "#16a34a", min: 75 },
  moderate: { label: "Moderate", color: "#ca8a04", min: 50 },
  weak: { label: "Emerging", color: "#64748b", min: 0 },
} as const;

export function getStrengthLabel(strength: number): keyof typeof STRENGTH_STYLES {
  if (strength >= STRENGTH_STYLES.strong.min) return "strong";
  if (strength >= STRENGTH_STYLES.moderate.min) return "moderate";
  return "weak";
}
