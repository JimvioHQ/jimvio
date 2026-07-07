import type { OpportunityType } from "./types";

export const OPPORTUNITY_TYPE_META: Record<
  OpportunityType,
  { emoji: string; label: string; accent: string }
> = {
  "trending-products": { emoji: "🔥", label: "Trending Products", accent: "#fd5000" },
  "high-affiliate": { emoji: "💰", label: "High Affiliate Commissions", accent: "#16a34a" },
  "ugc-campaigns": { emoji: "🎥", label: "UGC Campaigns", accent: "#7c3aed" },
  "viral-products": { emoji: "🚀", label: "Viral Products", accent: "#2563eb" },
  "fast-categories": { emoji: "📈", label: "Fast Growing Categories", accent: "#0891b2" },
  "new-creator": { emoji: "🏆", label: "New Creator Opportunities", accent: "#ea580c" },
  "popular-country": { emoji: "🌍", label: "Popular In Your Country", accent: "#0d9488" },
  "high-profit": { emoji: "💎", label: "High Profit Products", accent: "#4f46e5" },
  "featured-communities": { emoji: "⭐", label: "Featured Communities", accent: "#ca8a04" },
  "recommended-courses": { emoji: "🎓", label: "Recommended Courses", accent: "#db2777" },
};

export const OPPORTUNITY_FILTER_GROUPS = [
  {
    id: "difficulty",
    label: "Experience",
    filters: [
      { id: "all", label: "All levels" },
      { id: "beginner", label: "Beginner" },
      { id: "intermediate", label: "Intermediate" },
      { id: "advanced", label: "Advanced" },
    ],
  },
  {
    id: "lane",
    label: "Type",
    filters: [
      { id: "physical", label: "Physical" },
      { id: "digital", label: "Digital" },
      { id: "affiliate", label: "Affiliate" },
      { id: "ugc", label: "UGC" },
      { id: "course", label: "Course" },
      { id: "community", label: "Community" },
    ],
  },
] as const;

export function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export const SCORE_LEVEL_STYLES = {
  high: { label: "High", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  medium: { label: "Medium", color: "#ca8a04", bg: "rgba(202,138,4,0.12)" },
  low: { label: "Low", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
} as const;
