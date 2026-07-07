export type GraphNodeKind =
  | "product"
  | "creator"
  | "community"
  | "course"
  | "campaign"
  | "bundle"
  | "collection"
  | "live-event"
  | "affiliate";

export type GraphContextKind = "product" | "creator" | "community";

export type GraphSectionId =
  | "related-creators"
  | "related-products"
  | "people-also-bought"
  | "creators-promoting"
  | "ugc-using"
  | "communities-discussing"
  | "courses-teaching"
  | "upcoming-events"
  | "affiliate-opportunities"
  | "bundles"
  | "collections"
  | "creator-products"
  | "creator-communities"
  | "creator-campaigns"
  | "creator-courses"
  | "community-creators"
  | "community-products"
  | "community-courses"
  | "community-events";

export type GraphAiMeta = {
  whyRecommendation: string;
  relationshipStrength: number;
  confidence: number;
  similarityPercent: number;
  explanation: string;
};

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string | null;
  badge?: string;
  aiMeta: GraphAiMeta;
};

export type GraphSection = {
  id: GraphSectionId;
  title: string;
  description?: string;
  nodes: GraphNode[];
};

export type GraphPathStep = {
  id: string;
  kind: GraphNodeKind;
  label: string;
  href: string;
};

export type CommerceGraphPayload = {
  contextKind: GraphContextKind;
  contextId: string;
  contextTitle: string;
  path: GraphPathStep[];
  sections: GraphSection[];
  panelSections: GraphSection[];
};
