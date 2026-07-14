import type {
  BusinessCollaborationId,
  BusinessDiscoveryId,
  BusinessEntityKind,
  BusinessRelationId,
  BusinessSearchKind,
} from "./types";

export const BUSINESS_ENTITY_META: Record<
  BusinessEntityKind,
  { emoji: string; label: string; accent: string }
> = {
  buyer: { emoji: "🛒", label: "Buyer", accent: "#64748b" },
  creator: { emoji: "👤", label: "Creator", accent: "#7c3aed" },
  seller: { emoji: "🏪", label: "Seller", accent: "var(--color-accent)" },
  brand: { emoji: "🏷️", label: "Brand", accent: "#2563eb" },
  product: { emoji: "🛍️", label: "Product", accent: "var(--color-accent-hover)" },
  "affiliate-program": { emoji: "💰", label: "Affiliate Program", accent: "#16a34a" },
  "ugc-campaign": { emoji: "🎥", label: "UGC Campaign", accent: "#7c3aed" },
  community: { emoji: "⭐", label: "Community", accent: "#ca8a04" },
  course: { emoji: "🎓", label: "Course", accent: "#db2777" },
  "live-event": { emoji: "🔴", label: "Live Event", accent: "#dc2626" },
  collection: { emoji: "📚", label: "Collection", accent: "#4f46e5" },
  bundle: { emoji: "📦", label: "Bundle", accent: "#0891b2" },
};

export const BUSINESS_DISCOVERY_META: Record<BusinessDiscoveryId, { title: string; description: string }> = {
  "suggested-creators": { title: "Suggested Creators", description: "Creators aligned with your business graph" },
  "suggested-partners": { title: "Suggested Partners", description: "High-fit commercial partners" },
  "suggested-affiliates": { title: "Suggested Affiliates", description: "Affiliate programs worth joining" },
  "suggested-communities": { title: "Suggested Communities", description: "Hubs with partnership potential" },
  "suggested-products": { title: "Suggested Products", description: "Products to sell or promote" },
  "suggested-campaigns": { title: "Suggested Campaigns", description: "Campaigns open for collaboration" },
  "trending-collaborations": { title: "Trending Collaborations", description: "Active brand-creator deals" },
};

export const BUSINESS_COLLABORATION_META: Record<BusinessCollaborationId, { title: string; description: string }> = {
  "recommended-partnerships": { title: "Recommended Partnerships", description: "Best-fit partnership opportunities" },
  "potential-collaborators": { title: "Potential Collaborators", description: "Creators and brands to connect with" },
  "campaign-invitations": { title: "Campaign Invitations", description: "Open campaign invites" },
  "brand-opportunities": { title: "Brand Opportunities", description: "Brand deals seeking creators" },
  "creator-opportunities": { title: "Creator Opportunities", description: "Creators seeking brand partners" },
  "affiliate-opportunities": { title: "Affiliate Opportunities", description: "Commission-based partnerships" },
};

export const BUSINESS_RELATION_META: Record<BusinessRelationId, { title: string; description: string }> = {
  "products-sold": { title: "Products Sold", description: "Catalog revenue" },
  "products-promoted": { title: "Products Promoted", description: "Affiliate promotions" },
  "affiliate-partnerships": { title: "Affiliate Partnerships", description: "Active affiliate relationships" },
  "communities-managed": { title: "Communities Managed", description: "Owned or managed hubs" },
  "courses-published": { title: "Courses Published", description: "Educational offers" },
  "ugc-campaigns-joined": { title: "UGC Campaigns Joined", description: "Creator content deals" },
  "brand-collaborations": { title: "Brand Collaborations", description: "Brand partnerships" },
  followers: { title: "Followers", description: "Audience reach" },
  "business-reputation": { title: "Business Reputation", description: "Trust and reviews" },
};

export const BUSINESS_SEARCH_FILTERS: Array<{ id: BusinessSearchKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "creator", label: "Creator" },
  { id: "brand", label: "Brand" },
  { id: "seller", label: "Seller" },
  { id: "community", label: "Community" },
  { id: "campaign", label: "Campaign" },
  { id: "affiliate-program", label: "Affiliate" },
  { id: "course", label: "Course" },
];

export const INSIGHT_LEVEL_STYLES = {
  high: { color: "#16a34a", label: "High" },
  medium: { color: "#ca8a04", label: "Medium" },
  low: { color: "#64748b", label: "Low" },
} as const;

export function strengthToLevel(strength: number): keyof typeof INSIGHT_LEVEL_STYLES {
  if (strength >= 75) return "high";
  if (strength >= 50) return "medium";
  return "low";
}
