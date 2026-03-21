export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'buyer' | 'vendor' | 'affiliate' | 'influencer' | 'community_owner' | 'admin';
export type ProductType = 'physical' | 'digital' | 'subscription' | 'course' | 'software' | 'template' | 'ebook';
export type ProductStatus = 'draft' | 'active' | 'paused' | 'archived';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CommunityMemberStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type NotificationType = 'order' | 'payment' | 'affiliate' | 'influencer' | 'community' | 'system' | 'review';
export type SubscriptionPlan = 'monthly' | 'yearly' | 'lifetime';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  timezone: string;
  language: string;
  is_verified: boolean;
  is_active: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  activated_at: string;
}

export interface ProductCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  created_at: string;
  /** From migration 024 — `jimvio` (seed/manual) or `shopify` (synced product types). */
  source?: "jimvio" | "shopify";
}

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  business_slug: string;
  business_description: string | null;
  business_logo: string | null;
  business_banner: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_country: string;
  tax_id: string | null;
  website: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verified_at: string | null;
  rating: number;
  total_sales: number;
  total_revenue: number;
  commission_rate: number;
  affiliate_enabled: boolean;
  affiliate_commission_rate: number;
  stripe_account_id: string | null;
  payout_method: string;
  payout_account: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** From migration 004 (vendor_followers trigger) */
  follower_count?: number;
  /** From migration 008 – optional vendor application fields */
  business_type?: string | null;
  product_categories?: string | null;
  profiles?: Profile;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  product_type: ProductType;
  status: ProductStatus;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  currency: string;
  sku: string | null;
  barcode: string | null;
  weight: number | null;
  dimensions: Json;
  images: Json;
  videos: Json;
  tags: string[] | null;
  is_digital: boolean;
  digital_file_url: string | null;
  digital_file_size: number | null;
  requires_shipping: boolean;
  track_inventory: boolean;
  inventory_quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  affiliate_enabled: boolean;
  affiliate_commission_rate: number | null;
  influencer_enabled: boolean;
  is_featured: boolean;
  is_active: boolean;
  view_count: number;
  sale_count: number;
  rating: number;
  review_count: number;
  wishlist_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  shopify_product_id?: string | null;
  shopify_variant_id?: number | null;
  shopify_handle?: string | null;
  shopify_synced_at?: string | null;
  /** `jimvio` (default) or `shopify` synced */
  source?: string | null;
  vendors?: Vendor;
  product_categories?: ProductCategory;
  product_variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  image_url: string | null;
  options: Json;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  vendor_id: string | null;
  affiliate_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: Json;
  billing_address: Json;
  notes: string | null;
  metadata: Json;
  irembopay_reference: string | null;
  irembopay_transaction_id: string | null;
  nowpayments_payment_id: number | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  shopify_order_id?: string | null;
  shopify_order_number?: number | null;
  shopify_fulfillment_status?: string | null;
  shopify_order_ids?: string[] | null;
  integration_source?: string | null;
  tracking_number?: string | null;
  tracking_status?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  vendor_id: string;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  affiliate_id: string | null;
  affiliate_commission_rate: number | null;
  affiliate_commission_amount: number | null;
  shopify_variant_id?: number | null;
  shopify_product_id?: string | null;
  cj_product_id?: string | null;
  digital_download_url: string | null;
  download_count: number;
  created_at: string;
  products?: Product;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_item_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  images: Json;
  is_verified_purchase: boolean;
  is_featured: boolean;
  helpful_count: number;
  vendor_reply: string | null;
  vendor_replied_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  bio: string | null;
  website: string | null;
  social_links: Json;
  niche: string[] | null;
  tier: string;
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  available_balance: number;
  pending_earnings: number;
  paid_earnings: number;
  conversion_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  product_id: string | null;
  vendor_id: string | null;
  link_code: string;
  custom_slug: string | null;
  destination_url: string;
  full_url: string | null;
  commission_rate: number | null;
  total_clicks: number;
  unique_clicks: number;
  total_conversions: number;
  total_earnings: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  products?: Product;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  link_id: string | null;
  order_id: string;
  order_item_id: string | null;
  product_id: string | null;
  vendor_id: string | null;
  commission_rate: number;
  order_amount: number;
  commission_amount: number;
  status: PayoutStatus;
  paid_at: string | null;
  payout_id: string | null;
  created_at: string;
}

export interface Influencer {
  id: string;
  user_id: string;
  display_name: string;
  niche: string[] | null;
  bio: string | null;
  profile_image: string | null;
  cover_image: string | null;
  social_platforms: Json;
  total_followers: number;
  engagement_rate: number;
  total_campaigns: number;
  total_earnings: number;
  available_balance: number;
  rating: number;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface InfluencerCampaign {
  id: string;
  vendor_id: string;
  influencer_id: string | null;
  product_id: string | null;
  title: string;
  description: string | null;
  requirements: string | null;
  campaign_type: string;
  budget: number | null;
  commission_type: string;
  commission_rate: number | null;
  commission_fixed: number | null;
  assets: Json;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
  vendors?: Vendor;
  products?: Product;
}

export interface ViralClip {
  id: string;
  vendor_id: string;
  campaign_id: string | null;
  product_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  cloudinary_public_id: string | null;
  duration: number | null;
  file_size: number | null;
  format: string | null;
  tags: string[] | null;
  total_views: number;
  total_shares: number;
  total_downloads: number;
  total_clicks: number;
  total_conversions: number;
  is_active: boolean;
  created_at: string;
}

export interface Community {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[] | null;
  is_private: boolean;
  member_count: number;
  post_count: number;
  monthly_price: number | null;
  yearly_price: number | null;
  lifetime_price: number | null;
  currency: string;
  trial_days: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  subscription_plan: SubscriptionPlan | null;
  subscription_status: CommunityMemberStatus;
  subscribed_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  payment_reference: string | null;
  created_at: string;
  profiles?: Profile;
  communities?: Community;
}

export interface CommunityPost {
  id: string;
  community_id: string;
  author_id: string;
  title: string | null;
  body: string;
  images: Json;
  attachments: Json;
  post_type: string;
  is_pinned: boolean;
  is_exclusive: boolean;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Json;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  reference: string;
  type: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_transaction_id: string | null;
  provider_reference: string | null;
  description: string | null;
  metadata: Json;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid: number;
  currency: string;
  updated_at: string;
}

/** Public blog (migration 022). */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author_name: string;
  published_at: string;
  read_time_minutes: number;
  category: string;
  image_url: string | null;
  body: string | null;
  is_published: boolean;
  created_at: string;
}

/** platform_settings.key / value (migration 022). */
export interface PlatformSettingRow {
  key: string;
  value: Json;
  updated_at: string;
}
