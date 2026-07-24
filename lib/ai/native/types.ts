/**
 * Jimvio AI Native Platform — pluggable provider contracts.
 * Swap local stubs for OpenAI / Gemini / Claude / Llama without UI changes.
 */

export type AiProviderId =
  | "local"
  | "openai"
  | "gemini"
  | "claude"
  | "llama"
  | "deepseek";

export type AiContentKind =
  | "post"
  | "article"
  | "product_description"
  | "campaign_brief"
  | "course_outline"
  | "community_rules"
  | "welcome_message"
  | "email_campaign"
  | "affiliate_promo"
  | "social_caption"
  | "announcement"
  | "reply"
  | "marketing_copy";

export type AiContentDraft = {
  id: string;
  kind: AiContentKind;
  title: string;
  body: string;
  tone: string;
};

export type AiAnalyticsInsight = {
  id: string;
  topic: "revenue" | "engagement" | "growth" | "risk" | "forecast" | "recommendation";
  title: string;
  explanation: string;
  href?: string;
};

export type AiModerationSignal = {
  id: string;
  kind: "spam" | "abuse" | "scam" | "duplicate" | "toxicity" | "unsafe_link";
  severity: "low" | "medium" | "high";
  sample: string;
  recommendation: string;
};

export type AiKnowledgeHit = {
  id: string;
  source:
    | "community"
    | "marketplace"
    | "product"
    | "course"
    | "campaign"
    | "event"
    | "creator"
    | "help"
    | "knowledge";
  title: string;
  snippet: string;
  href: string;
  score: number;
};

export type AiAutomationTrigger =
  | "member_joins"
  | "product_sells"
  | "engagement_drops"
  | "campaign_finishes";

export type AiAutomationFlow = {
  id: string;
  name: string;
  trigger: AiAutomationTrigger;
  steps: string[];
  enabled: boolean;
};

export type AiPersonalizationItem = {
  id: string;
  kind: "creator" | "community" | "product" | "event" | "course" | "campaign";
  title: string;
  reason: string;
  href: string;
  score: number;
};

export type AiNativeContext = {
  base?: string;
  communityId?: string;
  communityName?: string;
  pathname?: string;
  overview?: {
    totalEarned?: number | null;
    memberCount?: number | null;
    membersJoinedThisWeek?: number | null;
    messagesThisWeek?: number | null;
    healthScore?: { score: number; label?: string; summary?: string } | null;
    courseCount?: number | null;
    liveNow?: number | null;
    featuredPosts?: Array<{ title: string | null; body: string; href: string }> | null;
    courses?: Array<{ id: string; title: string; href: string }> | null;
    upcomingEvents?: Array<{ id: string; title: string; href?: string }> | null;
    topContributors?: Array<{ id: string; name: string; points: number }> | null;
  } | null;
};

export interface AiContentProvider {
  readonly id: AiProviderId;
  generate(kind: AiContentKind, context: AiNativeContext): Promise<AiContentDraft> | AiContentDraft;
}

export interface AiAnalyticsProvider {
  readonly id: AiProviderId;
  explain(context: AiNativeContext): Promise<AiAnalyticsInsight[]> | AiAnalyticsInsight[];
}

export interface AiModerationProvider {
  readonly id: AiProviderId;
  scan(context: AiNativeContext): Promise<AiModerationSignal[]> | AiModerationSignal[];
}

export interface AiKnowledgeProvider {
  readonly id: AiProviderId;
  search(
    query: string,
    context: AiNativeContext
  ): Promise<AiKnowledgeHit[]> | AiKnowledgeHit[];
}

export interface AiPersonalizationProvider {
  readonly id: AiProviderId;
  personalize(context: AiNativeContext): Promise<AiPersonalizationItem[]> | AiPersonalizationItem[];
}

export type NlCommandIntent = {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  actionId?: string;
  score: number;
  keywords: string[];
};
