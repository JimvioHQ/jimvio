import { BUSINESS_ENTITY_META } from "./config";
import type {
  BusinessAiMeta,
  BusinessEntityKind,
  BusinessGraphPayload,
  BusinessNetworkInsight,
  BusinessNode,
  BusinessSection,
} from "./types";

function pseudoScore(seed: string, min = 48, max = 97): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return min + (hash % (max - min + 1));
}

function aiMeta(seed: string, kind: BusinessEntityKind, contextTitle: string): BusinessAiMeta {
  const confidence = pseudoScore(`${seed}-conf`, 68, 96);
  const meta = BUSINESS_ENTITY_META[kind];
  return {
    whyRecommendation: `${meta.label} fits commercial signals around "${contextTitle}".`,
    whyCollaborators: `Shared audience and category overlap with ${contextTitle}.`,
    growthSuggestion: "Expand through co-marketing and bundled offers.",
    businessOpportunity: "Partnership-ready · placeholder scoring",
    confidence,
  };
}

export function businessNode(
  partial: Omit<BusinessNode, "relationshipStrength" | "aiMeta"> & {
    relationshipStrength?: number;
    aiMeta?: Partial<BusinessAiMeta>;
  },
  contextTitle: string,
): BusinessNode {
  const strength = partial.relationshipStrength ?? pseudoScore(partial.id);
  const base = aiMeta(partial.id, partial.kind, contextTitle);
  return {
    ...partial,
    relationshipStrength: strength,
    aiMeta: { ...base, ...partial.aiMeta },
  };
}

export function businessSection(
  id: BusinessSection["id"],
  title: string,
  nodes: BusinessNode[],
  description?: string,
): BusinessSection | null {
  if (!nodes.length) return null;
  return { id, title, description, nodes };
}

export function buildNetworkInsights(contextTitle: string, seed: string): BusinessNetworkInsight[] {
  const s = (suffix: string, min = 52, max = 96) => pseudoScore(`${seed}-${suffix}`, min, max);
  const level = (v: number) => (v >= 75 ? "high" : v >= 50 ? "medium" : "low") as BusinessNetworkInsight["level"];

  return [
    {
      id: "relationship-strength",
      label: "Relationship Strength",
      value: `${s("rs")}%`,
      level: level(s("rs")),
      description: `Connection density around ${contextTitle}`,
    },
    {
      id: "mutual-connections",
      label: "Mutual Connections",
      value: String(s("mc", 3, 48)),
      level: level(s("mc", 3, 48) * 2),
      description: "Shared business graph nodes",
    },
    {
      id: "business-score",
      label: "Business Score",
      value: `${s("bs", 60, 94)}/100`,
      level: level(s("bs")),
      description: "Composite commercial fit",
    },
    {
      id: "growth-potential",
      label: "Growth Potential",
      value: s("gp", 55, 92) >= 75 ? "Rising" : "Stable",
      level: level(s("gp")),
      description: "Projected partnership upside",
    },
    {
      id: "trust-score",
      label: "Trust Score",
      value: `${s("ts", 58, 99)}%`,
      level: level(s("ts")),
      description: "Platform trust signals",
    },
    {
      id: "reputation",
      label: "Reputation",
      value: s("rep", 60, 98) >= 80 ? "Excellent" : "Good",
      level: level(s("rep")),
      description: "Reviews and fulfillment history",
    },
  ];
}

export function assembleBusinessGraph(input: {
  contextKind: BusinessGraphPayload["contextKind"];
  contextId: string;
  contextTitle: string;
  profileBuilders: Array<() => BusinessSection | null>;
  discoveryBuilders: Array<() => BusinessSection | null>;
  collaborationBuilders: Array<() => BusinessSection | null>;
  extraNodes?: BusinessNode[];
}): BusinessGraphPayload {
  const profileRelations = input.profileBuilders.map((b) => b()).filter((s): s is BusinessSection => !!s);
  const discoverySections = input.discoveryBuilders.map((b) => b()).filter((s): s is BusinessSection => !!s);
  const collaborationSections = input.collaborationBuilders.map((b) => b()).filter((s): s is BusinessSection => !!s);

  const searchableNodes = [
    ...profileRelations.flatMap((s) => s.nodes),
    ...discoverySections.flatMap((s) => s.nodes),
    ...collaborationSections.flatMap((s) => s.nodes),
    ...(input.extraNodes ?? []),
  ];

  const deduped = Array.from(new Map(searchableNodes.map((n) => [n.id, n])).values());

  return {
    contextKind: input.contextKind,
    contextId: input.contextId,
    contextTitle: input.contextTitle,
    profileRelations,
    discoverySections,
    collaborationSections,
    networkInsights: buildNetworkInsights(input.contextTitle, input.contextId),
    searchableNodes: deduped,
  };
}
