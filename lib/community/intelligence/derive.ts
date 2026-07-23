/**
 * Derive intelligence from existing phase stores + overview — no duplicate fetches.
 */

import type { KnowledgeCard } from "@/lib/community/knowledge";
import type { CollaborationTask, CollaborationEvent } from "@/lib/community/os";
import type { CommunityStoreItem } from "@/lib/community/commerce";
import type { LiveKnowledgeCapture, LiveQaItem } from "@/lib/community/live-collab";
import type { Msg } from "@/types";
import type {
  AutomationSuggestion,
  DomainInsight,
  IntelligenceRecommendation,
  IntelligenceSnapshot,
  UnifiedInsight,
} from "./types";

export type IntelligenceInput = {
  communityId: string;
  base?: string;
  communityName?: string;
  memberCount?: number;
  spacesCount?: number;
  coursesCount?: number;
  liveNow?: number;
  healthScore?: number;
  totalXp?: number;
  messages?: Msg[];
  knowledgeCards?: KnowledgeCard[];
  tasks?: CollaborationTask[];
  events?: CollaborationEvent[];
  commerceItems?: CommunityStoreItem[];
  liveKnowledge?: LiveKnowledgeCapture | null;
  liveQa?: LiveQaItem[];
  featuredPosts?: { title: string | null; body: string }[];
  challenges?: { title: string }[];
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function deriveDomainInsights(input: IntelligenceInput): DomainInsight[] {
  const cards = input.knowledgeCards?.length ?? 0;
  const tasks = input.tasks?.length ?? 0;
  const openTasks =
    input.tasks?.filter((t) => t.status !== "completed").length ?? 0;
  const commerce = input.commerceItems?.length ?? 0;
  const msgs = input.messages?.length ?? 0;
  const qa = input.liveQa?.length ?? 0;
  const events = input.events?.length ?? 0;

  return [
    {
      domain: "community",
      headline: input.communityName
        ? `${input.communityName} pulse`
        : "Community pulse",
      bullets: [
        `${input.memberCount ?? 0} members · ${input.spacesCount ?? 0} groups`,
        msgs > 0
          ? `${msgs} indexed messages warm for intelligence`
          : "Open a channel to warm the message index",
        (input.healthScore ?? 0) > 0
          ? `Health score ${input.healthScore}`
          : "Health signals will appear as activity grows",
      ],
      health: clamp(input.healthScore ?? (msgs > 0 ? 55 : 35)),
    },
    {
      domain: "creator",
      headline: "Creator opportunities",
      bullets: [
        openTasks > 0
          ? `${openTasks} open collaboration tasks`
          : "Convert threads into tasks to track creator work",
        events > 0
          ? `${events} upcoming collab events`
          : "Schedule office hours or workshops",
        "Host a live session to mentor and sell in one workspace",
      ],
      health: clamp(40 + openTasks * 5 + events * 8),
    },
    {
      domain: "knowledge",
      headline: "Knowledge graph",
      bullets: [
        cards > 0
          ? `${cards} knowledge cards in this community`
          : "Capture FAQs from recurring questions",
        input.liveKnowledge?.summary
          ? "Live session summary ready to publish"
          : "Live knowledge captures appear after sessions",
        "Suggest guides and learning paths from solved threads",
      ],
      health: clamp(30 + cards * 8 + (input.liveKnowledge?.summary ? 15 : 0)),
    },
    {
      domain: "commerce",
      headline: "Commerce signals",
      bullets: [
        commerce > 0
          ? `${commerce} featured store offers`
          : "Feature products from chat or the community store",
        "Live shopping and affiliate offers reuse the commerce engine",
        "Recommend courses and tickets during peak engagement",
      ],
      health: clamp(25 + commerce * 12),
    },
    {
      domain: "live",
      headline: "Live intelligence",
      bullets: [
        (input.liveNow ?? 0) > 0
          ? `${input.liveNow} live now`
          : "No active live — schedule an AMA or workshop",
        qa > 0 ? `${qa} Q&A items to group and answer` : "Enable Q&A in Live Studio",
        "Session summaries feed Knowledge Intelligence",
      ],
      health: clamp(20 + (input.liveNow ?? 0) * 20 + qa * 5),
    },
    {
      domain: "discovery",
      headline: "Discovery",
      bullets: [
        "Surface trending knowledge, groups, and creators",
        `${input.coursesCount ?? 0} courses available to recommend`,
        (input.challenges?.length ?? 0) > 0
          ? `${input.challenges!.length} challenges to promote`
          : "Launch a challenge to boost discovery",
      ],
      health: clamp(35 + (input.coursesCount ?? 0) * 5),
    },
    {
      domain: "moderation",
      headline: "Trust & moderation",
      bullets: [
        "Reuse workspace permissions — never duplicate auth",
        "Flag spam patterns via channel AI when discussions heat up",
        "Promote verified answers into knowledge cards",
      ],
      health: clamp(50 + (input.healthScore ? 20 : 0)),
    },
    {
      domain: "learning",
      headline: "Learning paths",
      bullets: [
        input.coursesCount
          ? `Continue learning across ${input.coursesCount} courses`
          : "Publish a first course lesson",
        "Turn guides into learning paths automatically",
        "Link mentorship bookings to course progress",
      ],
      health: clamp(30 + (input.coursesCount ?? 0) * 10),
    },
  ];
}

export function deriveRecommendations(
  input: IntelligenceInput
): IntelligenceRecommendation[] {
  const base = input.base ?? "";
  const out: IntelligenceRecommendation[] = [];

  if ((input.spacesCount ?? 0) > 0) {
    out.push({
      id: uid("rec"),
      kind: "group",
      domain: "discovery",
      title: "Active groups",
      reason: "Members engage more in mini workspaces with channels + knowledge.",
      href: base ? `${base}?section=spaces` : null,
      score: 82,
      source: "overview",
    });
  }

  if ((input.coursesCount ?? 0) > 0 || (input.knowledgeCards?.length ?? 0) > 0) {
    out.push({
      id: uid("rec"),
      kind: "course",
      domain: "learning",
      title: "Continue learning",
      reason: "Courses and knowledge cards suggest members are ready for guided paths.",
      href: base ? `${base}/courses` : null,
      score: 78,
      source: "store",
    });
  }

  for (const item of (input.commerceItems ?? []).slice(0, 3)) {
    out.push({
      id: uid("rec"),
      kind: item.kind === "course" ? "course" : "product",
      domain: "commerce",
      title: item.title,
      reason: "Featured on the community shelf — strong commerce signal.",
      href: item.href ?? null,
      score: 70 + (item.featured ? 10 : 0),
      source: "store",
    });
  }

  for (const ev of (input.events ?? []).slice(0, 2)) {
    out.push({
      id: uid("rec"),
      kind: "event",
      domain: "community",
      title: ev.title,
      reason: "Upcoming collaboration event with RSVP ready.",
      href: base ? `${base}/events` : null,
      score: 74,
      source: "store",
    });
  }

  if ((input.liveNow ?? 0) > 0) {
    out.push({
      id: uid("rec"),
      kind: "live",
      domain: "live",
      title: "Join live now",
      reason: "Live sessions drive mentorship, selling, and knowledge capture.",
      href: base ? `${base}/live` : null,
      score: 95,
      source: "overview",
    });
  } else {
    out.push({
      id: uid("rec"),
      kind: "live",
      domain: "live",
      title: "Schedule a live workshop",
      reason: "No live right now — workshops and AMAs lift engagement.",
      href: base ? `${base}/live` : null,
      score: 60,
      source: "overview",
    });
  }

  for (const ch of (input.challenges ?? []).slice(0, 2)) {
    out.push({
      id: uid("rec"),
      kind: "challenge",
      domain: "discovery",
      title: ch.title,
      reason: "Challenges boost contribution and trust scores.",
      href: base ? `${base}/missions` : null,
      score: 68,
      source: "overview",
    });
  }

  out.push({
    id: uid("rec"),
    kind: "creator",
    domain: "creator",
    title: "Featured creators",
    reason: "Highlight mentors and sellers who contribute knowledge + commerce.",
    href: base ? `${base}/members` : null,
    score: 65,
    source: "overview",
  });

  out.push({
    id: uid("rec"),
    kind: "channel",
    domain: "community",
    title: "Warm discussion channels",
    reason: "Message index + AI can surface unanswered threads.",
    href: base ? `${base}/feed` : null,
    score: 72,
    source: "store",
  });

  out.push({
    id: uid("rec"),
    kind: "community",
    domain: "discovery",
    title: input.communityName ?? "This community",
    reason: "Stay inside one workspace — learn, collaborate, sell, launch.",
    href: base || null,
    score: 88,
    source: "overview",
  });

  return out.sort((a, b) => b.score - a.score);
}

export function deriveAutomations(
  input: IntelligenceInput
): AutomationSuggestion[] {
  const cards = input.knowledgeCards?.length ?? 0;
  const openTasks =
    input.tasks?.filter((t) => t.status !== "completed").length ?? 0;
  const msgs = input.messages?.length ?? 0;
  const unanswered = input.liveQa?.filter((q) => !q.answered).length ?? 0;

  const out: AutomationSuggestion[] = [];

  if (msgs >= 5 && cards < 3) {
    out.push({
      id: uid("auto"),
      kind: "faq",
      domain: "knowledge",
      title: "Generate FAQs from recent chat",
      detail: "Recurring questions detected — capture as FAQ knowledge cards.",
      priority: "high",
      actionable: true,
    });
  }

  if (cards > 0) {
    out.push({
      id: uid("auto"),
      kind: "guide",
      domain: "knowledge",
      title: "Compose a guide from top knowledge cards",
      detail: "Bundle featured cards into a member-facing guide.",
      priority: "medium",
      actionable: true,
    });
    out.push({
      id: uid("auto"),
      kind: "learning_path",
      domain: "learning",
      title: "Suggest a learning path",
      detail: "Order guides and courses into a progressive path.",
      priority: "medium",
      actionable: true,
    });
  } else {
    out.push({
      id: uid("auto"),
      kind: "knowledge_card",
      domain: "knowledge",
      title: "Create first knowledge card",
      detail: "Convert a pinned or helpful message into a knowledge card.",
      priority: "high",
      actionable: true,
    });
  }

  if (openTasks === 0 && msgs > 0) {
    out.push({
      id: uid("auto"),
      kind: "task",
      domain: "creator",
      title: "Suggest follow-up tasks",
      detail: "Turn open questions into Creator OS tasks.",
      priority: "medium",
      actionable: true,
    });
  }

  if ((input.events?.length ?? 0) === 0) {
    out.push({
      id: uid("auto"),
      kind: "event",
      domain: "community",
      title: "Propose a community event",
      detail: "Office hours or workshop based on active groups.",
      priority: "low",
      actionable: true,
    });
  }

  if ((input.coursesCount ?? 0) === 0) {
    out.push({
      id: uid("auto"),
      kind: "course",
      domain: "learning",
      title: "Outline a starter course",
      detail: "Use knowledge highlights as lesson seeds.",
      priority: "medium",
      actionable: true,
    });
  }

  if ((input.commerceItems?.length ?? 0) === 0) {
    out.push({
      id: uid("auto"),
      kind: "product",
      domain: "commerce",
      title: "Recommend a product or offer to feature",
      detail: "Attach commerce in chat or feature on the community store.",
      priority: "medium",
      actionable: true,
    });
  }

  if (unanswered > 0) {
    out.push({
      id: uid("auto"),
      kind: "community_improvement",
      domain: "live",
      title: "Group unanswered live Q&A",
      detail: `${unanswered} questions waiting — cluster and answer as knowledge.`,
      priority: "high",
      actionable: true,
    });
  }

  out.push({
    id: uid("auto"),
    kind: "community_improvement",
    domain: "moderation",
    title: "Improve channel clarity",
    detail: "Pin a welcome guide and route newcomers to the right group.",
    priority: "low",
    actionable: true,
  });

  return out;
}

export function deriveAnalytics(input: IntelligenceInput): UnifiedInsight[] {
  const cards = input.knowledgeCards?.length ?? 0;
  const commerce = input.commerceItems?.length ?? 0;
  const openTasks =
    input.tasks?.filter((t) => t.status !== "completed").length ?? 0;
  const completed =
    input.tasks?.filter((t) => t.status === "completed").length ?? 0;
  const msgs = input.messages?.length ?? 0;

  return [
    {
      metric: "growth",
      label: "Growth",
      value: input.memberCount ?? 0,
      unit: "members",
      trend: (input.memberCount ?? 0) > 10 ? "up" : "flat",
      note: "Member count from community overview",
    },
    {
      metric: "engagement",
      label: "Engagement",
      value: msgs,
      unit: "msgs indexed",
      trend: msgs > 20 ? "up" : "flat",
      note: "Reuses room message index — no extra fetch",
    },
    {
      metric: "knowledge",
      label: "Knowledge",
      value: cards,
      unit: "cards",
      trend: cards > 0 ? "up" : "flat",
      note: "From collaboration knowledge store",
    },
    {
      metric: "commerce",
      label: "Commerce",
      value: commerce,
      unit: "offers",
      trend: commerce > 0 ? "up" : "flat",
      note: "Featured community store items",
    },
    {
      metric: "learning",
      label: "Learning",
      value: input.coursesCount ?? 0,
      unit: "courses",
      trend: (input.coursesCount ?? 0) > 0 ? "up" : "flat",
      note: "Overview course inventory",
    },
    {
      metric: "contribution",
      label: "Contribution",
      value: completed + cards,
      unit: "pts proxy",
      trend: openTasks > completed ? "down" : "up",
      note: "Tasks completed + knowledge contributions",
    },
    {
      metric: "trust",
      label: "Trust",
      value: input.healthScore ?? clamp(40 + cards * 3),
      unit: "score",
      trend: (input.healthScore ?? 0) >= 60 ? "up" : "flat",
      note: "Community health / trust signal",
    },
  ];
}

export function buildIntelligenceSnapshot(
  input: IntelligenceInput
): IntelligenceSnapshot {
  return {
    communityId: input.communityId,
    generatedAt: new Date().toISOString(),
    domains: deriveDomainInsights(input),
    recommendations: deriveRecommendations(input),
    automations: deriveAutomations(input),
    analytics: deriveAnalytics(input),
  };
}

/** Compact context block for /api/c/ai prompts */
export function formatIntelligenceContext(snapshot: IntelligenceSnapshot): string {
  const topRecs = snapshot.recommendations
    .slice(0, 5)
    .map((r) => `- [${r.kind}] ${r.title}: ${r.reason}`)
    .join("\n");
  const autos = snapshot.automations
    .slice(0, 5)
    .map((a) => `- (${a.priority}) ${a.title}`)
    .join("\n");
  const metrics = snapshot.analytics
    .map((m) => `${m.label}=${m.value}${m.unit ? " " + m.unit : ""}`)
    .join(", ");
  return [
    "Intelligence snapshot:",
    `Metrics: ${metrics}`,
    topRecs ? `Recommendations:\n${topRecs}` : "",
    autos ? `Automations:\n${autos}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
