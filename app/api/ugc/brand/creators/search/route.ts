import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

type CreatorCardRow = {
  influencerId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  country: string | null;
  language: string | null;
  totalFollowers: number;
  engagementRate: number;
  avgViews: number | null;
  approvalRate: number | null;
  niche: string[];
  platforms: string[];
  totalCampaigns: number;
  pastCampaignTitles: string[];
};

function parseBool(v: string | null | undefined): boolean | null {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const country = (sp.get("country") ?? "").trim();
  const language = (sp.get("language") ?? "").trim();
  const platform = (sp.get("platform") ?? "").trim().toLowerCase();
  const verified = parseBool(sp.get("verified"));
  const minFollowers = sp.get("minFollowers") ? Number(sp.get("minFollowers")) : null;
  const maxFollowers = sp.get("maxFollowers") ? Number(sp.get("maxFollowers")) : null;
  const minEngagement = sp.get("minEngagement") ? Number(sp.get("minEngagement")) : null;
  const niche = (sp.get("niche") ?? "").trim().toLowerCase();
  const minCompletedCampaigns = sp.get("minCompletedCampaigns")
    ? Number(sp.get("minCompletedCampaigns"))
    : null;

  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });

  const db = ws.db;

  const pattern = q ? `%${q.replace(/%/g, "\\%")}%` : "%";

  const { data: influencers } = await db
    .from("influencers")
    .select(
      "id, user_id, display_name, profile_image, total_followers, engagement_rate, is_verified, social_platforms, niche, total_campaigns",
    )
    .eq("is_active", true)
    .ilike("display_name", pattern)
    .order("total_followers", { ascending: false })
    .limit(80);

  const infList = influencers ?? [];
  if (infList.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const userIds = infList.map((i) => String(i.user_id));
  const { data: profiles } = await db
    .from("profiles")
    .select("id, country, language")
    .in("id", userIds);

  const profileById = new Map<string, { country: string | null; language: string | null }>();
  for (const p of profiles ?? []) {
    profileById.set(String(p.id), { country: p.country ?? null, language: p.language ?? null });
  }

  const filtered = infList.filter((inf) => {
    const pid = String(inf.user_id);
    const prof = profileById.get(pid);

    const c = prof?.country ?? null;
    const l = prof?.language ?? null;
    if (country && c?.toLowerCase() !== country.toLowerCase()) return false;
    if (language && l?.toLowerCase() !== language.toLowerCase()) return false;

    if (verified != null) {
      if (Boolean(inf.is_verified) !== verified) return false;
    }

    const followers = Number(inf.total_followers ?? 0);
    if (minFollowers != null && followers < minFollowers) return false;
    if (maxFollowers != null && followers > maxFollowers) return false;

    const engagement = Number(inf.engagement_rate ?? 0);
    if (minEngagement != null && engagement < minEngagement) return false;

    const platforms = (() => {
      const raw = inf.social_platforms as any;
      if (!raw) return [];
      if (typeof raw === "object") return Object.keys(raw);
      return [];
    })();
    if (platform) {
      const p = platform.toLowerCase();
      if (!platforms.some((x) => String(x).toLowerCase() === p)) return false;
    }

    const nicheArr = Array.isArray(inf.niche) ? (inf.niche as string[]) : [];
    if (niche) {
      if (!nicheArr.some((n) => String(n).toLowerCase() === niche)) return false;
    }

    const totalCampaigns = Number(inf.total_campaigns ?? 0);
    if (minCompletedCampaigns != null && totalCampaigns < minCompletedCampaigns) return false;

    return true;
  });

  const influencerIds = filtered.map((i) => String(i.id));
  if (influencerIds.length === 0) return NextResponse.json({ data: [] });

  // Avg views from latest short videos (lightweight approximation).
  const { data: shortVideos } = await db
    .from("short_videos")
    .select("creator_id, view_count, created_at")
    .in("creator_id", influencerIds)
    .order("created_at", { ascending: false })
    .limit(500);

  const viewsByCreator = new Map<string, { sum: number; count: number }>();
  for (const v of shortVideos ?? []) {
    const cid = String(v.creator_id);
    const bucket = viewsByCreator.get(cid) ?? { sum: 0, count: 0 };
    bucket.sum += Number(v.view_count ?? 0);
    bucket.count += 1;
    viewsByCreator.set(cid, bucket);
  }

  // Approval rate from participant history (accepted vs rejected).
  const { data: participantAgg } = await db
    .from("ugc_campaign_participants")
    .select("influencer_id, status")
    .in("influencer_id", influencerIds);

  const approvalByInfluencer = new Map<string, { accepted: number; rejected: number }>();
  for (const p of participantAgg ?? []) {
    const iid = String(p.influencer_id);
    const bucket = approvalByInfluencer.get(iid) ?? { accepted: 0, rejected: 0 };
    if (p.status === "accepted") bucket.accepted += 1;
    if (p.status === "rejected") bucket.rejected += 1;
    approvalByInfluencer.set(iid, bucket);
  }

  // Past campaign titles (accepted only, last few).
  const { data: past } = await db
    .from("ugc_campaign_participants")
    .select("influencer_id, campaign:ugc_campaigns!campaign_id(title, status)")
    .in("influencer_id", influencerIds)
    .eq("status", "accepted")
    .order("joined_at", { ascending: false })
    .limit(200);

  const pastTitlesByInfluencer = new Map<string, string[]>();
  for (const row of past ?? []) {
    const iid = String(row.influencer_id);
    const list = pastTitlesByInfluencer.get(iid) ?? [];
    const title = (row as any)?.campaign?.title ?? null;
    if (!title) continue;
    if (!list.includes(title) && list.length < 4) list.push(title);
    pastTitlesByInfluencer.set(iid, list);
  }

  const data: CreatorCardRow[] = filtered.slice(0, 30).map((inf) => {
    const iid = String(inf.id);
    const prof = profileById.get(String(inf.user_id));
    const totalFollowers = Number(inf.total_followers ?? 0);
    const engagementRate = Number(inf.engagement_rate ?? 0);

    const platforms = (() => {
      const raw = inf.social_platforms as any;
      if (!raw) return [];
      if (typeof raw === "object") return Object.keys(raw);
      return [];
    })().map(String);

    const avgViewsBucket = viewsByCreator.get(iid);
    const avgViews = avgViewsBucket && avgViewsBucket.count > 0 ? Math.round(avgViewsBucket.sum / avgViewsBucket.count) : null;

    const approvalBucket = approvalByInfluencer.get(iid) ?? { accepted: 0, rejected: 0 };
    const approvalRate =
      approvalBucket.accepted + approvalBucket.rejected > 0
        ? Math.round((approvalBucket.accepted / (approvalBucket.accepted + approvalBucket.rejected)) * 100)
        : null;

    return {
      influencerId: iid,
      userId: String(inf.user_id),
      displayName: inf.display_name ?? "Creator",
      avatarUrl: inf.profile_image ?? null,
      isVerified: Boolean(inf.is_verified),
      country: prof?.country ?? null,
      language: prof?.language ?? null,
      totalFollowers,
      engagementRate,
      avgViews,
      approvalRate,
      niche: Array.isArray(inf.niche) ? (inf.niche as string[]) : [],
      platforms,
      totalCampaigns: Number(inf.total_campaigns ?? 0),
      pastCampaignTitles: pastTitlesByInfluencer.get(iid) ?? [],
    };
  });

  return NextResponse.json({ data });
}

