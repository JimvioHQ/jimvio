/**
 * Jimvio Identity Platform (JIP) — shared TypeScript types.
 *
 * `profiles` remains the single source of truth for core identity fields
 * (avatar_url, bio, username, full_name, website, city, country, phone,
 * language, is_verified). Everything here that lives in a `jip_*` table is
 * an ADDITIVE extension and must never re-declare those core fields.
 */

export type PrivacyVisibility =
  | "public"
  | "private"
  | "brand_only"
  | "followers_only"
  | "custom";

export type CreatorLevel =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "elite";

export type SocialPlatform =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "facebook"
  | "x"
  | "threads"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "website";

export type PortfolioKind =
  | "video"
  | "image"
  | "campaign"
  | "brand"
  | "testimonial"
  | "other";

export type ResumeEntryType =
  | "experience"
  | "industry"
  | "brand"
  | "campaign"
  | "education"
  | "certification";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export type AvailabilityState = "open" | "limited" | "booked" | "unavailable";

export type VerificationRequestType =
  | "identity"
  | "documents"
  | "social"
  | "trust"
  | "level";

export type VerificationRequestStatus = "pending" | "approved" | "rejected";

/** Core identity fields — always sourced from `profiles`. Never duplicated. */
export interface ProfileCore {
  id: string;
  email?: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  is_verified: boolean;
  created_at?: string | null;
}

/** Row shape of `jip_identity` — extension fields ONLY, 1:1 with profiles. */
export interface JipIdentityRow {
  user_id: string;
  cover_image: string | null;
  headline: string | null;
  creator_level: CreatorLevel;
  trust_score: number;
  ai_score: number;
  reputation_score: number;
  overall_rank: number | null;
  languages: string[];
  skills: string[];
  specialties: string[];
  equipment: string[];
  industries: string[];
  availability: AvailabilityState;
  availability_note: string | null;
  contact_preferences: Record<string, boolean>;
  privacy_visibility: PrivacyVisibility;
  privacy_custom: Record<string, unknown>;
  media_kit_url: string | null;
  xp: number;
  identity_verified: boolean;
  documents_verified: boolean;
  social_verified: boolean;
  admin_notes: string | null;
  response_time_hours: number | null;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export type ReviewDirection = "brand_to_creator" | "creator_to_brand";

/** Row shape of `jip_reviews` — verified bidirectional brand <-> creator reviews. */
export interface JipReviewRow {
  id: string;
  subject_user_id: string;
  reviewer_user_id: string;
  direction: ReviewDirection;
  rating: number;
  title: string | null;
  body: string;
  is_verified: boolean;
  verification_source: string | null;
  booking_id: string | null;
  campaign_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  handle: string | null;
  url: string | null;
  followers: number;
  avg_views: number;
  engagement_rate: number;
  is_verified: boolean;
  is_public: boolean;
  verification_method: string | null;
  verified_at: string | null;
  verify_status?: string | null;
  verify_code?: string | null;
  verify_note?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  kind: PortfolioKind;
  title: string;
  description: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  brand_name: string | null;
  campaign_id: string | null;
  sort_order: number;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  user_id: string;
  author_name: string;
  author_role: string | null;
  author_company: string | null;
  quote: string;
  rating: number | null;
  is_public: boolean;
  created_at: string;
}

export interface ResumeEntry {
  id: string;
  user_id: string;
  entry_type: ResumeEntryType;
  title: string;
  organization: string | null;
  description: string | null;
  started_on: string | null;
  ended_on: string | null;
  is_current: boolean;
  sort_order: number;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: "verified" | "elite" | "community" | "affiliate" | "ugc" | "milestone" | "general";
  xp_reward: number;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  awarded_at: string;
  badge?: Badge;
}

export interface Milestone {
  id: string;
  user_id: string;
  code: string;
  title: string;
  description: string | null;
  achieved_at: string;
}

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  creator_id: string;
  brand_user_id: string;
  title: string;
  message: string | null;
  status: BookingStatus;
  scheduled_at: string | null;
  duration_minutes: number;
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
  creator?: Pick<ProfileCore, "id" | "username" | "full_name" | "avatar_url"> | null;
  brand?: Pick<ProfileCore, "id" | "username" | "full_name" | "avatar_url"> | null;
}

export interface AIInsights {
  user_id: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommended_campaigns: string[];
  recommended_products: string[];
  posting_schedule: Record<string, unknown>;
  revenue_opportunities: string[];
  growth_roadmap: string[];
  summary: string | null;
  raw: Record<string, unknown>;
  computed_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  request_type: VerificationRequestType;
  status: VerificationRequestStatus;
  payload: Record<string, unknown>;
  admin_id: string | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}

/** Aggregated, cross-surface performance snapshot for a creator/user. */
export interface CreatorStats {
  ugc: {
    campaignsJoined: number;
    campaignsCompleted: number;
    submissionsTotal: number;
    submissionsApproved: number;
    submissionsRejected: number;
    approvalRate: number; // 0-100
    totalViews: number;
    earningsPaid: number;
    earningsPending: number;
  };
  affiliate: {
    isAffiliate: boolean;
    totalClicks: number;
    totalConversions: number;
    conversionRate: number; // 0-100
    totalEarnings: number;
    pendingEarnings: number;
    availableBalance: number;
  };
  marketplace: {
    isVendor: boolean;
    totalRevenue: number;
    totalSales: number;
    productsCount: number;
    rating: number;
  };
  social: {
    accountsCount: number;
    totalFollowers: number;
    avgViews: number;
    avgEngagementRate: number;
    verifiedAccounts: number;
  };
  community: {
    communitiesJoined: number;
    totalPoints: number;
    level: number;
    streakDays: number;
  };
  computedAt: string;
}

/** Unified, privacy-aware Identity DTO returned by the public/self APIs. */
export interface IdentityDTO {
  profile: ProfileCore;
  identity: JipIdentityRow;
  socials: SocialAccount[];
  portfolio: PortfolioItem[];
  testimonials: Testimonial[];
  resume: ResumeEntry[];
  badges: UserBadge[];
  milestones: Milestone[];
  availability: AvailabilitySlot[];
  aiInsights: AIInsights | null;
  stats: CreatorStats | null;
  viewer: {
    isSelf: boolean;
    canView: boolean;
    canViewFullDetails: boolean;
  };
}

export interface IdentityUpdateInput {
  profile?: Partial<
    Pick<
      ProfileCore,
      "username" | "full_name" | "avatar_url" | "bio" | "website" | "phone" | "city" | "country" | "language"
    >
  >;
  identity?: Partial<
    Pick<
      JipIdentityRow,
      | "cover_image"
      | "headline"
      | "languages"
      | "skills"
      | "specialties"
      | "equipment"
      | "industries"
      | "availability"
      | "availability_note"
      | "contact_preferences"
      | "privacy_visibility"
      | "privacy_custom"
      | "media_kit_url"
      | "response_time_hours"
    >
  >;
}

/**
 * ── Wire-format ("Identity*") DTOs ─────────────────────────────────────────
 * Flat, camelCase shapes returned by `resolve.ts` and consumed directly by
 * the `components/identity/*` client UI and `app/u/[username]`, `app/identity/*`
 * pages. Keep field names in lockstep with those consumers — this is the
 * public contract of the Identity Platform API, distinct from the snake_case
 * DB row types above used internally by the lib/API layer.
 */

export type IdentityAvailability = AvailabilityState;
export type IdentityPrivacyVisibility = PrivacyVisibility;
export type IdentitySocialPlatform = SocialPlatform;
export type IdentityPortfolioKind = PortfolioKind;
export type IdentityResumeEntryType = ResumeEntryType;
export type IdentityBookingStatus = BookingStatus;
export type IdentityVerificationRequestType = VerificationRequestType;
export type IdentityVerificationRequestStatus = VerificationRequestStatus;
export type IdentityCreatorLevel = CreatorLevel;

export interface IdentitySocialAccount {
  id: string;
  platform: IdentitySocialPlatform;
  handle: string | null;
  url: string | null;
  followers: number;
  avgViews: number;
  engagementRate: number;
  isVerified: boolean;
  /** Whether the owner allows this account to appear on their public profile. */
  isPublic?: boolean;
  /** How it was proven: "oauth" (official login) or "bio_code". */
  verificationMethod?: string | null;
  verifyStatus?: "unverified" | "code_issued" | "pending_review" | "verified" | "failed";
}

export interface IdentityPortfolioItem {
  id: string;
  kind: IdentityPortfolioKind;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  brandName: string | null;
  sortOrder: number;
  isFeatured: boolean;
  isPublic: boolean;
}

export interface IdentityTestimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  quote: string;
  rating: number | null;
}

export interface IdentityResumeEntry {
  id: string;
  entryType: IdentityResumeEntryType;
  title: string;
  organization: string | null;
  description: string | null;
  startedOn: string | null;
  endedOn: string | null;
  isCurrent: boolean;
}

export interface IdentityBadge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface IdentityMilestone {
  id: string;
  title: string;
  description: string | null;
  achievedAt: string;
}

export interface IdentityAiInsights {
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendedCampaigns: string[];
  recommendedProducts: string[];
  revenueOpportunities: string[];
  growthRoadmap: string[];
}

export type IdentityReviewDirection = ReviewDirection;

export interface IdentityReview {
  id: string;
  direction: IdentityReviewDirection;
  rating: number;
  title: string | null;
  body: string;
  isVerified: boolean;
  verificationSource: string | null;
  createdAt: string;
  reviewer: {
    userId: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

/** camelCase mirror of `CreatorStats` — flattened for direct UI consumption. */
export interface IdentityCreatorStatsSnapshot {
  ugc: {
    campaignsJoined: number;
    campaignsCompleted: number;
    submissionsTotal: number;
    submissionsApproved: number;
    submissionsRejected: number;
    approvalRate: number;
    totalViews: number;
    earningsPaid: number;
    earningsPending: number;
  };
  affiliate: {
    isAffiliate: boolean;
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalEarnings: number;
    pendingEarnings: number;
    availableBalance: number;
  };
  marketplace: {
    isVendor: boolean;
    totalRevenue: number;
    totalSales: number;
    productsCount: number;
    rating: number;
  };
  social: {
    accountsCount: number;
    totalFollowers: number;
    avgViews: number;
    avgEngagementRate: number;
    verifiedAccounts: number;
  };
  community: {
    communitiesJoined: number;
    totalPoints: number;
    level: number;
    streakDays: number;
  };
  computedAt: string;
}

export interface IdentityLevelProgress {
  level: IdentityCreatorLevel;
  levelLabel: string;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  progressPct: number;
}

export interface IdentityBookingCounterparty {
  userId: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface IdentityBooking {
  id: string;
  creatorId: string;
  brandUserId: string;
  title: string;
  message: string | null;
  status: IdentityBookingStatus;
  scheduledAt: string | null;
  durationMinutes: number;
  meetingLink: string | null;
  createdAt: string;
  counterparty: IdentityBookingCounterparty | null;
}

export interface IdentityVerificationRequestUser {
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export interface IdentityVerificationRequest {
  id: string;
  userId: string;
  requestType: IdentityVerificationRequestType;
  status: IdentityVerificationRequestStatus;
  payload: Record<string, unknown>;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  user: IdentityVerificationRequestUser | null;
}

export interface IdentityProfileCore {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  isVerified: boolean;
  joinedAt: string | null;
  headline: string | null;
  coverImage: string | null;
  availability: IdentityAvailability;
  availabilityNote: string | null;
  languages: string[];
  skills: string[];
  specialties: string[];
  equipment: string[];
  industries: string[];
  contactPreferences: { email: boolean; in_app: boolean; booking: boolean };
  privacyVisibility: IdentityPrivacyVisibility;
  privacyCustom: Record<string, unknown>;
  mediaKitUrl: string | null;
  creatorLevel: IdentityCreatorLevel;
  trustScore: number;
  aiScore: number;
  reputationScore: number;
  overallRank: number | null;
  identityVerified: boolean;
  documentsVerified: boolean;
  socialVerified: boolean;
  responseTimeHours: number | null;
  avgRating: number;
  reviewCount: number;
}

/** Unified, privacy-aware payload consumed directly by the Identity UI. */
export interface IdentityProfilePayload {
  profile: IdentityProfileCore;
  social: IdentitySocialAccount[];
  portfolio: IdentityPortfolioItem[];
  testimonials: IdentityTestimonial[];
  resume: IdentityResumeEntry[];
  badges: IdentityBadge[];
  milestones: IdentityMilestone[];
  aiInsights: IdentityAiInsights | null;
  levelProgress: IdentityLevelProgress;
  stats: IdentityCreatorStatsSnapshot | null;
  reviews: IdentityReview[];
  jimvioFollowers?: number;
  jimvioFollowing?: number;
  isOwner: boolean;
  canBook: boolean;
  restricted: boolean;
}
