export type {
  AnalyticsMetric,
  AutomationKind,
  AutomationSuggestion,
  DomainInsight,
  IntelligenceDomain,
  IntelligenceRecommendation,
  IntelligenceSnapshot,
  RecommendationKind,
  UnifiedInsight,
} from "./types";

export {
  ANALYTICS_METRICS,
  AUTOMATION_KINDS,
  INTELLIGENCE_DOMAINS,
  INTELLIGENCE_DOMAIN_LABELS,
  RECOMMENDATION_KINDS,
} from "./types";

export {
  buildIntelligenceSnapshot,
  deriveAnalytics,
  deriveAutomations,
  deriveDomainInsights,
  deriveRecommendations,
  formatIntelligenceContext,
  type IntelligenceInput,
} from "./derive";

export { useIntelligenceStore } from "./store";
