import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { parseGeminiProviderFailure } from "@/lib/ai/gemini-model";
import { wrapUntrusted } from "@/lib/ai/information-policy";
import { completeText, openaiAttemptModels, readOpenAIKey, type ModelTurn } from "@/lib/ai/openai-runtime";
import { rateLimit } from "@/lib/ops/rate-limit";
import { toPublicCampaignListItem } from "@/lib/ugc/public-campaign-list";
import { attachPublicFunding } from "@/lib/ugc/public-campaign-funding";
import {
  assistantSystemPrompt,
  cleanHistory,
  cleanMessage,
  fallbackAnswer,
  liveCampaignsBlock,
  parseAssistantJson,
  sanitizeDraft,
  wantsCampaignDraft,
  type AssistantCampaign,
  type CampaignDraft,
} from "@/lib/ugc/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "anon";
}

/** Live, funded campaigns: the same public data the Discover board shows. */
async function liveCampaigns(): Promise<AssistantCampaign[]> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("ugc_campaigns")
    .select("*, vendor:vendors!brand_id (business_name, business_logo, business_slug, business_country, verification_status, verified_at)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);
  const mapped = (data ?? []).map((row) => toPublicCampaignListItem(row as Record<string, unknown>)) as Record<string, unknown>[];
  const rows = await attachPublicFunding(db, mapped).catch(() => mapped);
  return rows
    .filter((r) => (r as { funding?: { state?: string } }).funding?.state === "funded")
    .map((r) => {
      const row = r as Record<string, unknown> & {
        vendor?: { business_name?: string | null; business_logo?: string | null } | null;
        funding?: { remainingUsd?: number } | null;
      };
      const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
      return {
        id: String(row.id),
        title: String(row.title ?? ""),
        brand: row.vendor?.business_name ?? null,
        imageUrl: (() => {
          const media = Array.isArray(row.media) ? row.media as Array<Record<string, unknown>> : [];
          const banner = media.find((item) => item.usage === "banner" && typeof item.url === "string");
          const image = banner?.url ?? row.banner_url ?? row.cover_image_url ?? row.thumbnail_url ?? row.image_url ?? row.vendor?.business_logo;
          return typeof image === "string" && /^https:\/\//i.test(image) ? image : null;
        })(),
        description: typeof row.description === "string" ? row.description.slice(0, 1400) : "",
        requiredHashtags: Array.isArray(row.required_hashtags) ? row.required_hashtags.map(String).slice(0, 12) : [],
        requiredMentions: Array.isArray(row.required_mentions) ? row.required_mentions.map(String).slice(0, 12) : [],
        minDuration: row.min_duration == null ? null : Number(row.min_duration),
        maxDuration: row.max_duration == null ? null : Number(row.max_duration),
        requiresFace: row.requires_face === true,
        joinConfig: row.join_config && typeof row.join_config === "object" ? row.join_config : null,
        type: String(row.campaign_type ?? "ugc"),
        paymentModel: String(row.payment_model ?? "per_views"),
        ratePer1k: n(row.rate_per_1k_views),
        fixedRate: n(row.fixed_rate),
        platforms: Array.isArray(row.allowed_platforms) ? (row.allowed_platforms as string[]) : [],
        remainingUsd: row.funding?.remainingUsd ?? null,
        totalUsd: n(row.total_budget),
        endsAt: (row.ends_at as string | null) ?? null,
        joinMode: (row.join_mode as string | null) ?? null,
      };
    });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`ugc-assistant:${clientIp(req)}`, 15, 60_000);
  if (!limited.allowed) return NextResponse.json({ ok: false, error: "rate_limit", retryAfterSeconds: 30 }, { status: 429 });

  let body: { message?: unknown; history?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const message = cleanMessage(String(body.message ?? ""));
  if (!message) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  if (isConfidentialAiRequest(message)) {
    return NextResponse.json({ ok: true, reply: CONFIDENTIAL_AI_REFUSAL, campaigns: [], draft: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const history = cleanHistory(body.history);

  // Restrict model context to non-sensitive matching attributes from this signed-in creator.
  let creatorContext = "CREATOR PROFILE: not available.";
  if (user) {
    try {
      const { data: creator } = await createServiceRoleClient()
        .from("influencers")
        .select("niche,total_followers,is_verified")
        .eq("user_id", user.id)
        .maybeSingle();
      if (creator) {
        const niches = Array.isArray(creator.niche)
          ? creator.niche.map((value) => String(value).slice(0, 48)).slice(0, 12)
          : [];
        creatorContext = [
          "CREATOR PROFILE (authenticated user's own account; cautious matching only):",
          `niches=${niches.join(", ") || "not provided"}`,
          `followers=${Number.isFinite(Number(creator.total_followers)) ? Number(creator.total_followers) : "unknown"}`,
          `verified=${creator.is_verified === true ? "yes" : creator.is_verified === false ? "no" : "unknown"}`,
          "Country, account age and connected social account ownership are not provided. Never infer them.",
        ].join("\\n");
      }
    } catch (error) {
      console.warn("[ugc-assistant] creator context unavailable", error instanceof Error ? error.name : "unknown");
    }
  }

  let list: AssistantCampaign[] = [];
  try {
    list = await liveCampaigns();
  } catch (e) {
    console.error("[ugc-assistant] campaigns failed:", e);
  }
  const byId = new Map(list.map((c) => [c.id, c]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((c): c is AssistantCampaign => Boolean(c));

  const apiKey = readOpenAIKey();
  const model = openaiAttemptModels()[0];
  if (apiKey && model) {
    try {
      const input: ModelTurn[] = [
        { role: "system", content: wrapUntrusted("Creator profile context", creatorContext, 1200) },
        { role: "system", content: liveCampaignsBlock(list) },
        ...history.map((t) => ({ role: t.role, content: t.role === "user" ? wrapUntrusted("Person", t.content, 1200) : t.content })),
        { role: "user", content: wrapUntrusted("Person", message, 800) },
      ];
      const text = await completeText({
        apiKey,
        model,
        instructions: assistantSystemPrompt(Boolean(user)),
        input,
        temperature: 0.4,
        maxOutputTokens: wantsCampaignDraft(message) || history.length ? 900 : 450,
        timeoutMs: 20_000,
        format: "json_object",
      });
      const parsed = parseAssistantJson(text);
      if (parsed) {
        const draft: CampaignDraft | null = sanitizeDraft(parsed.draft);
        return NextResponse.json({ ok: true, reply: parsed.reply, campaigns: pick(parsed.campaignIds), draft, signedIn: Boolean(user) });
      }
    } catch (error) {
      const failure = parseGeminiProviderFailure(error);
      console.warn("[ugc-assistant] provider failed", { category: failure.category, quotaScope: failure.quotaScope });
    }
  }

  const fb = fallbackAnswer(message, list);
  return NextResponse.json({ ok: true, reply: fb.reply, campaigns: pick(fb.campaignIds), draft: null, signedIn: Boolean(user), limited: true });
}
