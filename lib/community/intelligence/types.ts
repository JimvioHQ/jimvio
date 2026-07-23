/**
 * Jimvio Intelligence Platform — domain types (Phase 7).
 * Sits on workspace / messages / knowledge / OS / commerce / live — no fork.
 */

export const INTELLIGENCE_DOMAINS = [
  "community",
  "creator",
  "knowledge",
  "commerce",
  "live",
  "discovery",
  "moderation",
  "learning",
] as const;

export type IntelligenceDomain = (typeof INTELLIGENCE_DOMAINS)[number];

export const INTELLIGENCE_DOMAIN_LABELS: Record<IntelligenceDomain, string> = {
  community: "Community Intelligence",
  creator: "Creator Intelligence",
  knowledge: "Knowledge Intelligence",
  commerce: "Commerce Intelligence",
  live: "Live Intelligence",
  discovery: "Discovery Intelligence",
  moderation: "Moderation Intelligence",
  learning: "Learning Intelligence",
};

export const RECOMMENDATION_KINDS = [
  "community",
  "group",
  "channel",
  "course",
  "product",
  "event",
  "live",
  "challenge",
  "creator",
] as const;

export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export type IntelligenceRecommendation = {
  id: string;
  kind: RecommendationKind;
  domain: IntelligenceDomain;
  title: string;
  reason: string;
  href?: string | null;
  score: number;
  source: "store" | "overview" | "ai";
};

export const AUTOMATION_KINDS = [
  "faq",
  "knowledge_card",
  "guide",
  "learning_path",
  "task",
  "event",
  "course",
  "product",
  "community_improvement",
] as const;

export type AutomationKind = (typeof AUTOMATION_KINDS)[number];

export type AutomationSuggestion = {
  id: string;
  kind: AutomationKind;
  domain: IntelligenceDomain;
  title: string;
  detail: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
};

export const ANALYTICS_METRICS = [
  "growth",
  "engagement",
  "knowledge",
  "commerce",
  "learning",
  "contribution",
  "trust",
] as const;

export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number];

export type UnifiedInsight = {
  metric: AnalyticsMetric;
  label: string;
  value: number;
  unit?: string;
  trend?: "up" | "flat" | "down";
  note: string;
};

export type DomainInsight = {
  domain: IntelligenceDomain;
  headline: string;
  bullets: string[];
  health: number;
};

export type IntelligenceSnapshot = {
  communityId: string;
  generatedAt: string;
  domains: DomainInsight[];
  recommendations: IntelligenceRecommendation[];
  automations: AutomationSuggestion[];
  analytics: UnifiedInsight[];
};
