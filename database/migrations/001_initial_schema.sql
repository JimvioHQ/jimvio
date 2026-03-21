-- ============================================================
-- JIMVIO PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('buyer', 'vendor', 'affiliate', 'influencer', 'community_owner', 'admin');
CREATE TYPE product_type AS ENUM ('physical', 'digital', 'subscription', 'course', 'software', 'template', 'ebook');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE community_member_status AS ENUM ('active', 'paused', 'cancelled', 'expired');
CREATE TYPE notification_type AS ENUM ('order', 'payment', 'affiliate', 'influencer', 'community', 'system', 'review');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly', 'lifetime');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- ============================================================
-- USERS & PROFILES
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  phone TEXT,
  country TEXT DEFAULT 'RW',
  city TEXT,
  timezone TEXT DEFAULT 'Africa/Kigali',
  language TEXT DEFAULT 'en',
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.product_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  product_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_slug TEXT NOT NULL UNIQUE,
  business_description TEXT,
  business_logo TEXT,
  business_banner TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_address TEXT,
  business_country TEXT DEFAULT 'RW',
  tax_id TEXT,
  website TEXT,
  verification_status verification_status DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  rating DECIMAL(3,2) DEFAULT 0,
  total_sales INT DEFAULT 0,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  affiliate_enabled BOOLEAN DEFAULT TRUE,
  affiliate_commission_rate DECIMAL(5,2) DEFAULT 10,
  stripe_account_id TEXT,
  payout_method TEXT DEFAULT 'irembopay',
  payout_account TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  product_type product_type DEFAULT 'physical',
  status product_status DEFAULT 'draft',
  price DECIMAL(14,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(14,2),
  cost_price DECIMAL(14,2),
  currency TEXT DEFAULT 'RWF',
  sku TEXT UNIQUE,
  barcode TEXT,
  weight DECIMAL(10,3),
  dimensions JSONB,
  images JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  tags TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  is_digital BOOLEAN DEFAULT FALSE,
  digital_file_url TEXT,
  digital_file_size BIGINT,
  requires_shipping BOOLEAN DEFAULT TRUE,
  track_inventory BOOLEAN DEFAULT TRUE,
  inventory_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  allow_backorder BOOLEAN DEFAULT FALSE,
  affiliate_enabled BOOLEAN DEFAULT TRUE,
  affiliate_commission_rate DECIMAL(5,2),
  influencer_enabled BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  sale_count INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  wishlist_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price DECIMAL(14,2) NOT NULL,
  compare_at_price DECIMAL(14,2),
  inventory_quantity INT DEFAULT 0,
  image_url TEXT,
  options JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bulk_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity INT NOT NULL,
  max_quantity INT,
  price DECIMAL(14,2) NOT NULL,
  discount_percent DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE DEFAULT 'JV-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  vendor_id UUID REFERENCES public.vendors(id),
  affiliate_id UUID,
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  shipping_amount DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  irembopay_reference TEXT,
  irembopay_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  product_name TEXT NOT NULL,
  product_image TEXT,
  variant_name TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,2) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  affiliate_id UUID,
  affiliate_commission_rate DECIMAL(5,2),
  affiliate_commission_amount DECIMAL(14,2),
  digital_download_url TEXT,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  order_item_id UUID REFERENCES public.order_items(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  images JSONB DEFAULT '[]',
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  vendor_reply TEXT,
  vendor_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- ============================================================
-- WISHLISTS
-- ============================================================

CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================================
-- AFFILIATES
-- ============================================================

CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL UNIQUE DEFAULT 'AFF-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  bio TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  niche TEXT[],
  tier TEXT DEFAULT 'bronze',
  total_clicks BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_earnings DECIMAL(14,2) DEFAULT 0,
  available_balance DECIMAL(14,2) DEFAULT 0,
  pending_earnings DECIMAL(14,2) DEFAULT 0,
  paid_earnings DECIMAL(14,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  link_code TEXT NOT NULL UNIQUE DEFAULT 'LNK-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 10)),
  custom_slug TEXT UNIQUE,
  destination_url TEXT NOT NULL,
  full_url TEXT,
  commission_rate DECIMAL(5,2),
  total_clicks BIGINT DEFAULT 0,
  unique_clicks BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_earnings DECIMAL(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  device_type TEXT,
  session_id TEXT,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id),
  link_id UUID REFERENCES public.affiliate_links(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  order_item_id UUID REFERENCES public.order_items(id),
  product_id UUID REFERENCES public.products(id),
  vendor_id UUID REFERENCES public.vendors(id),
  commission_rate DECIMAL(5,2) NOT NULL,
  order_amount DECIMAL(14,2) NOT NULL,
  commission_amount DECIMAL(14,2) NOT NULL,
  status payout_status DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payout_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INFLUENCERS
-- ============================================================

CREATE TABLE public.influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  niche TEXT[],
  bio TEXT,
  profile_image TEXT,
  cover_image TEXT,
  social_platforms JSONB DEFAULT '{}',
  total_followers BIGINT DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  total_campaigns INT DEFAULT 0,
  total_earnings DECIMAL(14,2) DEFAULT 0,
  available_balance DECIMAL(14,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.influencer_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id),
  product_id UUID REFERENCES public.products(id),
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  campaign_type TEXT DEFAULT 'promotion',
  budget DECIMAL(14,2),
  commission_type TEXT DEFAULT 'percentage',
  commission_rate DECIMAL(5,2),
  commission_fixed DECIMAL(14,2),
  assets JSONB DEFAULT '[]',
  status campaign_status DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  total_views BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIRAL CLIPS ENGINE
-- ============================================================

CREATE TABLE public.viral_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.influencer_campaigns(id),
  product_id UUID REFERENCES public.products(id),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  duration INT,
  file_size BIGINT,
  format TEXT,
  tags TEXT[],
  total_views BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,
  total_downloads BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.clip_engagements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  platform TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNITIES
-- ============================================================

CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  avatar_url TEXT,
  cover_image TEXT,
  category TEXT,
  tags TEXT[],
  is_private BOOLEAN DEFAULT FALSE,
  member_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  monthly_price DECIMAL(14,2),
  yearly_price DECIMAL(14,2),
  lifetime_price DECIMAL(14,2),
  currency TEXT DEFAULT 'RWF',
  trial_days INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  subscription_plan subscription_plan,
  subscription_status community_member_status DEFAULT 'active',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT,
  body TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  post_type TEXT DEFAULT 'discussion',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.community_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  parent_id UUID REFERENCES public.community_post_comments(id),
  body TEXT NOT NULL,
  like_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS & TRANSACTIONS
-- ============================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  reference TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  status payment_status DEFAULT 'pending',
  provider TEXT DEFAULT 'irembopay',
  provider_transaction_id TEXT,
  provider_reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  fee DECIMAL(14,2) DEFAULT 0,
  net_amount DECIMAL(14,2),
  currency TEXT DEFAULT 'RWF',
  status payout_status DEFAULT 'pending',
  payout_method TEXT DEFAULT 'irembopay',
  payout_account TEXT,
  provider_reference TEXT,
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_balance DECIMAL(14,2) DEFAULT 0,
  pending_balance DECIMAL(14,2) DEFAULT 0,
  total_earned DECIMAL(14,2) DEFAULT 0,
  total_paid DECIMAL(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS & EVENTS
-- ============================================================

CREATE TABLE public.product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT,
  ip_address INET,
  referrer TEXT,
  country TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  query TEXT NOT NULL,
  results_count INT DEFAULT 0,
  clicked_product_id UUID REFERENCES public.products(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIPPING
-- ============================================================

CREATE TABLE public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  countries TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_weight DECIMAL(10,3),
  max_weight DECIMAL(10,3),
  price DECIMAL(14,2) NOT NULL,
  estimated_days_min INT,
  estimated_days_max INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COUPONS & DISCOUNTS
-- ============================================================

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES public.vendors(id),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  value DECIMAL(14,2) NOT NULL,
  min_order_amount DECIMAL(14,2),
  max_discount_amount DECIMAL(14,2),
  usage_limit INT,
  usage_count INT DEFAULT 0,
  user_limit INT DEFAULT 1,
  applies_to TEXT DEFAULT 'all',
  product_ids UUID[],
  category_ids UUID[],
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_slug ON public.vendors(business_slug);
CREATE INDEX idx_vendors_verification ON public.vendors(verification_status);
CREATE INDEX idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_type ON public.products(product_type);
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_search ON public.products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_affiliate_links_affiliate_id ON public.affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_links_product_id ON public.affiliate_links(product_id);
CREATE INDEX idx_affiliate_clicks_link_id ON public.affiliate_clicks(link_id);
CREATE INDEX idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at DESC);
CREATE INDEX idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX idx_campaigns_vendor_id ON public.influencer_campaigns(vendor_id);
CREATE INDEX idx_campaigns_status ON public.influencer_campaigns(status);
CREATE INDEX idx_viral_clips_vendor_id ON public.viral_clips(vendor_id);
CREATE INDEX idx_communities_slug ON public.communities(slug);
CREATE INDEX idx_communities_owner_id ON public.communities(owner_id);
CREATE INDEX idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX idx_community_posts_community_id ON public.community_posts(community_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_reference ON public.transactions(reference);
CREATE INDEX idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX idx_product_views_created_at ON public.product_views(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE & WALLET ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer');

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Update product stats when reviewed
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE product_id = NEW.product_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.communities
  SET member_count = (SELECT COUNT(*) FROM public.community_members WHERE community_id = NEW.community_id AND subscription_status = 'active')
  WHERE id = NEW.community_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_community_member_change
  AFTER INSERT OR UPDATE OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viral_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER ROLES POLICIES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own roles" ON public.user_roles FOR ALL USING (auth.uid() = user_id);

-- VENDORS POLICIES
CREATE POLICY "Vendors are publicly viewable" ON public.vendors FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create vendor profile" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PRODUCTS POLICIES
CREATE POLICY "Active products are publicly viewable" ON public.products FOR SELECT USING (status = 'active' AND is_active = true);
CREATE POLICY "Vendors can manage own products" ON public.products FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- ORDERS POLICIES
CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Vendors can view their orders" ON public.orders FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ORDER ITEMS POLICIES
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);

-- REVIEWS POLICIES
CREATE POLICY "Reviews are publicly viewable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can manage own reviews" ON public.reviews FOR ALL USING (auth.uid() = buyer_id);

-- WISHLISTS POLICIES
CREATE POLICY "Users can manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- AFFILIATES POLICIES
CREATE POLICY "Affiliate profiles are publicly viewable" ON public.affiliates FOR SELECT USING (is_active = true);
CREATE POLICY "Affiliates can manage own profile" ON public.affiliates FOR ALL USING (auth.uid() = user_id);

-- AFFILIATE LINKS POLICIES
CREATE POLICY "Affiliate links are publicly viewable" ON public.affiliate_links FOR SELECT USING (is_active = true);
CREATE POLICY "Affiliates can manage own links" ON public.affiliate_links FOR ALL USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

-- AFFILIATE COMMISSIONS POLICIES
CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

-- INFLUENCERS POLICIES
CREATE POLICY "Influencer profiles are publicly viewable" ON public.influencers FOR SELECT USING (is_active = true);
CREATE POLICY "Influencers can manage own profile" ON public.influencers FOR ALL USING (auth.uid() = user_id);

-- CAMPAIGNS POLICIES
CREATE POLICY "Active campaigns are publicly viewable" ON public.influencer_campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Vendors can manage own campaigns" ON public.influencer_campaigns FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- VIRAL CLIPS POLICIES
CREATE POLICY "Active clips are publicly viewable" ON public.viral_clips FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors can manage own clips" ON public.viral_clips FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- COMMUNITIES POLICIES
CREATE POLICY "Public communities are viewable" ON public.communities FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own communities" ON public.communities FOR ALL USING (auth.uid() = owner_id);

-- COMMUNITY MEMBERS POLICIES
CREATE POLICY "Members can view community membership" ON public.community_members FOR SELECT USING (
  auth.uid() = user_id OR
  community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
);
CREATE POLICY "Users can manage own membership" ON public.community_members FOR ALL USING (auth.uid() = user_id);

-- COMMUNITY POSTS POLICIES
CREATE POLICY "Community posts viewable by members" ON public.community_posts FOR SELECT USING (
  is_published = true AND (
    NOT (SELECT is_private FROM public.communities WHERE id = community_id) OR
    community_id IN (SELECT community_id FROM public.community_members WHERE user_id = auth.uid() AND subscription_status = 'active') OR
    community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
  )
);
CREATE POLICY "Members can create posts" ON public.community_posts FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  community_id IN (SELECT community_id FROM public.community_members WHERE user_id = auth.uid() AND subscription_status = 'active')
);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- PAYOUTS POLICIES
CREATE POLICY "Users can view own payouts" ON public.payouts FOR SELECT USING (auth.uid() = user_id);

-- WALLETS POLICIES
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
