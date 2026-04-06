// ──────────────────────────────────────────────────────────
// UGC & CLIPPING MODULE — Shared TypeScript types (V2)
// ──────────────────────────────────────────────────────────

export type UGCCampaignType   = 'clipping' | 'ugc' | 'music_clipping' | 'promotion';
export type UGCPaymentModel   = 'per_views' | 'fixed_per_content';
export type UGCCampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type UGCSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'removed';
export type UGCPlatform          = 'tiktok' | 'instagram' | 'youtube' | 'x';
export type UGCMediaType         = 'image' | 'video' | 'file';
export type UGCMediaUsage        = 'banner' | 'example' | 'ad_creative';
export type UGCParticipationStatus = 'invited' | 'accepted' | 'rejected' | 'banned';
export type UGCPayoutStatus      = 'pending' | 'approved' | 'paid';
export type UGCPlatformFormat    = 'reels' | 'tiktok_video' | 'youtube_short' | 'post' | 'story';

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
  
  // Custom Campaign Type Logic fields
  music_track_url: string | null;
  music_artist_name: string | null;
  promotion_target: string | null;
  promotion_target_url: string | null;

  created_at: string;
  updated_at: string;

  // Joined / Nested
  media?: UGCCampaignMedia[];
  vendor?: {
    business_name: string;
    business_logo: string | null;
    business_slug: string;
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
