// types/db.ts
import type { Tables, TablesInsert, TablesUpdate, Database } from "@/types/supabase";

// ── Row types (what you get from SELECT) ────────────────────────────────
export type AffiliateClick = Tables<"affiliate_clicks">;
export type AffiliateCommission = Tables<"affiliate_commissions">;
export type AffiliateLink = Tables<"affiliate_links">;
export type Affiliate = Tables<"affiliates">;
export type BlogPost = Tables<"blog_posts">;
export type BuyingLeadOffer = Tables<"buying_lead_offers">;
export type BuyingRequest = Tables<"buying_requests">;
export type Community = Tables<"communities">;
export type CommunityCourse = Tables<"community_courses">;
export type CommunityInboxConversation = Tables<"community_inbox_conversations">;
export type CommunityInboxMessage = Tables<"community_inbox_messages">;
export type CommunityMembership = Tables<"community_memberships">;
export type CommunityMessage = Tables<"community_messages">;
export type CommunityPayment = Tables<"community_payments">;
export type CommunityPostComment = Tables<"community_post_comments">;
export type CommunityPostLike = Tables<"community_post_likes">;
export type CommunityPost = Tables<"community_posts">;
export type CommunitySavedPost = Tables<"community_saved_posts">;
export type CommunityTask = Tables<"community_tasks">;
export type ConversationMessage = Tables<"conversation_messages">;
export type Conversation = Tables<"conversations">;
export type CourseLesson = Tables<"course_lessons">;
export type CourseModule = Tables<"course_modules">;
export type DigitalAccess = Tables<"digital_access">;
export type ExchangeRateLog = Tables<"exchange_rate_logs">;
export type FailedWalletCredit = Tables<"failed_wallet_credits">;
export type Influencer = Tables<"influencers">;
export type LessonProgress = Tables<"lesson_progress">;
export type MemberPoints = Tables<"member_points">;
export type Notification = Tables<"notifications">;
export type OrderItem = Tables<"order_items">;
export type OrderStatusHistory = Tables<"order_status_history">;
export type Order = Tables<"orders">;
export type Payout = Tables<"payouts">;
export type PlatformSetting = Tables<"platform_settings">;
export type ProductCategory = Tables<"product_categories">;
export type ProductVariant = Tables<"product_variants">;
export type ProductView = Tables<"product_views">;
export type Product = Tables<"products">;
export type Profile = Tables<"profiles">;
export type Review = Tables<"reviews">;
export type Room = Tables<"rooms">;
export type ShopifyCredential = Tables<"shopify_credentials">;
export type ShortVideoClick = Tables<"short_video_clicks">;
export type ShortVideoComment = Tables<"short_video_comments">;
export type ShortVideoEarning = Tables<"short_video_earnings">;
export type ShortVideoLike = Tables<"short_video_likes">;
export type ShortVideoView = Tables<"short_video_views">;
export type ShortVideo = Tables<"short_videos">;
export type Space = Tables<"spaces">;
export type TaskCompletion = Tables<"task_completions">;
export type Transaction = Tables<"transactions">;
export type UgcCampaignEscrow = Tables<"ugc_campaign_escrow">;
export type UgcCampaignMedia = Tables<"ugc_campaign_media">;
export type UgcCampaignParticipant = Tables<"ugc_campaign_participants">;
export type UgcCampaign = Tables<"ugc_campaigns">;
export type UgcPayout = Tables<"ugc_payouts">;
export type UgcReport = Tables<"ugc_reports">;
export type UgcSubmissionMedia = Tables<"ugc_submission_media">;
export type UgcSubmission = Tables<"ugc_submissions">;
export type UgcViewSnapshot = Tables<"ugc_view_snapshots">;
export type UserRole = Tables<"user_roles">;
export type VendorFollower = Tables<"vendor_followers">;
export type Vendor = Tables<"vendors">;
export type Wallet = Tables<"wallets">;
export type WebhookEvent = Tables<"webhook_events">;
export type Wishlist = Tables<"wishlists">;

// ── Insert types (what you pass to INSERT, with defaults optional) ──────
export type AffiliateInsert = TablesInsert<"affiliates">;
export type CommunityInsert = TablesInsert<"communities">;
export type CommunityMembershipInsert = TablesInsert<"community_memberships">;
export type CommunityMessageInsert = TablesInsert<"community_messages">;
export type CommunityPostInsert = TablesInsert<"community_posts">;
export type ConversationInsert = TablesInsert<"conversations">;
export type ConversationMessageInsert = TablesInsert<"conversation_messages">;
export type DigitalAccessInsert = TablesInsert<"digital_access">;
export type NotificationInsert = TablesInsert<"notifications">;
export type OrderInsert = TablesInsert<"orders">;
export type OrderItemInsert = TablesInsert<"order_items">;
export type OrderStatusHistoryInsert = TablesInsert<"order_status_history">;
export type PayoutInsert = TablesInsert<"payouts">;
export type ProductInsert = TablesInsert<"products">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ReviewInsert = TablesInsert<"reviews">;
export type TransactionInsert = TablesInsert<"transactions">;
export type UgcCampaignInsert = TablesInsert<"ugc_campaigns">;
export type UgcSubmissionInsert = TablesInsert<"ugc_submissions">;
export type VendorInsert = TablesInsert<"vendors">;
export type WalletInsert = TablesInsert<"wallets">;
export type WishlistInsert = TablesInsert<"wishlists">;

// ── Update types (everything optional, for UPDATE) ──────────────────────
export type OrderUpdate = TablesUpdate<"orders">;
export type OrderItemUpdate = TablesUpdate<"order_items">;
export type ProductUpdate = TablesUpdate<"products">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type ReviewUpdate = TablesUpdate<"reviews">;
export type VendorUpdate = TablesUpdate<"vendors">;
// ... add more as you need them

// ── Enums (use these instead of magic strings) ──────────────────────────
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PayoutStatus = Database["public"]["Enums"]["payout_status"];
export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type ProductType = Database["public"]["Enums"]["product_type"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type UserRoleName = Database["public"]["Enums"]["user_role"];
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];
export type UgcCampaignType = Database["public"]["Enums"]["ugc_campaign_type"];
export type UgcCampaignStatus = Database["public"]["Enums"]["ugc_campaign_status"];
export type UgcSubmissionStatus = Database["public"]["Enums"]["ugc_submission_status"];
export type UgcPlatform = Database["public"]["Enums"]["ugc_platform"];
export type UgcPlatformFormat = Database["public"]["Enums"]["ugc_platform_format"];
export type UgcMediaType = Database["public"]["Enums"]["ugc_media_type"];
export type UgcMediaUsage = Database["public"]["Enums"]["ugc_media_usage"];
export type UgcParticipationStatus = Database["public"]["Enums"]["ugc_participation_status"];
export type UgcPaymentModel = Database["public"]["Enums"]["ugc_payment_model"];
export type UgcPayoutStatus = Database["public"]["Enums"]["ugc_payout_status"];
export type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];
export type CommunityMemberStatus = Database["public"]["Enums"]["community_member_status"];
export type CampaignStatus = Database["public"]["Enums"]["campaign_status"];

// ── RPC return types ────────────────────────────────────────────────────
export type GetUserRolesArgs = Database["public"]["Functions"]["get_user_roles"]["Args"];
export type GetUserRolesReturn = Database["public"]["Functions"]["get_user_roles"]["Returns"];

export type VendorWithRelations = Database["public"]["Tables"]["vendors"];