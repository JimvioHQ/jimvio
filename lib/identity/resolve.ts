/**
 * Identity resolution — builds the unified, camelCase `IdentityProfilePayload`
 * consumed directly by `components/identity/*` and the `/u/[username]`,
 * `/identity/edit`, `/identity/bookings` pages. Merges `profiles` (single
 * source of truth for core fields) with `jip_*` extension tables, gated by
 * privacy rules. Use these helpers from server components/API routes rather
 * than querying jip_* tables ad-hoc, so privacy + shape stay consistent
 * everywhere.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveProfileFollowerCount } from "@/lib/community/follower-count";
import { levelProgress as computeLevelProgress } from "./levels";
import { canViewFullDetails, canViewIdentity, privacyFieldVisible } from "./privacy";
import { computeCreatorStats } from "./stats";
import type {
  AIInsights,
  Badge,
  Booking,
  CreatorStats,
  IdentityAiInsights,
  IdentityBadge,
  IdentityCreatorStatsSnapshot,
  IdentityLevelProgress,
  IdentityMilestone,
  IdentityPortfolioItem,
  IdentityProfileCore,
  IdentityProfilePayload,
  IdentityResumeEntry,
  IdentityReview,
  IdentitySocialAccount,
  IdentityTestimonial,
  JipIdentityRow,
  JipReviewRow,
  Milestone,
  PortfolioItem,
  ProfileCore,
  ResumeEntry,
  SocialAccount,
  Testimonial,
  UserBadge,
} from "./types";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

const DEFAULT_JIP_IDENTITY: Omit<JipIdentityRow, "user_id" | "created_at" | "updated_at"> = {
  cover_image: null,
  headline: null,
  creator_level: "bronze",
  trust_score: 50,
  ai_score: 50,
  reputation_score: 50,
  overall_rank: null,
  languages: [],
  skills: [],
  specialties: [],
  equipment: [],
  industries: [],
  availability: "open",
  availability_note: null,
  contact_preferences: { email: true, in_app: true, booking: true },
  privacy_visibility: "public",
  privacy_custom: {},
  media_kit_url: null,
  xp: 0,
  identity_verified: false,
  documents_verified: false,
  social_verified: false,
  admin_notes: null,
  response_time_hours: null,
  avg_rating: 0,
  review_count: 0,
};

/** Idempotently ensure a `jip_identity` row exists for a user. Safe to call anytime. */
export async function ensureJipIdentity(userId: string): Promise<JipIdentityRow> {
  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("jip_identity")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as JipIdentityRow;

  const { data: inserted, error } = await db
    .from("jip_identity")
    .upsert(
      { user_id: userId, ...DEFAULT_JIP_IDENTITY, created_at: now, updated_at: now },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !inserted) {
    // Race with the DB trigger that auto-creates the row — read it back.
    const { data: fallback } = await db
      .from("jip_identity")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (fallback) return fallback as JipIdentityRow;
    throw new Error(error?.message ?? "Failed to ensure jip_identity row");
  }

  return inserted as JipIdentityRow;
}

/** Resolve the current viewer from cookies when no explicit viewerId is given. */
async function resolveViewerId(explicit?: string | null): Promise<string | null> {
  if (explicit !== undefined) return explicit;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function resolveViewerFlags(
  db: ServiceClient,
  viewerId: string | null,
  targetUserId: string
): Promise<{ isAdmin: boolean; isBrand: boolean; isFollower: boolean }> {
  if (!viewerId) return { isAdmin: false, isBrand: false, isFollower: false };

  const [{ data: roleRow }, { data: vendorRow }, followResult] = await Promise.all([
    db
      .from("user_roles")
      .select("id")
      .eq("user_id", viewerId)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle(),
    db.from("vendors").select("id").eq("user_id", viewerId).maybeSingle(),
    Promise.resolve(
      db.from("user_follows").select("id").eq("follower_id", viewerId).eq("following_id", targetUserId).maybeSingle(),
    ).catch(() => ({ data: null })),
  ]);

  return {
    isAdmin: Boolean(roleRow),
    isBrand: Boolean(vendorRow),
    isFollower: Boolean((followResult as { data: unknown } | null)?.data),
  };
}

function titleCase(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

export function toLevelProgress(xp: number): IdentityLevelProgress {
  const p = computeLevelProgress(xp);
  return {
    level: p.level,
    levelLabel: titleCase(p.level),
    xp: p.xp,
    xpIntoLevel: p.xp - p.levelStartXp,
    xpForNextLevel: p.nextLevelXp,
    progressPct: p.progressPercent,
  };
}

export function toSocialAccount(row: SocialAccount): IdentitySocialAccount {
  return {
    id: row.id,
    platform: row.platform,
    handle: row.handle,
    url: row.url,
    followers: Number(row.followers ?? 0),
    avgViews: Number(row.avg_views ?? 0),
    engagementRate: Number(row.engagement_rate ?? 0),
    isVerified: Boolean(row.is_verified),
  };
}

export function toPortfolioItem(row: PortfolioItem): IdentityPortfolioItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    externalUrl: row.external_url,
    brandName: row.brand_name,
    sortOrder: Number(row.sort_order ?? 0),
    isFeatured: Boolean(row.is_featured),
    isPublic: Boolean(row.is_public),
  };
}

function toTestimonial(row: Testimonial): IdentityTestimonial {
  return {
    id: row.id,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorCompany: row.author_company,
    quote: row.quote,
    rating: row.rating != null ? Number(row.rating) : null,
  };
}

export function toResumeEntry(row: ResumeEntry): IdentityResumeEntry {
  return {
    id: row.id,
    entryType: row.entry_type,
    title: row.title,
    organization: row.organization,
    description: row.description,
    startedOn: row.started_on,
    endedOn: row.ended_on,
    isCurrent: Boolean(row.is_current),
  };
}

function toBadge(badge: Badge): IdentityBadge {
  return { id: badge.id, name: badge.name, description: badge.description, icon: badge.icon };
}

function toMilestone(row: Milestone): IdentityMilestone {
  return { id: row.id, title: row.title, description: row.description, achievedAt: row.achieved_at };
}

/** camelCase mirror of `CreatorStats` for direct UI consumption. */
export function toStatsSnapshot(stats: CreatorStats): IdentityCreatorStatsSnapshot {
  return {
    ugc: { ...stats.ugc },
    affiliate: { ...stats.affiliate },
    marketplace: { ...stats.marketplace },
    social: { ...stats.social },
    community: { ...stats.community },
    computedAt: stats.computedAt,
  };
}

interface ReviewerProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function toIdentityReview(row: JipReviewRow, reviewer: ReviewerProfileRow | null): IdentityReview {
  return {
    id: row.id,
    direction: row.direction,
    rating: Number(row.rating ?? 0),
    title: row.title,
    body: row.body,
    isVerified: Boolean(row.is_verified),
    verificationSource: row.verification_source,
    createdAt: row.created_at,
    reviewer: reviewer
      ? {
          userId: reviewer.id,
          fullName: reviewer.full_name,
          username: reviewer.username,
          avatarUrl: reviewer.avatar_url,
        }
      : null,
  };
}

async function loadPublicReviews(db: ServiceClient, subjectUserId: string): Promise<IdentityReview[]> {
  try {
    const { data: reviews } = await db
      .from("jip_reviews")
      .select("*")
      .eq("subject_user_id", subjectUserId)
      .eq("is_public", true)
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = (reviews ?? []) as JipReviewRow[];
    if (!rows.length) return [];

    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_user_id)));
    const { data: reviewers } = await db
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", reviewerIds);

    const byId = new Map((reviewers ?? []).map((p: ReviewerProfileRow) => [p.id, p]));
    return rows.map((row) => toIdentityReview(row, byId.get(row.reviewer_user_id) ?? null));
  } catch (err) {
    console.error("resolve: loadPublicReviews failed", err);
    return [];
  }
}

async function countJimvioFollowers(
  db: ServiceClient,
  userId: string,
  username?: string | null
): Promise<number> {
  let real = 0;
  try {
    const { count } = await db
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId);
    real = count ?? 0;
  } catch (err) {
    console.error("resolve: countJimvioFollowers failed", err);
    real = 0;
  }
  return resolveProfileFollowerCount({
    username,
    follower_count: real,
  });
}

async function countJimvioFollowing(db: ServiceClient, userId: string): Promise<number> {
  try {
    const { count } = await db
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId);
    return count ?? 0;
  } catch (err) {
    console.error("resolve: countJimvioFollowing failed", err);
    return 0;
  }
}

function toAiInsights(row: AIInsights | null): IdentityAiInsights | null {
  if (!row) return null;
  return {
    summary: row.summary,
    strengths: row.strengths ?? [],
    weaknesses: row.weaknesses ?? [],
    opportunities: row.opportunities ?? [],
    recommendedCampaigns: row.recommended_campaigns ?? [],
    recommendedProducts: row.recommended_products ?? [],
    revenueOpportunities: row.revenue_opportunities ?? [],
    growthRoadmap: row.growth_roadmap ?? [],
  };
}

const PROFILE_CORE_SELECT =
  "id, email, username, full_name, avatar_url, bio, website, phone, city, country, language, is_verified, created_at";

async function buildProfilePayload(
  db: ServiceClient,
  profile: ProfileCore,
  identity: JipIdentityRow,
  viewerId: string | null
): Promise<IdentityProfilePayload> {
  const flags = await resolveViewerFlags(db, viewerId, profile.id);
  const isSelf = Boolean(viewerId) && viewerId === profile.id;

  const viewable = {
    user_id: profile.id,
    privacy_visibility: identity.privacy_visibility,
    privacy_custom: identity.privacy_custom,
  };
  const canView = isSelf || flags.isAdmin || canViewIdentity(viewerId, viewable, flags);
  const canFull = isSelf || flags.isAdmin || canViewFullDetails(viewerId, viewable, flags);

  const contactPreferences = {
    email: identity.contact_preferences?.email !== false,
    in_app: identity.contact_preferences?.in_app !== false,
    booking: identity.contact_preferences?.booking !== false,
  };

  const avatarUrl = profile.avatar_url;

  const profileCore: IdentityProfileCore = {
    userId: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    avatarUrl,
    bio: profile.bio,
    website: profile.website,
    city: profile.city,
    country: profile.country,
    language: profile.language,
    isVerified: Boolean(profile.is_verified),
    joinedAt: profile.created_at ?? null,
    headline: identity.headline,
    coverImage: identity.cover_image,
    availability: identity.availability,
    availabilityNote: identity.availability_note,
    languages: identity.languages ?? [],
    skills: identity.skills ?? [],
    specialties: identity.specialties ?? [],
    equipment: identity.equipment ?? [],
    industries: identity.industries ?? [],
    contactPreferences,
    privacyVisibility: identity.privacy_visibility,
    privacyCustom:
      identity.privacy_custom && typeof identity.privacy_custom === "object"
        ? (identity.privacy_custom as Record<string, unknown>)
        : {},
    mediaKitUrl: identity.media_kit_url,
    creatorLevel: identity.creator_level,
    trustScore: Number(identity.trust_score ?? 50),
    aiScore: Number(identity.ai_score ?? 50),
    reputationScore: Number(identity.reputation_score ?? 50),
    overallRank: identity.overall_rank,
    identityVerified: Boolean(identity.identity_verified),
    documentsVerified: Boolean(identity.documents_verified),
    socialVerified: Boolean(identity.social_verified),
    responseTimeHours: identity.response_time_hours != null ? Number(identity.response_time_hours) : null,
    avgRating: Number(identity.avg_rating ?? 0),
    reviewCount: Number(identity.review_count ?? 0),
  };

  const [jimvioFollowers, jimvioFollowing] = await Promise.all([
    countJimvioFollowers(db, profile.id, profile.username),
    countJimvioFollowing(db, profile.id),
  ]);

  const canBook =
    !isSelf && Boolean(viewerId) && identity.availability !== "unavailable" && contactPreferences.booking;
  const restricted = !canView;

  if (restricted) {
    return {
      profile: profileCore,
      social: [],
      portfolio: [],
      testimonials: [],
      resume: [],
      badges: [],
      milestones: [],
      aiInsights: null,
      levelProgress: toLevelProgress(Number(identity.xp ?? 0)),
      stats: null,
      reviews: [],
      jimvioFollowers,
      jimvioFollowing,
      isOwner: isSelf,
      canBook: false,
      restricted: true,
    };
  }

  let portfolioQuery = db
    .from("jip_portfolio_items")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });
  if (!canFull) portfolioQuery = portfolioQuery.eq("is_public", true);

  let testimonialsQuery = db
    .from("jip_testimonials")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  if (!canFull) testimonialsQuery = testimonialsQuery.eq("is_public", true);

  const [
    { data: socials },
    { data: portfolio },
    { data: testimonials },
    { data: resume },
    { data: userBadges },
    { data: milestones },
    { data: aiInsightsRow },
    creatorStats,
    reviews,
  ] = await Promise.all([
    db.from("jip_social_accounts").select("*").eq("user_id", profile.id).order("followers", { ascending: false }),
    portfolioQuery,
    testimonialsQuery,
    db.from("jip_resume_entries").select("*").eq("user_id", profile.id).order("sort_order", { ascending: true }),
    db.from("jip_user_badges").select("*, badge:jip_badges(*)").eq("user_id", profile.id),
    db.from("jip_milestones").select("*").eq("user_id", profile.id).order("achieved_at", { ascending: false }),
    canFull
      ? db.from("jip_ai_insights").select("*").eq("user_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    computeCreatorStats(profile.id),
    loadPublicReviews(db, profile.id),
  ]);

  const badges = ((userBadges ?? []) as unknown as UserBadge[])
    .map((ub) => ub.badge)
    .filter((b): b is Badge => Boolean(b));

  let publicProfile = profileCore;
  let publicSocial = ((socials ?? []) as SocialAccount[]).map(toSocialAccount);

  if (!isSelf) {
    const custom = profileCore.privacyCustom;
    publicProfile = {
      ...profileCore,
      bio: privacyFieldVisible(custom, "showBio") ? profileCore.bio : null,
      website: privacyFieldVisible(custom, "showWebsite") ? profileCore.website : null,
      city: privacyFieldVisible(custom, "showLocation") ? profileCore.city : null,
      country: privacyFieldVisible(custom, "showLocation") ? profileCore.country : null,
      languages: privacyFieldVisible(custom, "showSkills") ? profileCore.languages : [],
      skills: privacyFieldVisible(custom, "showSkills") ? profileCore.skills : [],
    };
    if (!privacyFieldVisible(custom, "showSocial")) {
      publicSocial = [];
    }
  }

  return {
    profile: publicProfile,
    social: publicSocial,
    portfolio: ((portfolio ?? []) as PortfolioItem[]).map(toPortfolioItem),
    testimonials: ((testimonials ?? []) as Testimonial[]).map(toTestimonial),
    resume: ((resume ?? []) as ResumeEntry[]).map(toResumeEntry),
    badges: badges.map(toBadge),
    milestones: ((milestones ?? []) as Milestone[]).map(toMilestone),
    aiInsights: toAiInsights((aiInsightsRow ?? null) as AIInsights | null),
    levelProgress: toLevelProgress(Number(identity.xp ?? 0)),
    stats: toStatsSnapshot(creatorStats),
    reviews,
    jimvioFollowers,
    jimvioFollowing,
    isOwner: isSelf,
    canBook,
    restricted: false,
  };
}

export async function getIdentityByUserId(
  userId: string,
  viewerId?: string | null
): Promise<IdentityProfilePayload | null> {
  if (!userId) return null;
  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: profile } = await db
    .from("profiles")
    .select(PROFILE_CORE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const identity = await ensureJipIdentity(userId);
  const resolvedViewerId = await resolveViewerId(viewerId);

  return buildProfilePayload(db, profile as ProfileCore, identity, resolvedViewerId);
}

export async function getIdentityByUsername(
  username: string,
  viewerId?: string | null
): Promise<IdentityProfilePayload | null> {
  if (!username) return null;
  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: profile } = await db
    .from("profiles")
    .select(PROFILE_CORE_SELECT)
    .ilike("username", username)
    .maybeSingle();
  if (!profile) return null;

  const identity = await ensureJipIdentity(profile.id);
  const resolvedViewerId = await resolveViewerId(viewerId);

  return buildProfilePayload(db, profile as ProfileCore, identity, resolvedViewerId);
}

export async function listBookingsForUser(
  userId: string,
  role: "creator" | "brand" | "all" = "all"
): Promise<Booking[]> {
  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let query = db
    .from("jip_bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "creator") query = query.eq("creator_id", userId);
  else if (role === "brand") query = query.eq("brand_user_id", userId);
  else query = query.or(`creator_id.eq.${userId},brand_user_id.eq.${userId}`);

  const { data } = await query;
  return (data ?? []) as Booking[];
}

export async function listBadgesCatalog(): Promise<Badge[]> {
  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db.from("jip_badges").select("*").order("xp_reward", { ascending: false });
  return (data ?? []) as Badge[];
}
