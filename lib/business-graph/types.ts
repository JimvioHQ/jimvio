export type BusinessEntityKind =
  | "buyer"
  | "creator"
  | "seller"
  | "brand"
  | "product"
  | "affiliate-program"
  | "ugc-campaign"
  | "community"
  | "course"
  | "live-event"
  | "collection"
  | "bundle";

export type BusinessContextKind = "creator" | "community" | "product" | "seller";

export type BusinessDiscoveryId =
  | "suggested-creators"
  | "suggested-partners"
  | "suggested-affiliates"
  | "suggested-communities"
  | "suggested-products"
  | "suggested-campaigns"
  | "trending-collaborations";

export type BusinessCollaborationId =
  | "recommended-partnerships"
  | "potential-collaborators"
  | "campaign-invitations"
  | "brand-opportunities"
  | "creator-opportunities"
  | "affiliate-opportunities";

export type BusinessRelationId =
  | "products-sold"
  | "products-promoted"
  | "affiliate-partnerships"
  | "communities-managed"
  | "courses-published"
  | "ugc-campaigns-joined"
  | "brand-collaborations"
  | "followers"
  | "business-reputation";

export type BusinessSearchKind =
  | "creator"
  | "brand"
  | "seller"
  | "community"
  | "campaign"
  | "affiliate-program"
  | "course";

export type BusinessAiMeta = {
  whyRecommendation: string;
  whyCollaborators: string;
  growthSuggestion: string;
  businessOpportunity: string;
  confidence: number;
};

export type BusinessNetworkInsight = {
  id: string;
  label: string;
  value: string;
  level: "high" | "medium" | "low";
  description: string;
};

export type BusinessNode = {
  id: string;
  kind: BusinessEntityKind;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string | null;
  badge?: string;
  relationshipStrength: number;
  aiMeta: BusinessAiMeta;
};

export type BusinessSection = {
  id: BusinessDiscoveryId | BusinessCollaborationId | BusinessRelationId;
  title: string;
  description?: string;
  nodes: BusinessNode[];
};

export type BusinessGraphPayload = {
  contextKind: BusinessContextKind;
  contextId: string;
  contextTitle: string;
  profileRelations: BusinessSection[];
  discoverySections: BusinessSection[];
  collaborationSections: BusinessSection[];
  networkInsights: BusinessNetworkInsight[];
  searchableNodes: BusinessNode[];
};
