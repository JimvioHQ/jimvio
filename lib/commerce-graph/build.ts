import { GRAPH_NODE_META, GRAPH_SECTION_META } from "./config";
import type {
  CommerceGraphPayload,
  GraphAiMeta,
  GraphContextKind,
  GraphNode,
  GraphNodeKind,
  GraphPathStep,
  GraphSection,
  GraphSectionId,
} from "./types";

function pseudoScore(seed: string, min = 52, max = 97): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return min + (hash % (max - min + 1));
}

function aiMeta(seed: string, kind: GraphNodeKind, contextTitle: string): GraphAiMeta {
  const strength = pseudoScore(`${seed}-strength`, 48, 98);
  const confidence = Math.min(99, strength + pseudoScore(`${seed}-conf`, 0, 8));
  const similarity = pseudoScore(`${seed}-sim`, 55, 96);
  const meta = GRAPH_NODE_META[kind];
  return {
    whyRecommendation: `${meta.label} connects to "${contextTitle}" through shared creator commerce signals.`,
    relationshipStrength: strength,
    confidence,
    similarityPercent: similarity,
    explanation: `Placeholder graph edge — ${similarity}% similarity, ${strength}% relationship strength.`,
  };
}

export function graphNode(
  partial: Omit<GraphNode, "aiMeta"> & { aiMeta?: Partial<GraphAiMeta> },
  contextTitle: string,
): GraphNode {
  const base = aiMeta(partial.id, partial.kind, contextTitle);
  return {
    ...partial,
    aiMeta: { ...base, ...partial.aiMeta },
  };
}

export function graphSection(
  id: GraphSectionId,
  nodes: GraphNode[],
  overrides?: Partial<Pick<GraphSection, "title" | "description">>,
): GraphSection | null {
  if (!nodes.length) return null;
  const meta = GRAPH_SECTION_META[id];
  return {
    id,
    title: overrides?.title ?? meta.title,
    description: overrides?.description ?? meta.description,
    nodes,
  };
}

export function assembleCommerceGraph(input: {
  contextKind: GraphContextKind;
  contextId: string;
  contextTitle: string;
  path: GraphPathStep[];
  sectionBuilders: Array<() => GraphSection | null>;
  panelSectionIds?: GraphSectionId[];
}): CommerceGraphPayload {
  const sections = input.sectionBuilders
    .map((build) => build())
    .filter((s): s is GraphSection => !!s && s.nodes.length > 0);

  const panelIds = new Set(input.panelSectionIds ?? sections.slice(0, 4).map((s) => s.id));
  const panelSections = sections.filter((s) => panelIds.has(s.id));

  return {
    contextKind: input.contextKind,
    contextId: input.contextId,
    contextTitle: input.contextTitle,
    path: input.path,
    sections,
    panelSections,
  };
}
