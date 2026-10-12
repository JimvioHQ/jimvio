// ──────────────────────────────────────────────────────────
// UGC & CLIPPING MODULE — Shared TypeScript types (V2)
// ──────────────────────────────────────────────────────────

export type UGCCampaignType   = 'clipping' | 'ugc' | 'music_clipping' | 'promotion';
export type UGCPaymentModel   = 'per_views' | 'fixed_per_content';
export type UGCCampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type UGCSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'removed' | 'revision_requested';
export type UGCPlatform          = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x';
export type UGCMediaType         = 'image' | 'video' | 'file';
export type UGCMediaUsage        = 'banner' | 'example' | 'ad_creative';
export type UGCParticipationStatus = 'invited' | 'accepted' | 'rejected' | 'banned' | 'pending' | 'waitlisted' | 'withdrawn';
export type UGCJoinMode = 'instant' | 'application' | 'invite_only' | 'hybrid';
export type UGCPayoutStatus      = 'pending' | 'approved' | 'paid';
export type UGCPlatformFormat    = 'reels' | 'tiktok_video' | 'youtube_short' | 'post' | 'story';
export type UGCInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
export type UGCLibraryStatus = 'uploaded' | 'draft' | 'approved' | 'rejected' | 'archived';
export type UGCLibraryMediaType = 'video' | 'image' | 'file' | 'audio';
export type UGCRevisionStatus = 'requested' | 'submitted' | 'accepted' | 'rejected';
export type UGCChatMessageType = 'text' | 'attachment' | 'voice' | 'system';

export interface UGCCampaignMedia {
  id: string;
  campaign_id: string;
  type: UGCMediaType;
  url: string;
  thumbnail_url: string | null;
  usage: UGCMediaUsage;
  platform_format: UGCPlatformFormat | null;
  order_index: number;
  created_at: string;
}

export interface UGCCampaign {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  campaign_type: UGCCampaignType;
  payment_model: UGCPaymentModel;
  status: UGCCampaignStatus;
  
  rate_per_1k_views: number;
  fixed_rate: number;
  total_budget: number;
  spent_budget: number;
  max_payout_per_sub: number | null;
  allowed_platforms: string[];
  
  // Structured Requirements
  content_guidelines: string | null; // Legacy support
  min_duration: number | null;
  max_duration: number | null;
  required_hashtags: string[];
  required_mentions: string[];
  required_keywords: string[];
  
  requires_face: boolean;
  submission_count: number;
  approved_count: number;
  total_views_tracked: number;
  starts_at: string | null;
  ends_at: string | null;
  content_deadline?: string | null;
  live_at?: string | null;
  submission_deadline?: string | null;
  review_starts_at?: string | null;
  review_ends_at?: string | null;
  payment_at?: string | null;
  
  // Custom Campaign Type Logic fields
  music_track_url: string | null;
  music_artist_name: string | null;
  promotion_target: string | null;
  promotion_target_url: string | null;

  created_at: string;
  updated_at: string;

  join_mode?: UGCJoinMode;
  join_config?: Record<string, unknown> | null;
  max_participants?: number | null;

  /** Platform-admin override: Active without recording funding. */
  activated_by_admin?: boolean;
  admin_activated_at?: string | null;
  admin_activated_by?: string | null;
  admin_activation_reason?: string | null;

  // Joined / Nested
  media?: UGCCampaignMedia[];
  vendor?: {
    business_name: string;
    business_logo: string | null;
    business_slug: string;
    business_description?: string | null;
    business_country?: string | null;
    business_type?: string | null;
    created_at?: string | null;
    rating?: number | null;
    follower_count?: number | null;
    verification_status?: "pending" | "verified" | "rejected" | "suspended" | null;
    verified_at?: string | null;
    /** Account owner profile (vendors.user_id → profiles), when joined by API. */
    owner?: {
      avatar_url?: string | null;
      full_name?: string | null;
    } | null;
  };
}

export interface UGCSubmissionMedia {
  id: string;
  submission_id: string;
  type: UGCMediaType;
  url: string;
  thumbnail_url: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  platform_format: UGCPlatformFormat | null;
  file_size: number | null;
  mime_type: string | null;
  order_index: number;
  created_at: string;
}

export interface UGCSubmission {
  id: string;
  campaign_id: string;
  influencer_id: string;
  post_url: string;
  platform: UGCPlatform;
  caption: string | null;
  status: UGCSubmissionStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  total_views_earned: number;
  total_earnings: number;
  claimed_views?: number | null;
  accepted_views?: number | null;
  
  // Fraud & Tracking
  is_suspicious: boolean;
  fraud_score: number;
  
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined / Nested
  media?: UGCSubmissionMedia[];
  campaign?: Pick<UGCCampaign, 'id' | 'title' | 'rate_per_1k_views' | 'status'>;
  influencer?: {
    id: string;
    display_name: string;
    profile_image: string | null;
    user_id: string;
  };
}

export interface UGCViewSnapshot {
  id: string;
  submission_id: string;
  views_at_snapshot: number;
  delta_views: number;
  earnings_this_snapshot: number;
  
  // social metrics
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  
  snapshotted_at: string;
}

export interface UGCParticipant {
  id: string;
  campaign_id: string;
  influencer_id: string;
  status: UGCParticipationStatus;
  joined_at: string;
  application_message?: string | null;
  application_data?: Record<string, unknown> | null;
  eligibility_score?: number | null;
  terms_accepted_at?: string | null;
  reviewed_at?: string | null;
  review_feedback?: string | null;
  withdrawn_at?: string | null;
}

export interface UGCPayout {
  id: string;
  submission_id: string;
  influencer_id: string;
  amount: number;
  status: UGCPayoutStatus;
  paid_at: string | null;
  payout_id: string | null;
  created_at: string;
}

export interface UGCReport {
  id: string;
  reporter_id: string;
  submission_id: string | null;
  reason: 'spam' | 'fraud' | 'copyright' | 'inappropriate' | 'other';
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ── API request/response shapes ──────────────────────────────

export interface CreateCampaignPayload {
  title: string;
  description?: string;
  campaign_type: UGCCampaignType;
  payment_model?: UGCPaymentModel;
  
  rate_per_1k_views: number;
  fixed_rate?: number;
  total_budget: number;
  max_payout_per_sub?: number;
  allowed_platforms?: string[];
  
  // New structured fields
  min_duration?: number;
  max_duration?: number;
  required_hashtags?: string[];
  required_mentions?: string[];
  required_keywords?: string[];
  
  requires_face?: boolean;
  starts_at?: string;
  ends_at?: string;
  content_deadline?: string | null;
  live_at?: string | null;
  submission_deadline?: string | null;
  review_starts_at?: string | null;
  review_ends_at?: string | null;
  payment_at?: string | null;

  music_track_url?: string;
  music_artist_name?: string;
  promotion_target?: string;
  promotion_target_url?: string;

  media?: {
    type?: UGCMediaType;
    url: string;
    thumbnail_url?: string;
    usage?: UGCMediaUsage;
  }[];
}

export interface CreateSubmissionPayload {
  campaign_id: string;
  post_url: string;
  platform: UGCPlatform;
  caption?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Platform completion shapes (lightweight) ─────────────────

export interface UGCCampaignTemplate {
  id: string;
  brand_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  payload: Record<string, unknown>;
  is_favorite: boolean;
  source_campaign_id: string | null;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface UGCCreatorInvitation {
  id: string;
  campaign_id: string;
  brand_id: string;
  invited_by: string | null;
  influencer_id: string | null;
  invitee_user_id: string | null;
  invitee_email: string | null;
  invitee_username: string | null;
  status: UGCInvitationStatus;
  message: string | null;
  metadata: Record<string, unknown>;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UGCFavoriteCreator {
  id: string;
  brand_id: string;
  influencer_id: string;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface UGCSavedCollection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UGCSavedCampaign {
  id: string;
  user_id: string;
  campaign_id: string;
  collection_id: string | null;
  created_at: string;
}

export interface UGCContentLibraryItem {
  id: string;
  user_id: string;
  influencer_id: string | null;
  campaign_id: string | null;
  submission_id: string | null;
  title: string | null;
  file_url: string;
  thumbnail_url: string | null;
  media_type: UGCLibraryMediaType;
  status: UGCLibraryStatus;
  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UGCChatThread {
  id: string;
  campaign_id: string;
  brand_id: string;
  influencer_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

export interface UGCChatMessage {
  id: string;
  thread_id: string;
  campaign_id: string;
  sender_user_id: string;
  body: string | null;
  message_type: UGCChatMessageType;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  is_pinned: boolean;
  created_at: string;
}

export interface UGCCampaignActivity {
  id: string;
  campaign_id: string;
  actor_user_id: string | null;
  influencer_id: string | null;
  submission_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UGCSubmissionRevision {
  id: string;
  submission_id: string;
  campaign_id: string;
  round_number: number;
  requested_by: string | null;
  request_notes: string | null;
  creator_response: string | null;
  media_urls: unknown[];
  status: UGCRevisionStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface CreateInvitationPayload {
  campaign_id: string;
  username?: string;
  email?: string;
  influencer_id?: string;
  message?: string;
}
