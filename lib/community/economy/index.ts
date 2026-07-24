export type {
  OpportunityKind,
  OpportunityDifficulty,
  OpportunityStatus,
  CreatorOpportunity,
  ReputationAxes,
  MatchRecommendationKind,
  MatchRecommendation,
  DiscoveryBucket,
  DiscoveryItem,
  CareerCoachTip,
  EconomyOverviewInput,
  CreatorMatchProvider,
} from "./types";

export {
  OPPORTUNITY_KINDS,
  OPPORTUNITY_KIND_LABELS,
} from "./types";

export { deriveOpportunities } from "./opportunities";
export {
  recommendMatches,
  getCreatorMatchProvider,
  setCreatorMatchProvider,
  localCreatorMatchProvider,
} from "./matching";

export type { CreatorProfilePro } from "./derive";
export {
  deriveReputation,
  deriveCreatorProfilePro,
  deriveCareerCoach,
  deriveGlobalDiscovery,
} from "./derive";

export type {
  BrandShortlistEntry,
  CampaignWorkspace,
} from "./brand-crm-store";

export {
  useBrandCrmStore,
  buildWorkspaceFromOpportunity,
} from "./brand-crm-store";
