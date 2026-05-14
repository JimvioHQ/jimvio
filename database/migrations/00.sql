-- ============================================================
-- JIMVIO PLATFORM — COMBINED MIGRATION (ALL 59 MIGRATIONS)
-- Generated from migrations 001 → 059
-- Run this once on a fresh Supabase project.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS (final state after all migrations)
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'buyer', 'vendor', 'affiliate', 'influencer', 'community_owner', 'admin'
);
CREATE TYPE product_type AS ENUM (
  'physical', 'digital', 'subscription', 'course', 'software', 'template', 'ebook'
);
CREATE TYPE product_status AS ENUM ('draft', 'active', 'paused', 'archived');

-- order_status: 'checkout_direct' added in migration 058
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped',
  'delivered', 'cancelled', 'refunded', 'completed', 'checkout_direct'
);
CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'paid'
);
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE community_member_status AS ENUM ('active', 'paused', 'cancelled', 'expired');

-- notification_type: 'message' added in migration 017
CREATE TYPE notification_type AS ENUM (
  'order', 'payment', 'affiliate', 'influencer', 'community', 'system', 'review', 'message'
);
CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly', 'lifetime');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- UGC ENUMs (created in migration 042, extended in 048)
CREATE TYPE ugc_campaign_type AS ENUM ('clipping', 'ugc', 'music_clipping', 'promotion');
CREATE TYPE ugc_campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE ugc_submission_status AS ENUM ('pending', 'approved', 'rejected', 'removed');
CREATE TYPE ugc_platform AS ENUM ('tiktok', 'instagram', 'youtube', 'x');
CREATE TYPE ugc_platform_format AS ENUM ('reels', 'tiktok_video', 'youtube_short', 'post', 'story');
CREATE TYPE ugc_media_type AS ENUM ('image', 'video', 'file');
CREATE TYPE ugc_media_usage AS ENUM ('banner', 'example', 'ad_creative');
CREATE TYPE ugc_participation_status AS ENUM ('invited', 'accepted', 'rejected', 'banned');
CREATE TYPE ugc_payment_model AS ENUM ('per_views', 'fixed_per_content');
CREATE TYPE ugc_payout_status AS ENUM ('pending', 'approved', 'paid');

-- ============================================================
-- USERS & PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT NOT NULL UNIQUE,
  username           TEXT UNIQUE,
  full_name          TEXT,
  avatar_url         TEXT,
  bio                TEXT,
  website            TEXT,
  phone              TEXT,
  country            TEXT DEFAULT 'RW',
  city               TEXT,
  timezone           TEXT DEFAULT 'Africa/Kigali',
  language           TEXT DEFAULT 'en',
  is_verified        BOOLEAN DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         user_role NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================================
-- PLATFORM SETTINGS & BLOG (migration 022)
-- ============================================================
CREATE TABLE public.platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.blog_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  excerpt           TEXT NOT NULL,
  author_name       TEXT NOT NULL,
  published_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_time_minutes INT NOT NULL DEFAULT 5,
  category          TEXT NOT NULL DEFAULT 'General',
  image_url         TEXT,
  body              TEXT,
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES (migration 024 adds source, 057 adds category_type)
-- ============================================================
CREATE TABLE public.product_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id     UUID REFERENCES public.product_categories(id),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  icon          TEXT,
  image_url     TEXT,
  color         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  product_count INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- migration 024
  source        TEXT NOT NULL DEFAULT 'jimvio' CHECK (source IN ('jimvio', 'shopify')),
  -- migration 057
  category_type TEXT NOT NULL DEFAULT 'physical'
);

-- ============================================================
-- VENDORS (migration 004 adds follower_count, 008 adds business_type/product_categories)
-- ============================================================
CREATE TABLE public.vendors (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name             TEXT NOT NULL,
  business_slug             TEXT NOT NULL UNIQUE,
  business_description      TEXT,
  business_logo             TEXT,
  business_banner           TEXT,
  business_email            TEXT,
  business_phone            TEXT,
  business_address          TEXT,
  business_country          TEXT DEFAULT 'RW',
  tax_id                    TEXT,
  website                   TEXT,
  verification_status       verification_status DEFAULT 'pending',
  verification_notes        TEXT,
  verified_at               TIMESTAMPTZ,
  rating                    DECIMAL(3,2) DEFAULT 0,
  total_sales               INT DEFAULT 0,
  total_revenue             DECIMAL(14,2) DEFAULT 0,
  commission_rate           DECIMAL(5,2) DEFAULT 0,
  affiliate_enabled         BOOLEAN DEFAULT TRUE,
  affiliate_commission_rate DECIMAL(5,2) DEFAULT 10,
  stripe_account_id         TEXT,
  payout_method             TEXT DEFAULT 'mtn',        -- migration 034
  payout_account            TEXT,
  is_featured               BOOLEAN DEFAULT FALSE,
  is_active                 BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  follower_count            INT DEFAULT 0,             -- migration 004
  business_type             TEXT,                      -- migration 008
  product_categories        TEXT                       -- migration 008
);

CREATE TABLE public.vendor_followers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, user_id)
);

-- ============================================================
-- PRODUCTS (migration 035 adds source/source_metadata, 055 button_text,
--           056 pricing_type/billing_period/price_usd)
-- ============================================================
CREATE TABLE public.products (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id                 UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id               UUID REFERENCES public.product_categories(id),
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE,
  short_description         TEXT,
  description               TEXT,
  product_type              product_type DEFAULT 'physical',
  status                    product_status DEFAULT 'draft',
  price                     DECIMAL(14,2) NOT NULL DEFAULT 0,
  compare_at_price          DECIMAL(14,2),
  cost_price                DECIMAL(14,2),
  currency                  TEXT DEFAULT 'RWF',
  sku                       TEXT UNIQUE,
  barcode                   TEXT,
  weight                    DECIMAL(10,3),
  dimensions                JSONB,
  images                    JSONB DEFAULT '[]',
  videos                    JSONB DEFAULT '[]',
  tags                      TEXT[],
  meta_title                TEXT,
  meta_description          TEXT,
  is_digital                BOOLEAN DEFAULT FALSE,
  digital_file_url          TEXT,
  digital_file_size         BIGINT,
  requires_shipping         BOOLEAN DEFAULT TRUE,
  track_inventory           BOOLEAN DEFAULT TRUE,
  inventory_quantity        INT DEFAULT 0,
  low_stock_threshold       INT DEFAULT 5,
  allow_backorder           BOOLEAN DEFAULT FALSE,
  affiliate_enabled         BOOLEAN DEFAULT TRUE,
  affiliate_commission_rate DECIMAL(5,2),
  influencer_enabled        BOOLEAN DEFAULT TRUE,
  is_featured               BOOLEAN DEFAULT FALSE,
  is_active                 BOOLEAN DEFAULT TRUE,
  view_count                INT DEFAULT 0,
  sale_count                INT DEFAULT 0,
  rating                    DECIMAL(3,2) DEFAULT 0,
  review_count              INT DEFAULT 0,
  wishlist_count            INT DEFAULT 0,
  published_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  -- migration 035
  source                    TEXT DEFAULT 'vendor' CHECK (source IN ('vendor', 'shopify', 'cj')),
  source_metadata           JSONB NOT NULL DEFAULT '{}',
  -- migration 055
  button_text               TEXT,
  -- migration 056
  pricing_type              TEXT DEFAULT 'one_time',
  billing_period            TEXT,
  price_usd                 DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE public.product_variants (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id         UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  sku                TEXT UNIQUE,
  price              DECIMAL(14,2) NOT NULL,
  compare_at_price   DECIMAL(14,2),
  inventory_quantity INT DEFAULT 0,
  image_url          TEXT,
  options            JSONB DEFAULT '{}',
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.product_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id),
  session_id  TEXT,
  ip_address  INET,
  referrer    TEXT,
  country     TEXT,
  device_type TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS (many migrations add columns)
-- ============================================================
CREATE TABLE public.orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  buyer_id         UUID NOT NULL REFERENCES public.profiles(id),
  vendor_id        UUID REFERENCES public.vendors(id),
  affiliate_id     UUID,
  status           order_status DEFAULT 'pending',
  payment_status   payment_status DEFAULT 'pending',
  subtotal         DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount  DECIMAL(14,2) DEFAULT 0,
  shipping_amount  DECIMAL(14,2) DEFAULT 0,
  tax_amount       DECIMAL(14,2) DEFAULT 0,
  total_amount     DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency         TEXT DEFAULT 'RWF',
  shipping_address JSONB,
  billing_address  JSONB,
  notes            TEXT,
  metadata         JSONB DEFAULT '{}',
  paid_at          TIMESTAMPTZ,
  shipped_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  -- migration 034: renamed from irembopay_*
  payment_external_reference  TEXT,
  payment_external_id         TEXT,
  -- migration 025
  pesapal_tracking_id         TEXT,
  pesapal_merchant_ref        TEXT,
  payment_provider            TEXT,
  -- migration 020
  nowpayments_payment_id      BIGINT,
  -- migration 037
  payment_batch_id            UUID,
  -- migration 041
  afripay_reference           TEXT,
  afripay_transaction_id      TEXT,
  -- migration 051
  flutterwave_tx_ref          TEXT,
  flutterwave_transaction_id  BIGINT,
  paypal_order_id             TEXT,
  paypal_capture_id           TEXT,
  -- migration 054: Shopify fulfillment tracking
  integration_source          TEXT,
  shopify_order_id            TEXT,
  shopify_order_number        INT,
  shopify_fulfillment_status  TEXT DEFAULT 'unfulfilled',
  shopify_order_ids           TEXT[] DEFAULT '{}',
  tracking_number             TEXT,
  tracking_status             TEXT
);

-- migration 053 + 059: order_items with product_type and pricing
CREATE TABLE public.order_items (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id                  UUID REFERENCES public.products(id),
  variant_id                  UUID REFERENCES public.product_variants(id),
  vendor_id                   UUID REFERENCES public.vendors(id),
  product_name                TEXT NOT NULL,
  product_image               TEXT,
  variant_name                TEXT,
  quantity                    INT NOT NULL DEFAULT 1,
  unit_price                  DECIMAL(14,2) NOT NULL,
  total_price                 DECIMAL(14,2) NOT NULL,
  affiliate_id                UUID,
  affiliate_commission_rate   DECIMAL(5,2),
  affiliate_commission_amount DECIMAL(14,2),
  digital_download_url        TEXT,
  download_count              INT DEFAULT 0,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  -- migration 035
  product_source              TEXT NOT NULL DEFAULT 'vendor' CHECK (product_source IN ('vendor', 'shopify', 'cj')),
  source_metadata             JSONB NOT NULL DEFAULT '{}',
  -- migration 053
  product_type                TEXT DEFAULT 'physical',
  access_granted_at           TIMESTAMPTZ,
  -- migration 059
  pricing_type                TEXT DEFAULT 'one_time',
  billing_period              TEXT,
  metadata                    JSONB DEFAULT '{}'
);

CREATE TABLE public.order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id         UUID,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  notes           TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS & WISHLISTS (migration 004 adds vendor_id to reviews)
-- ============================================================
CREATE TABLE public.reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id             UUID NOT NULL REFERENCES public.profiles(id),
  order_item_id        UUID REFERENCES public.order_items(id),
  vendor_id            UUID REFERENCES public.vendors(id) ON DELETE CASCADE, -- migration 004
  rating               INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                TEXT,
  body                 TEXT,
  images               JSONB DEFAULT '[]',
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_featured          BOOLEAN DEFAULT FALSE,
  helpful_count        INT DEFAULT 0,
  vendor_reply         TEXT,
  vendor_replied_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

CREATE TABLE public.wishlists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================================
-- TRANSACTIONS & PAYMENTS (migration 034 changes provider default)
-- ============================================================
CREATE TABLE public.transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id),
  order_id                UUID REFERENCES public.orders(id),
  webhook_event_id        UUID,
  reference               TEXT UNIQUE,
  type                    TEXT NOT NULL,
  direction               TEXT NOT NULL DEFAULT 'credit',
  amount                  DECIMAL(14,2) NOT NULL,
  currency                TEXT DEFAULT 'RWF',
  amount_usd              DECIMAL(10,2),
  exchange_rate           DECIMAL(14,6),
  status                  payment_status DEFAULT 'pending',
  provider                TEXT DEFAULT 'jimvio',           -- migration 034
  provider_transaction_id TEXT,
  provider_reference      TEXT,
  description             TEXT,
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  payload         JSONB,
  status          TEXT NOT NULL DEFAULT 'received',
  error           TEXT,
  order_id        UUID REFERENCES public.orders(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.exchange_rate_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          DECIMAL(14,6) NOT NULL,
  order_id      UUID REFERENCES public.orders(id),
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payouts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id),
  type               TEXT NOT NULL,
  amount             DECIMAL(14,2) NOT NULL,
  fee                DECIMAL(14,2) DEFAULT 0,
  net_amount         DECIMAL(14,2),
  currency           TEXT DEFAULT 'RWF',
  status             payout_status DEFAULT 'pending',
  payout_method      TEXT DEFAULT 'mtn',                   -- migration 034
  payout_account     TEXT,
  provider_reference TEXT,
  notes              TEXT,
  processed_at       TIMESTAMPTZ,
  release_date       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_balance DECIMAL(14,2) DEFAULT 0,
  pending_balance   DECIMAL(14,2) DEFAULT 0,
  total_earned      DECIMAL(14,2) DEFAULT 0,
  total_paid        DECIMAL(14,2) DEFAULT 0,
  currency          TEXT DEFAULT 'RWF',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AFFILIATES (migration 011 adds payout_method/payout_account)
-- ============================================================
CREATE TABLE public.affiliates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_code    TEXT NOT NULL UNIQUE DEFAULT ('AFF-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  bio               TEXT,
  website           TEXT,
  social_links      JSONB DEFAULT '{}',
  niche             TEXT[],
  tier              TEXT DEFAULT 'bronze',
  total_clicks      BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_earnings    DECIMAL(14,2) DEFAULT 0,
  available_balance DECIMAL(14,2) DEFAULT 0,
  pending_earnings  DECIMAL(14,2) DEFAULT 0,
  paid_earnings     DECIMAL(14,2) DEFAULT 0,
  conversion_rate   DECIMAL(5,2) DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  payout_method     TEXT DEFAULT 'bank',   -- migration 011
  payout_account    TEXT                   -- migration 011
);

CREATE TABLE public.affiliate_links (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id      UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id         UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  link_code         TEXT NOT NULL UNIQUE DEFAULT ('LNK-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 10))),
  custom_slug       TEXT UNIQUE,
  destination_url   TEXT NOT NULL,
  full_url          TEXT,
  commission_rate   DECIMAL(5,2),
  total_clicks      BIGINT DEFAULT 0,
  unique_clicks     BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_earnings    DECIMAL(14,2) DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.affiliate_clicks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id      UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id),
  ip_address   INET,
  user_agent   TEXT,
  referrer     TEXT,
  country      TEXT,
  device_type  TEXT,
  session_id   TEXT,
  converted    BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.affiliate_commissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id      UUID NOT NULL REFERENCES public.affiliates(id),
  link_id           UUID REFERENCES public.affiliate_links(id),
  order_id          UUID NOT NULL REFERENCES public.orders(id),
  order_item_id     UUID REFERENCES public.order_items(id),
  product_id        UUID REFERENCES public.products(id),
  vendor_id         UUID REFERENCES public.vendors(id),
  commission_rate   DECIMAL(5,2) NOT NULL,
  order_amount      DECIMAL(14,2) NOT NULL,
  commission_amount DECIMAL(14,2) NOT NULL,
  status            payout_status DEFAULT 'pending',
  paid_at           TIMESTAMPTZ,
  payout_id         UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INFLUENCERS (migration 013 adds guidelines_accepted_at, 050 adds pending_balance)
-- ============================================================
CREATE TABLE public.influencers (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name           TEXT NOT NULL,
  niche                  TEXT[],
  bio                    TEXT,
  profile_image          TEXT,
  cover_image            TEXT,
  social_platforms       JSONB DEFAULT '{}',
  total_followers        BIGINT DEFAULT 0,
  engagement_rate        DECIMAL(5,2) DEFAULT 0,
  total_campaigns        INT DEFAULT 0,
  total_earnings         DECIMAL(14,2) DEFAULT 0,
  available_balance      DECIMAL(14,2) DEFAULT 0,
  rating                 DECIMAL(3,2) DEFAULT 0,
  is_verified            BOOLEAN DEFAULT FALSE,
  is_featured            BOOLEAN DEFAULT FALSE,
  is_active              BOOLEAN DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  guidelines_accepted_at TIMESTAMPTZ,   -- migration 013
  pending_balance        DECIMAL(14,2) DEFAULT 0  -- migration 050
);

-- ============================================================
-- UGC CAMPAIGN SYSTEM (migrations 042–050)
-- NOTE: viral_clips and influencer_campaigns were DROPPED in 042
-- ============================================================
CREATE TABLE public.ugc_campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  campaign_type        ugc_campaign_type NOT NULL DEFAULT 'clipping',
  status               ugc_campaign_status NOT NULL DEFAULT 'draft',
  rate_per_1k_views    DECIMAL NOT NULL DEFAULT 3.00,
  total_budget         DECIMAL NOT NULL DEFAULT 0,
  spent_budget         DECIMAL NOT NULL DEFAULT 0,
  max_payout_per_sub   DECIMAL DEFAULT 400,
  allowed_platforms    TEXT[] DEFAULT ARRAY['tiktok','instagram','youtube','x'],
  requires_face        BOOLEAN DEFAULT FALSE,
  submission_count     INT DEFAULT 0,
  approved_count       INT DEFAULT 0,
  total_views_tracked  BIGINT DEFAULT 0,
  starts_at            TIMESTAMPTZ,
  ends_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  min_duration         INT,
  max_duration         INT,
  required_hashtags    JSONB DEFAULT '[]',
  required_mentions    JSONB DEFAULT '[]',
  required_keywords    JSONB DEFAULT '[]',
  music_track_url      TEXT,
  music_artist_name    TEXT,
  promotion_target     TEXT,
  promotion_target_url TEXT,
  -- migration 049
  payment_model        ugc_payment_model DEFAULT 'per_views',
  fixed_rate           DECIMAL DEFAULT 0
);

CREATE TABLE public.ugc_campaign_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  type            ugc_media_type NOT NULL DEFAULT 'image',
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  usage           ugc_media_usage NOT NULL DEFAULT 'example',
  platform_format ugc_platform_format,
  order_index     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ugc_campaign_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  status        ugc_participation_status NOT NULL DEFAULT 'accepted',
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, influencer_id)
);

CREATE TABLE public.ugc_submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id        UUID NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  influencer_id      UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  post_url           TEXT NOT NULL,
  platform           ugc_platform NOT NULL,
  caption            TEXT,
  status             ugc_submission_status NOT NULL DEFAULT 'pending',
  rejection_reason   TEXT,
  reviewed_by        UUID REFERENCES public.profiles(id),
  reviewed_at        TIMESTAMPTZ,
  total_views_earned BIGINT DEFAULT 0,
  total_earnings     DECIMAL DEFAULT 0,
  last_synced_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  -- migration 045
  is_suspicious      BOOLEAN DEFAULT FALSE,
  fraud_score        DECIMAL(5,2) DEFAULT 0.00,
  UNIQUE(campaign_id, post_url)
);

CREATE TABLE public.ugc_submission_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  type            ugc_media_type NOT NULL DEFAULT 'video',
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration        INT,
  aspect_ratio    TEXT,
  platform_format ugc_platform_format,
  file_size       BIGINT,
  mime_type       TEXT,
  order_index     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ugc_view_snapshots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id          UUID NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  views_at_snapshot      BIGINT NOT NULL DEFAULT 0,
  delta_views            BIGINT NOT NULL DEFAULT 0,
  earnings_this_snapshot DECIMAL NOT NULL DEFAULT 0,
  snapshotted_at         TIMESTAMPTZ DEFAULT NOW(),
  likes                  BIGINT DEFAULT 0,
  comments               BIGINT DEFAULT 0,
  shares                 BIGINT DEFAULT 0,
  saves                  BIGINT DEFAULT 0
);

CREATE TABLE public.ugc_payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status        ugc_payout_status NOT NULL DEFAULT 'pending',
  paid_at       TIMESTAMPTZ,
  payout_id     UUID REFERENCES public.payouts(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ugc_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id),
  submission_id UUID REFERENCES public.ugc_submissions(id),
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT DEFAULT 'pending',
  reviewed_by   UUID REFERENCES public.profiles(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- migration 047
CREATE TABLE public.ugc_campaign_escrow (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL UNIQUE REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  deposited_by   UUID NOT NULL REFERENCES public.profiles(id),
  amount         DECIMAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'RWF',
  status         TEXT NOT NULL DEFAULT 'held',
  payment_method TEXT,
  payment_ref    TEXT,
  deposited_at   TIMESTAMPTZ DEFAULT NOW(),
  released_at    TIMESTAMPTZ
);

-- ============================================================
-- SHORT VIDEOS (replaces viral_clips, created as part of new system)
-- ============================================================
CREATE TABLE public.short_videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  video_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec  INT DEFAULT 0,
  product_id    UUID REFERENCES public.products(id),
  community_id  UUID,
  status        TEXT NOT NULL DEFAULT 'processing',
  view_count    BIGINT NOT NULL DEFAULT 0,
  like_count    BIGINT NOT NULL DEFAULT 0,
  click_count   BIGINT NOT NULL DEFAULT 0,
  total_earnings DECIMAL(14,4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_type    VARCHAR(50) DEFAULT 'product',
  external_link TEXT,
  comment_count INT DEFAULT 0
);

CREATE TABLE public.short_video_views (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       UUID NOT NULL REFERENCES public.short_videos(id) ON DELETE CASCADE,
  viewer_id      UUID,
  watch_time_sec INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, viewer_id)
);

CREATE TABLE public.short_video_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID NOT NULL REFERENCES public.short_videos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

CREATE TABLE public.short_video_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID NOT NULL REFERENCES public.short_videos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.short_video_clicks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES public.short_videos(id) ON DELETE CASCADE,
  user_id      UUID,
  product_id   UUID REFERENCES public.products(id),
  converted    BOOLEAN NOT NULL DEFAULT FALSE,
  order_id     UUID,
  community_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.short_video_earnings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES public.short_videos(id) ON DELETE CASCADE,
  creator_id   UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  amount       DECIMAL(14,4) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'RWF',
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMUNITIES (many migrations extend this)
-- ============================================================
CREATE TABLE public.communities (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  slug                     TEXT NOT NULL UNIQUE,
  tagline                  TEXT,
  description              TEXT,
  long_description         TEXT,
  avatar_url               TEXT,
  cover_image              TEXT,
  category                 TEXT,
  tags                     TEXT[],
  is_private               BOOLEAN DEFAULT FALSE,
  is_free                  BOOLEAN DEFAULT TRUE,
  monthly_price            DECIMAL DEFAULT 0,
  yearly_price             DECIMAL DEFAULT 0,
  lifetime_price           DECIMAL DEFAULT 0,
  currency                 TEXT DEFAULT 'USD',
  trial_days               INT DEFAULT 0,
  member_count             INT DEFAULT 0,
  space_count              INT DEFAULT 0,
  post_count               INT DEFAULT 0,
  is_featured              BOOLEAN DEFAULT FALSE,
  is_active                BOOLEAN DEFAULT TRUE,
  platform_commission_rate DECIMAL DEFAULT 15,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.spaces (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  color        TEXT,
  sort_order   INT DEFAULT 0,
  access_type  TEXT DEFAULT 'free',
  price        DECIMAL,
  currency     TEXT DEFAULT 'USD',
  room_count   INT DEFAULT 0,
  member_count INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, slug)
);

CREATE TABLE public.rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id     UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  sort_order   INT DEFAULT 0,
  room_type    TEXT NOT NULL DEFAULT 'chat',
  access_type  TEXT DEFAULT 'inherit',
  is_locked    BOOLEAN DEFAULT FALSE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, slug)
);

CREATE TABLE public.community_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id      UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role              TEXT DEFAULT 'member',
  plan_type         TEXT DEFAULT 'free',
  status            TEXT DEFAULT 'active',
  subscribed_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  payment_reference TEXT,
  payment_provider  TEXT,
  amount_paid       DECIMAL DEFAULT 0,
  space_access      UUID[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE TABLE public.community_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id        UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  membership_id       UUID NOT NULL REFERENCES public.community_memberships(id),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount              DECIMAL NOT NULL,
  currency            TEXT DEFAULT 'USD',
  plan_type           TEXT NOT NULL,
  payment_provider    TEXT,
  payment_reference   TEXT UNIQUE,
  platform_commission DECIMAL DEFAULT 0,
  creator_earnings    DECIMAL DEFAULT 0,
  status              TEXT DEFAULT 'pending',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.community_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  space_id      UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  community_id  UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT,
  body          TEXT NOT NULL,
  post_type     TEXT DEFAULT 'discussion',
  images        JSONB DEFAULT '[]',
  attachments   JSONB DEFAULT '[]',
  video_url     TEXT,
  like_count    INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count    INT DEFAULT 0,
  is_pinned     BOOLEAN DEFAULT FALSE,
  is_exclusive  BOOLEAN DEFAULT FALSE,
  is_published  BOOLEAN DEFAULT TRUE,
  published_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.community_post_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  like_count  INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.community_post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.community_saved_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- migration 029: reactions and reply_count on messages
CREATE TABLE public.community_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT DEFAULT '',
  message_type TEXT DEFAULT 'text',
  thread_id    UUID REFERENCES public.community_messages(id),
  reply_count  INT DEFAULT 0,
  attachments  JSONB DEFAULT '[]',
  reactions    JSONB DEFAULT '{}',
  is_pinned    BOOLEAN DEFAULT FALSE,
  is_edited    BOOLEAN DEFAULT FALSE,
  edited_at    TIMESTAMPTZ,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- migration 030: community inbox
CREATE TABLE public.community_inbox_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_low     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_high    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_low < user_high),
  UNIQUE(community_id, user_low, user_high)
);

CREATE TABLE public.community_inbox_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.community_inbox_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL DEFAULT '',
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  attachments     JSONB DEFAULT '[]',
  message_type    TEXT DEFAULT 'text',
  reactions       JSONB DEFAULT '{}'
);

CREATE TABLE public.community_courses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  community_id   UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  creator_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  thumbnail_url  TEXT,
  total_modules  INT DEFAULT 0,
  total_lessons  INT DEFAULT 0,
  total_duration INT DEFAULT 0,
  difficulty     TEXT DEFAULT 'beginner',
  is_published   BOOLEAN DEFAULT FALSE,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.course_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INT DEFAULT 0,
  is_free     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.course_lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  video_url   TEXT,
  duration    INT DEFAULT 0,
  sort_order  INT DEFAULT 0,
  is_free     BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lesson_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  watch_time   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE public.community_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  community_id     UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  creator_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  task_type        TEXT DEFAULT 'daily',
  difficulty       TEXT DEFAULT 'easy',
  points           INT DEFAULT 10,
  is_recurring     BOOLEAN DEFAULT FALSE,
  recurrence_days  INT DEFAULT 1,
  due_date         TIMESTAMPTZ,
  completion_count INT DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.task_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.community_tasks(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_text   TEXT,
  proof_url    TEXT,
  status       TEXT DEFAULT 'submitted',
  points_earned INT DEFAULT 0,
  reviewed_by  UUID REFERENCES public.profiles(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE TABLE public.member_points (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id   UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  total_points   INT DEFAULT 0,
  level          INT DEFAULT 1,
  streak_days    INT DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, community_id)
);

-- ============================================================
-- MESSAGING (migration 007 creates, 017 extends)
-- ============================================================
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID NOT NULL REFERENCES public.profiles(id),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, vendor_id)
);

-- migration 017 adds message_type, reply_to_id, metadata
CREATE TABLE public.conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_type    TEXT NOT NULL DEFAULT 'text',
  reply_to_id     UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- B2B LEADS (migration 006)
-- ============================================================
CREATE TABLE public.buying_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES public.profiles(id),
  product_name     TEXT NOT NULL,
  category         TEXT,
  quantity_needed  DECIMAL NOT NULL DEFAULT 1,
  budget_min       DECIMAL,
  budget_max       DECIMAL,
  delivery_country TEXT,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.buying_lead_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_request_id UUID NOT NULL REFERENCES public.buying_requests(id) ON DELETE CASCADE,
  vendor_id         UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  message           TEXT,
  offered_price     DECIMAL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SHOPIFY CREDENTIALS
-- ============================================================
CREATE TABLE public.shopify_credentials (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id                UUID NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  shop_domain              TEXT NOT NULL,
  access_token             TEXT NOT NULL,
  api_version              TEXT NOT NULL DEFAULT '2024-07',
  platform_commission_rate DECIMAL NOT NULL DEFAULT 8,
  connected_at             TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at           TIMESTAMPTZ,
  is_active                BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_slug ON public.vendors(business_slug);
CREATE INDEX idx_vendors_verification ON public.vendors(verification_status);
CREATE INDEX idx_vendor_followers_count ON public.vendor_followers(vendor_id);
CREATE INDEX idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_type ON public.products(product_type);
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_source ON public.products(source);
CREATE INDEX idx_products_search ON public.products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_integration_source ON public.orders(integration_source);
CREATE INDEX idx_orders_payment_batch_id ON public.orders(payment_batch_id);
CREATE INDEX idx_orders_pesapal ON public.orders(pesapal_tracking_id) WHERE pesapal_tracking_id IS NOT NULL;
CREATE INDEX idx_orders_nowpayments ON public.orders(nowpayments_payment_id) WHERE nowpayments_payment_id IS NOT NULL;
CREATE INDEX idx_orders_flutterwave_tx_ref ON public.orders(flutterwave_tx_ref) WHERE flutterwave_tx_ref IS NOT NULL;
CREATE INDEX idx_orders_paypal_order_id ON public.orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_order_items_product_source ON public.order_items(product_source);
CREATE INDEX idx_order_items_product_type ON public.order_items(product_type);
CREATE INDEX idx_order_items_pricing_type ON public.order_items(pricing_type);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_affiliate_links_affiliate_id ON public.affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_links_product_id ON public.affiliate_links(product_id);
CREATE INDEX idx_affiliate_clicks_link_id ON public.affiliate_clicks(link_id);
CREATE INDEX idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at DESC);
CREATE INDEX idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX idx_ugc_campaigns_brand_id ON public.ugc_campaigns(brand_id);
CREATE INDEX idx_ugc_campaigns_status ON public.ugc_campaigns(status);
CREATE INDEX idx_ugc_campaigns_type ON public.ugc_campaigns(campaign_type);
CREATE INDEX idx_ugc_submissions_campaign_id ON public.ugc_submissions(campaign_id);
CREATE INDEX idx_ugc_submissions_influencer_id ON public.ugc_submissions(influencer_id);
CREATE INDEX idx_ugc_submissions_status ON public.ugc_submissions(status);
CREATE INDEX idx_ugc_sub_created_at ON public.ugc_submissions(created_at DESC);
CREATE INDEX idx_ugc_media_camp_id ON public.ugc_campaign_media(campaign_id);
CREATE INDEX idx_ugc_parts_camp_id ON public.ugc_campaign_participants(campaign_id);
CREATE INDEX idx_ugc_parts_inf_id ON public.ugc_campaign_participants(influencer_id);
CREATE INDEX idx_ugc_media_sub_id ON public.ugc_submission_media(submission_id);
CREATE INDEX idx_ugc_view_snapshots_submission_id ON public.ugc_view_snapshots(submission_id);
CREATE INDEX idx_ugc_view_snapshots_at ON public.ugc_view_snapshots(snapshotted_at DESC);
CREATE INDEX idx_ugc_payouts_sub_id ON public.ugc_payouts(submission_id);
CREATE INDEX idx_ugc_payouts_inf_id ON public.ugc_payouts(influencer_id);
CREATE INDEX idx_ugc_payouts_status ON public.ugc_payouts(status);
CREATE INDEX idx_ugc_payouts_created_at ON public.ugc_payouts(created_at DESC);
CREATE INDEX idx_ugc_reports_submission_id ON public.ugc_reports(submission_id);
CREATE INDEX idx_ugc_reports_status ON public.ugc_reports(status);
CREATE INDEX idx_short_videos_creator ON public.short_videos(creator_id);
CREATE INDEX idx_short_videos_user ON public.short_videos(user_id);
CREATE INDEX idx_short_videos_product ON public.short_videos(product_id);
CREATE INDEX idx_short_videos_status ON public.short_videos(status);
CREATE INDEX idx_short_videos_community ON public.short_videos(community_id);
CREATE INDEX idx_svviews_video ON public.short_video_views(video_id);
CREATE INDEX idx_svviews_viewer ON public.short_video_views(viewer_id);
CREATE INDEX idx_svlikes_video ON public.short_video_likes(video_id);
CREATE INDEX idx_svclicks_video ON public.short_video_clicks(video_id);
CREATE INDEX idx_svclicks_product ON public.short_video_clicks(product_id);
CREATE INDEX idx_svearnings_video ON public.short_video_earnings(video_id);
CREATE INDEX idx_svearnings_creator ON public.short_video_earnings(creator_id);
CREATE INDEX idx_communities_slug ON public.communities(slug);
CREATE INDEX idx_communities_owner ON public.communities(owner_id);
CREATE INDEX idx_spaces_community ON public.spaces(community_id);
CREATE INDEX idx_rooms_community ON public.rooms(community_id);
CREATE INDEX idx_rooms_space ON public.rooms(space_id);
CREATE INDEX idx_rooms_room_type ON public.rooms(room_type);
CREATE INDEX idx_memberships_community ON public.community_memberships(community_id);
CREATE INDEX idx_memberships_user ON public.community_memberships(user_id);
CREATE INDEX idx_memberships_status ON public.community_memberships(status);
CREATE INDEX idx_payments_community ON public.community_payments(community_id);
CREATE INDEX idx_payments_user ON public.community_payments(user_id);
CREATE INDEX idx_posts_community ON public.community_posts(community_id);
CREATE INDEX idx_posts_room ON public.community_posts(room_id);
CREATE INDEX idx_posts_author ON public.community_posts(author_id);
CREATE INDEX idx_post_comments_post ON public.community_post_comments(post_id);
CREATE INDEX idx_post_likes_post ON public.community_post_likes(post_id);
CREATE INDEX idx_saved_posts_user ON public.community_saved_posts(user_id);
CREATE INDEX idx_messages_room ON public.community_messages(room_id);
CREATE INDEX idx_messages_community ON public.community_messages(community_id);
CREATE INDEX idx_messages_thread ON public.community_messages(thread_id);
CREATE INDEX idx_messages_created ON public.community_messages(created_at);
CREATE INDEX idx_community_inbox_conv_community ON public.community_inbox_conversations(community_id);
CREATE INDEX idx_community_inbox_msg_conv ON public.community_inbox_messages(conversation_id, created_at);
CREATE INDEX idx_courses_room ON public.community_courses(room_id);
CREATE INDEX idx_modules_course ON public.course_modules(course_id);
CREATE INDEX idx_lessons_course ON public.course_lessons(course_id);
CREATE INDEX idx_lessons_module ON public.course_lessons(module_id);
CREATE INDEX idx_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX idx_tasks_room ON public.community_tasks(room_id);
CREATE INDEX idx_completions_task ON public.task_completions(task_id);
CREATE INDEX idx_completions_user ON public.task_completions(user_id);
CREATE INDEX idx_points_user ON public.member_points(user_id);
CREATE INDEX idx_points_community ON public.member_points(community_id);
CREATE INDEX idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX idx_conversations_vendor ON public.conversations(vendor_id);
CREATE INDEX idx_conversation_messages_conversation ON public.conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_created ON public.conversation_messages(conversation_id, created_at);
CREATE INDEX idx_conversation_messages_reply_to ON public.conversation_messages(reply_to_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_buying_requests_buyer ON public.buying_requests(buyer_id);
CREATE INDEX idx_buying_requests_status ON public.buying_requests(status);
CREATE INDEX idx_buying_lead_offers_request ON public.buying_lead_offers(buying_request_id);
CREATE INDEX idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX idx_product_views_created_at ON public.product_views(created_at DESC);
CREATE INDEX platform_settings_updated_at_idx ON public.platform_settings(updated_at DESC);
CREATE INDEX blog_posts_published_idx ON public.blog_posts(is_published, published_at DESC);
CREATE INDEX idx_shopify_creds_domain ON public.shopify_credentials(shop_domain);
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at    BEFORE UPDATE ON public.profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at     BEFORE UPDATE ON public.vendors     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at    BEFORE UPDATE ON public.products    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at      BEFORE UPDATE ON public.orders      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliates_updated_at  BEFORE UPDATE ON public.affiliates  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- migration 002: robust handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- product rating trigger (fixed for DELETE)
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE target_product_id UUID;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
  SET rating       = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE product_id = target_product_id),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = target_product_id)
  WHERE id = target_product_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- vendor rating trigger
CREATE OR REPLACE FUNCTION public.update_vendor_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.vendor_id, OLD.vendor_id) IS NOT NULL THEN
    UPDATE public.vendors
    SET rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
    WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vendor_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_vendor_overall_rating();

-- vendor follower count trigger (migration 004)
CREATE OR REPLACE FUNCTION public.update_vendor_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.vendors SET follower_count = follower_count + 1 WHERE id = NEW.vendor_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.vendors SET follower_count = follower_count - 1 WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vendor_follower_change
  AFTER INSERT OR DELETE ON public.vendor_followers
  FOR EACH ROW EXECUTE FUNCTION public.update_vendor_follower_count();

-- order totals trigger (migration 036)
CREATE OR REPLACE FUNCTION public.update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET subtotal     = (SELECT COALESCE(SUM(total_price), 0) FROM public.order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)),
      total_amount = (SELECT COALESCE(SUM(total_price), 0) FROM public.order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)),
      updated_at   = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_totals();

-- task completion count trigger (migration 028)
CREATE OR REPLACE FUNCTION public.bump_community_task_completion_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.community_tasks SET completion_count = COALESCE(completion_count, 0) + 1 WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_task_completions_bump_count
  AFTER INSERT ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.bump_community_task_completion_count();

-- message reply count trigger (migration 029)
CREATE OR REPLACE FUNCTION public.bump_parent_message_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE public.community_messages SET reply_count = COALESCE(reply_count, 0) + 1 WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_community_messages_bump_reply
  AFTER INSERT ON public.community_messages
  FOR EACH ROW EXECUTE PROCEDURE public.bump_parent_message_reply_count();

-- conversation message notification trigger (migration 017)
CREATE OR REPLACE FUNCTION notify_conversation_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conv RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_preview TEXT;
BEGIN
  SELECT buyer_id, vendor_id INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id = v_conv.buyer_id THEN
    v_recipient_id := (SELECT user_id FROM public.vendors WHERE id = v_conv.vendor_id);
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;
  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_preview := COALESCE(LEFT(NEW.body, 80), 'New message');
  IF NEW.message_type = 'product'       THEN v_preview := 'Shared a product'; END IF;
  IF NEW.message_type = 'quote_request' THEN v_preview := 'Quote request'; END IF;
  IF NEW.message_type = 'quote_reply'   THEN v_preview := 'Sent an offer'; END IF;
  IF NEW.message_type IN ('image','file') THEN v_preview := 'Sent an attachment'; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_recipient_id, 'message', COALESCE(v_sender_name, 'Someone') || ' sent a message', v_preview, '/dashboard/messages?conversation=' || NEW.conversation_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_conversation_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION notify_conversation_message();

-- toggle reaction RPC (migration 029)
CREATE OR REPLACE FUNCTION public.toggle_community_message_reaction(p_message_id UUID, p_emoji TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_community_id UUID; v_reactions JSONB;
  v_uid UUID := auth.uid();
  emj TEXT; arr JSONB; new_arr JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  emj := nullif(trim(p_emoji), '');
  IF emj IS NULL OR length(emj) > 32 THEN RAISE EXCEPTION 'invalid emoji'; END IF;
  SELECT cm.community_id, cm.reactions INTO v_community_id, v_reactions
  FROM public.community_messages cm WHERE cm.id = p_message_id AND cm.is_deleted = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_memberships m WHERE m.community_id = v_community_id AND m.user_id = v_uid AND m.status = 'active') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  IF jsonb_typeof(v_reactions) != 'object' THEN v_reactions := '{}'::jsonb; END IF;
  arr := v_reactions -> emj;
  IF arr IS NULL OR jsonb_typeof(arr) != 'array' THEN arr := '[]'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(arr) AS t(x) WHERE t.x = v_uid::text) THEN
    SELECT CASE WHEN count(*) = 0 THEN NULL ELSE jsonb_agg(to_jsonb(x)) END INTO new_arr
    FROM (SELECT x FROM jsonb_array_elements_text(arr) AS t(x) WHERE x IS DISTINCT FROM v_uid::text) s;
    IF new_arr IS NULL OR jsonb_array_length(new_arr) = 0 THEN v_reactions := v_reactions - emj;
    ELSE v_reactions := jsonb_set(v_reactions, ARRAY[emj], new_arr, true); END IF;
  ELSE
    arr := arr || jsonb_build_array(v_uid::text);
    v_reactions := jsonb_set(v_reactions, ARRAY[emj], arr, true);
  END IF;
  UPDATE public.community_messages SET reactions = v_reactions WHERE id = p_message_id;
  RETURN v_reactions;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_community_message_reaction(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_community_message_reaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_community_message_reaction(UUID, TEXT) TO service_role;

-- community inbox RPC (migration 030)
CREATE OR REPLACE FUNCTION public.get_or_create_community_inbox_conversation(p_community_id UUID, p_peer_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid(); v_low UUID; v_high UUID; v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_peer_id = v_uid THEN RAISE EXCEPTION 'invalid peer'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_memberships WHERE community_id = p_community_id AND user_id = v_uid AND status = 'active') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_memberships WHERE community_id = p_community_id AND user_id = p_peer_id AND status = 'active') THEN
    RAISE EXCEPTION 'peer not in community';
  END IF;
  v_low := LEAST(v_uid, p_peer_id);
  v_high := GREATEST(v_uid, p_peer_id);
  INSERT INTO public.community_inbox_conversations (community_id, user_low, user_high)
  VALUES (p_community_id, v_low, v_high)
  ON CONFLICT (community_id, user_low, user_high) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_community_inbox_conversation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_community_inbox_conversation(UUID, UUID) TO authenticated;

-- get_user_roles RPC (migration 040 — final version)
CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  roles_out TEXT[] := ARRAY['buyer'::TEXT];
  rec RECORD;
BEGIN
  FOR rec IN (SELECT role::TEXT AS r FROM public.user_roles WHERE user_id = lookup_user_id AND is_active = TRUE) LOOP
    IF NOT (rec.r = ANY(roles_out)) THEN roles_out := array_append(roles_out, rec.r); END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.vendors WHERE user_id = lookup_user_id) THEN
    IF NOT ('vendor' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'vendor'::TEXT); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = lookup_user_id) THEN
    IF NOT ('affiliate' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'affiliate'::TEXT); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.influencers WHERE user_id = lookup_user_id) THEN
    IF NOT ('influencer' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'influencer'::TEXT); END IF;
  END IF;
  RETURN roles_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO anon;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_lead_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own roles" ON public.user_roles FOR ALL USING (auth.uid() = user_id);

-- VENDORS
CREATE POLICY "Vendors are publicly viewable" ON public.vendors FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create vendor profile" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- VENDOR FOLLOWERS
CREATE POLICY "Followers are publicly viewable" ON public.vendor_followers FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON public.vendor_followers FOR ALL USING (auth.uid() = user_id);

-- PRODUCT CATEGORIES
CREATE POLICY "Product categories are readable by everyone" ON public.product_categories FOR SELECT USING (true);

-- PRODUCTS
CREATE POLICY "Active products are publicly viewable" ON public.products FOR SELECT USING (status = 'active' AND is_active = true);
CREATE POLICY "Vendors can manage own products" ON public.products FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- PRODUCT VARIANTS
CREATE POLICY "Product variants are publicly viewable" ON public.product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors can manage own variants" ON public.product_variants FOR ALL USING (
  product_id IN (SELECT id FROM public.products WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);

-- ORDERS
CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Vendors can view their orders" ON public.orders FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own orders" ON public.orders FOR UPDATE USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can delete own pending orders" ON public.orders FOR DELETE USING (auth.uid() = buyer_id AND status = 'pending');

-- ORDER ITEMS
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);
CREATE POLICY "Vendors can view order items for their products" ON public.order_items FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Buyers can insert own order items" ON public.order_items FOR INSERT WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);
CREATE POLICY "Buyers can update own order items" ON public.order_items FOR UPDATE USING (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);
CREATE POLICY "Buyers can delete own order items" ON public.order_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND buyer_id = auth.uid() AND status = 'pending')
);

-- REVIEWS
CREATE POLICY "Reviews are publicly viewable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can manage own reviews" ON public.reviews FOR ALL USING (auth.uid() = buyer_id);

-- WISHLISTS
CREATE POLICY "Users can manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- AFFILIATES
CREATE POLICY "Affiliate profiles are publicly viewable" ON public.affiliates FOR SELECT USING (is_active = true);
CREATE POLICY "Affiliates can manage own profile" ON public.affiliates FOR ALL USING (auth.uid() = user_id);

-- AFFILIATE LINKS
CREATE POLICY "Affiliate links are publicly viewable" ON public.affiliate_links FOR SELECT USING (is_active = true);
CREATE POLICY "Affiliates can manage own links" ON public.affiliate_links FOR ALL USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

-- AFFILIATE CLICKS
CREATE POLICY "Affiliates can view own clicks" ON public.affiliate_clicks FOR SELECT USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

-- AFFILIATE COMMISSIONS
CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

-- INFLUENCERS
CREATE POLICY "Influencer profiles are publicly viewable" ON public.influencers FOR SELECT USING (is_active = true);
CREATE POLICY "Influencers can manage own profile" ON public.influencers FOR ALL USING (auth.uid() = user_id);

-- UGC CAMPAIGNS
CREATE POLICY "Active ugc campaigns are publicly viewable" ON public.ugc_campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Vendors can manage own ugc campaigns" ON public.ugc_campaigns FOR ALL USING (
  brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- UGC SUBMISSIONS
CREATE POLICY "Influencers can manage own submissions" ON public.ugc_submissions FOR ALL USING (
  influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
);

-- COMMUNITIES
CREATE POLICY "Public communities are viewable" ON public.communities FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own communities" ON public.communities FOR ALL USING (auth.uid() = owner_id);

-- COMMUNITY MEMBERSHIPS (migration 027: fixed recursion)
CREATE POLICY "memberships_select_own_or_staff" ON public.community_memberships FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_memberships.community_id AND c.owner_id = auth.uid())
);
CREATE POLICY "Users can manage own membership" ON public.community_memberships FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memberships_update_own_or_staff" ON public.community_memberships FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_memberships.community_id AND c.owner_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_memberships.community_id AND c.owner_id = auth.uid()));

-- COMMUNITY POSTS
CREATE POLICY "Community posts viewable by members" ON public.community_posts FOR SELECT USING (
  is_published = true AND (
    NOT (SELECT is_private FROM public.communities WHERE id = community_id) OR
    community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active') OR
    community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
  )
);
CREATE POLICY "Members can create posts" ON public.community_posts FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
);

-- COMMUNITY MESSAGES
CREATE POLICY "Members can view community messages" ON public.community_messages FOR SELECT USING (
  community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
  OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
);
CREATE POLICY "Members can send community messages" ON public.community_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
);

-- COMMUNITY INBOX (migration 030)
CREATE POLICY "community_inbox_conv_select_participant" ON public.community_inbox_conversations FOR SELECT USING (
  (auth.uid() = user_low OR auth.uid() = user_high)
  AND EXISTS (SELECT 1 FROM public.community_memberships m WHERE m.community_id = community_inbox_conversations.community_id AND m.user_id = auth.uid() AND m.status = 'active')
);
CREATE POLICY "community_inbox_conv_insert_participant" ON public.community_inbox_conversations FOR INSERT WITH CHECK (
  (auth.uid() = user_low OR auth.uid() = user_high)
  AND EXISTS (SELECT 1 FROM public.community_memberships m WHERE m.community_id = community_inbox_conversations.community_id AND m.user_id = auth.uid() AND m.status = 'active')
);
CREATE POLICY "community_inbox_conv_update_participant" ON public.community_inbox_conversations FOR UPDATE USING (auth.uid() = user_low OR auth.uid() = user_high);
CREATE POLICY "community_inbox_msg_select_participant" ON public.community_inbox_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_inbox_conversations c WHERE c.id = community_inbox_messages.conversation_id AND (c.user_low = auth.uid() OR c.user_high = auth.uid()))
);
CREATE POLICY "community_inbox_msg_insert_sender" ON public.community_inbox_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.community_inbox_conversations c WHERE c.id = community_inbox_messages.conversation_id AND (c.user_low = auth.uid() OR c.user_high = auth.uid()))
);

-- TASK COMPLETIONS (migration 028)
CREATE POLICY "task_completions_select_own_or_staff" ON public.task_completions FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.community_tasks t JOIN public.community_memberships m ON m.community_id = t.community_id WHERE t.id = task_completions.task_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('owner', 'admin', 'moderator'))
  OR EXISTS (SELECT 1 FROM public.community_tasks t JOIN public.communities c ON c.id = t.community_id WHERE t.id = task_completions.task_id AND c.owner_id = auth.uid())
);
CREATE POLICY "task_completions_update_reviewer" ON public.task_completions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.community_tasks t JOIN public.community_memberships m ON m.community_id = t.community_id WHERE t.id = task_completions.task_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('owner', 'admin', 'moderator'))
  OR EXISTS (SELECT 1 FROM public.community_tasks t JOIN public.communities c ON c.id = t.community_id WHERE t.id = task_completions.task_id AND c.owner_id = auth.uid())
);

-- NOTIFICATIONS
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- PAYOUTS
CREATE POLICY "Users can view own payouts" ON public.payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payouts" ON public.payouts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- WALLETS
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- BUYING REQUESTS
CREATE POLICY "Users can manage own buying requests" ON public.buying_requests FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can view offers on their requests" ON public.buying_lead_offers FOR SELECT USING (
  buying_request_id IN (SELECT id FROM public.buying_requests WHERE buyer_id = auth.uid())
);
CREATE POLICY "Vendors can insert offers" ON public.buying_lead_offers FOR INSERT WITH CHECK (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can update own offers" ON public.buying_lead_offers FOR UPDATE USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- CONVERSATIONS (migrations 007, 017)
CREATE POLICY "Buyers can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors can view conversations with them" ON public.conversations FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can update own conversations" ON public.conversations FOR UPDATE USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Participants can read messages" ON public.conversation_messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM public.conversations WHERE buyer_id = auth.uid() OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);
CREATE POLICY "Participants can insert messages" ON public.conversation_messages FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM public.conversations WHERE buyer_id = auth.uid() OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);

-- PLATFORM SETTINGS & BLOG
CREATE POLICY "platform_settings_select_public" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blog_posts_select_published" ON public.blog_posts FOR SELECT TO anon, authenticated USING (is_published = true);

-- ============================================================
-- SEED: Platform settings
-- ============================================================
INSERT INTO public.platform_settings (key, value) VALUES
  ('fees', jsonb_build_object('min_payout_rwf', 50, 'default_affiliate_commission_percent', 5, 'shopify_default_platform_commission_percent', 8, 'platform_fee_percent', 5, 'platform_fee_fixed_rwf', 0)),
  ('supplier_sources', jsonb_build_object('vendor', jsonb_build_object('enabled', true, 'platform_commission_percent', 5), 'shopify', jsonb_build_object('enabled', true, 'platform_commission_percent', 8), 'cj', jsonb_build_object('enabled', true, 'platform_commission_percent', 8)))
ON CONFLICT (key) DO NOTHING;

-- migration: create_digital_access_table.sql

create table public.digital_access (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  order_item_id  uuid references public.order_items(id) on delete set null,
  order_id       uuid references public.orders(id) on delete set null,
  access_url     text,
  subtype        text,                    -- "software" | "course" | "ebook" | null
  granted_at     timestamptz not null default now(),
  expires_at     timestamptz,             -- null = lifetime, set for subscriptions
  revoked_at     timestamptz,             -- set on refund/cancellation
  revoke_reason  text,                    -- "refunded" | "subscription_expired" | "manual"

  unique(user_id, product_id)
);

-- Indexes
create index idx_digital_access_user_id    on public.digital_access(user_id);
create index idx_digital_access_product_id on public.digital_access(product_id);
create index idx_digital_access_order_id   on public.digital_access(order_id);
create index idx_digital_access_active     on public.digital_access(user_id)
  where revoked_at is null;

-- RLS
alter table public.digital_access enable row level security;

create policy "Users can read own digital access"
  on public.digital_access for select
  using (auth.uid() = user_id);

create policy "Service role can manage digital access"
  on public.digital_access for all
  using (auth.role() = 'service_role');

 CREATE TABLE IF NOT EXISTS public.failed_wallet_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RWF',
  reason text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),

 )

 CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_wallet_id uuid, p_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.wallets 
  SET available_balance = available_balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;
END;
$$;

-- ============================================================
-- JIMVIO — FOLLOW-UP MIGRATION (idempotent, safe to re-run)
-- Fixes RLS gaps, missing FKs, missing indexes, realtime,
-- payment_status standardization, and order_status_history access.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RECREATE failed_wallet_credits CLEANLY
--    Original had syntax error (trailing comma + dangling paren).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.failed_wallet_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  vendor_id   UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'RWF',
  reason      TEXT,
  resolved    BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.failed_wallet_credits
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_failed_wallet_credits_unresolved
  ON public.failed_wallet_credits(created_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_failed_wallet_credits_vendor
  ON public.failed_wallet_credits(vendor_id);

-- ============================================================
-- 2. ENABLE RLS ON PREVIOUSLY-UNPROTECTED TABLES
-- ============================================================

ALTER TABLE public.order_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_credentials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_wallet_credits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_videos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_video_views      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_video_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_video_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_video_clicks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_video_earnings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_saved_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_points           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_media         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_submission_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_view_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_escrow        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. POLICIES — order_status_history
-- ============================================================

DROP POLICY IF EXISTS "buyers_view_own_order_history"   ON public.order_status_history;
DROP POLICY IF EXISTS "vendors_view_their_order_history" ON public.order_status_history;

CREATE POLICY "buyers_view_own_order_history"
  ON public.order_status_history FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
  );

CREATE POLICY "vendors_view_their_order_history"
  ON public.order_status_history FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- 4. POLICIES — shopify_credentials (CRITICAL — contains tokens)
-- ============================================================

DROP POLICY IF EXISTS "vendors_view_own_shopify_creds"  ON public.shopify_credentials;
DROP POLICY IF EXISTS "vendors_manage_own_shopify_creds" ON public.shopify_credentials;
DROP POLICY IF EXISTS "service_role_manages_shopify_creds" ON public.shopify_credentials;

CREATE POLICY "vendors_view_own_shopify_creds"
  ON public.shopify_credentials FOR SELECT
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "vendors_manage_own_shopify_creds"
  ON public.shopify_credentials FOR ALL
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ============================================================
-- 5. POLICIES — failed_wallet_credits (vendor read-only)
-- ============================================================

DROP POLICY IF EXISTS "vendors_view_own_failed_credits" ON public.failed_wallet_credits;

CREATE POLICY "vendors_view_own_failed_credits"
  ON public.failed_wallet_credits FOR SELECT
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ============================================================
-- 6. POLICIES — webhook_events (no client access; service role only)
--    With RLS enabled and no policies, anon/auth get nothing,
--    but service_role bypasses RLS anyway. Explicit deny isn't
--    needed; just leaving with zero policies is correct.
-- ============================================================

-- (intentionally no policies)

-- ============================================================
-- 7. POLICIES — exchange_rate_logs (read-only public)
-- ============================================================

DROP POLICY IF EXISTS "exchange_rates_public_read" ON public.exchange_rate_logs;

CREATE POLICY "exchange_rates_public_read"
  ON public.exchange_rate_logs FOR SELECT
  USING (true);

-- ============================================================
-- 8. POLICIES — product_views (vendor analytics)
-- ============================================================

DROP POLICY IF EXISTS "anyone_can_log_product_view" ON public.product_views;
DROP POLICY IF EXISTS "vendors_view_own_product_views" ON public.product_views;

CREATE POLICY "anyone_can_log_product_view"
  ON public.product_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "vendors_view_own_product_views"
  ON public.product_views FOR SELECT
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      WHERE p.vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- 9. POLICIES — short_videos and engagement tables
-- ============================================================

DROP POLICY IF EXISTS "active_short_videos_public" ON public.short_videos;
DROP POLICY IF EXISTS "creators_manage_own_videos" ON public.short_videos;

CREATE POLICY "active_short_videos_public"
  ON public.short_videos FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "creators_manage_own_videos"
  ON public.short_videos FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "anyone_logs_view"     ON public.short_video_views;
DROP POLICY IF EXISTS "creators_read_views"  ON public.short_video_views;

CREATE POLICY "anyone_logs_view"
  ON public.short_video_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "creators_read_views"
  ON public.short_video_views FOR SELECT
  USING (
    video_id IN (SELECT id FROM public.short_videos WHERE user_id = auth.uid())
    OR viewer_id = auth.uid()
  );

DROP POLICY IF EXISTS "users_manage_own_likes" ON public.short_video_likes;
DROP POLICY IF EXISTS "likes_public_read"      ON public.short_video_likes;

CREATE POLICY "likes_public_read"
  ON public.short_video_likes FOR SELECT USING (true);

CREATE POLICY "users_manage_own_likes"
  ON public.short_video_likes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_public_read"      ON public.short_video_comments;
DROP POLICY IF EXISTS "users_manage_own_comments" ON public.short_video_comments;

CREATE POLICY "comments_public_read"
  ON public.short_video_comments FOR SELECT USING (true);

CREATE POLICY "users_manage_own_comments"
  ON public.short_video_comments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "anyone_logs_clicks"     ON public.short_video_clicks;
DROP POLICY IF EXISTS "creators_read_clicks"   ON public.short_video_clicks;

CREATE POLICY "anyone_logs_clicks"
  ON public.short_video_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "creators_read_clicks"
  ON public.short_video_clicks FOR SELECT
  USING (
    video_id IN (SELECT id FROM public.short_videos WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "creators_view_own_earnings" ON public.short_video_earnings;

CREATE POLICY "creators_view_own_earnings"
  ON public.short_video_earnings FOR SELECT
  USING (
    creator_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  );

-- ============================================================
-- 10. POLICIES — community structure (spaces, rooms, etc.)
-- ============================================================

DROP POLICY IF EXISTS "spaces_visible_to_members" ON public.spaces;
DROP POLICY IF EXISTS "owners_manage_spaces"      ON public.spaces;

CREATE POLICY "spaces_visible_to_members"
  ON public.spaces FOR SELECT
  USING (
    is_active = true AND (
      community_id IN (SELECT id FROM public.communities WHERE NOT is_private OR owner_id = auth.uid())
      OR community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "owners_manage_spaces"
  ON public.spaces FOR ALL
  USING (community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()))
  WITH CHECK (community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "rooms_visible_to_members" ON public.rooms;
DROP POLICY IF EXISTS "owners_manage_rooms"      ON public.rooms;

CREATE POLICY "rooms_visible_to_members"
  ON public.rooms FOR SELECT
  USING (
    is_active = true AND (
      community_id IN (SELECT id FROM public.communities WHERE NOT is_private OR owner_id = auth.uid())
      OR community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "owners_manage_rooms"
  ON public.rooms FOR ALL
  USING (community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()))
  WITH CHECK (community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "users_view_own_payments"      ON public.community_payments;
DROP POLICY IF EXISTS "owners_view_community_payments" ON public.community_payments;

CREATE POLICY "users_view_own_payments"
  ON public.community_payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "owners_view_community_payments"
  ON public.community_payments FOR SELECT
  USING (community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "post_comments_visible_to_members" ON public.community_post_comments;
DROP POLICY IF EXISTS "members_create_comments"          ON public.community_post_comments;
DROP POLICY IF EXISTS "authors_manage_own_comments"      ON public.community_post_comments;

CREATE POLICY "post_comments_visible_to_members"
  ON public.community_post_comments FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.community_posts
      WHERE community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
        OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "members_create_comments"
  ON public.community_post_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND post_id IN (
      SELECT id FROM public.community_posts
      WHERE community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "authors_manage_own_comments"
  ON public.community_post_comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_public_read" ON public.community_post_likes;
DROP POLICY IF EXISTS "users_manage_own_likes" ON public.community_post_likes;

CREATE POLICY "post_likes_public_read"
  ON public.community_post_likes FOR SELECT USING (true);

CREATE POLICY "users_manage_own_likes"
  ON public.community_post_likes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_saved_posts" ON public.community_saved_posts;

CREATE POLICY "users_manage_own_saved_posts"
  ON public.community_saved_posts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "courses_visible_to_members" ON public.community_courses;
DROP POLICY IF EXISTS "creators_manage_courses"    ON public.community_courses;

CREATE POLICY "courses_visible_to_members"
  ON public.community_courses FOR SELECT
  USING (
    is_published = true AND (
      community_id IN (SELECT id FROM public.communities WHERE NOT is_private OR owner_id = auth.uid())
      OR community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "creators_manage_courses"
  ON public.community_courses FOR ALL
  USING (creator_id = auth.uid() OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "modules_follow_course_access" ON public.course_modules;

CREATE POLICY "modules_follow_course_access"
  ON public.course_modules FOR SELECT
  USING (
    course_id IN (SELECT id FROM public.community_courses WHERE is_published = true)
    OR course_id IN (SELECT id FROM public.community_courses WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "lessons_follow_course_access" ON public.course_lessons;

CREATE POLICY "lessons_follow_course_access"
  ON public.course_lessons FOR SELECT
  USING (
    course_id IN (SELECT id FROM public.community_courses WHERE is_published = true)
    OR course_id IN (SELECT id FROM public.community_courses WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "users_manage_own_progress" ON public.lesson_progress;

CREATE POLICY "users_manage_own_progress"
  ON public.lesson_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tasks_visible_to_members" ON public.community_tasks;
DROP POLICY IF EXISTS "creators_manage_tasks"    ON public.community_tasks;

CREATE POLICY "tasks_visible_to_members"
  ON public.community_tasks FOR SELECT
  USING (
    is_active = true AND
    community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "creators_manage_tasks"
  ON public.community_tasks FOR ALL
  USING (creator_id = auth.uid() OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "users_view_own_points"     ON public.member_points;
DROP POLICY IF EXISTS "users_update_own_points"   ON public.member_points;
DROP POLICY IF EXISTS "leaderboard_public_read"   ON public.member_points;

CREATE POLICY "leaderboard_public_read"
  ON public.member_points FOR SELECT
  USING (
    community_id IN (SELECT community_id FROM public.community_memberships WHERE user_id = auth.uid() AND status = 'active')
    OR user_id = auth.uid()
  );

-- ============================================================
-- 11. POLICIES — UGC submission media + participants + payouts
-- ============================================================

DROP POLICY IF EXISTS "ugc_campaign_media_public_read" ON public.ugc_campaign_media;

CREATE POLICY "ugc_campaign_media_public_read"
  ON public.ugc_campaign_media FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM public.ugc_campaigns WHERE status = 'active')
    OR campaign_id IN (
      SELECT id FROM public.ugc_campaigns
      WHERE brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "participants_view_own"           ON public.ugc_campaign_participants;
DROP POLICY IF EXISTS "brands_view_campaign_participants" ON public.ugc_campaign_participants;

CREATE POLICY "participants_view_own"
  ON public.ugc_campaign_participants FOR SELECT
  USING (influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid()));

CREATE POLICY "brands_view_campaign_participants"
  ON public.ugc_campaign_participants FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.ugc_campaigns
    WHERE brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "submission_media_visible_to_owners" ON public.ugc_submission_media;

CREATE POLICY "submission_media_visible_to_owners"
  ON public.ugc_submission_media FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.ugc_submissions
      WHERE influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
    )
    OR submission_id IN (
      SELECT s.id FROM public.ugc_submissions s
      JOIN public.ugc_campaigns c ON c.id = s.campaign_id
      WHERE c.brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "snapshots_visible_to_owners" ON public.ugc_view_snapshots;

CREATE POLICY "snapshots_visible_to_owners"
  ON public.ugc_view_snapshots FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.ugc_submissions
      WHERE influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
    )
    OR submission_id IN (
      SELECT s.id FROM public.ugc_submissions s
      JOIN public.ugc_campaigns c ON c.id = s.campaign_id
      WHERE c.brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "ugc_payouts_visible_to_influencer" ON public.ugc_payouts;

CREATE POLICY "ugc_payouts_visible_to_influencer"
  ON public.ugc_payouts FOR SELECT
  USING (influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "users_create_reports"        ON public.ugc_reports;
DROP POLICY IF EXISTS "reporters_view_own_reports"  ON public.ugc_reports;

CREATE POLICY "users_create_reports"
  ON public.ugc_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reporters_view_own_reports"
  ON public.ugc_reports FOR SELECT
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "brands_manage_escrow" ON public.ugc_campaign_escrow;

CREATE POLICY "brands_manage_escrow"
  ON public.ugc_campaign_escrow FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM public.ugc_campaigns
      WHERE brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.ugc_campaigns
      WHERE brand_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- 12. ADD MISSING FOREIGN KEYS
--     Skipped if FK already exists.
-- ============================================================

DO $$
BEGIN
  -- order_status_history.user_id → profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_status_history_user_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.order_status_history
      ADD CONSTRAINT order_status_history_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- short_video_views.viewer_id → profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'short_video_views_viewer_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.short_video_views
      ADD CONSTRAINT short_video_views_viewer_id_fkey
      FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- short_video_likes.user_id → profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'short_video_likes_user_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.short_video_likes
      ADD CONSTRAINT short_video_likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- short_video_clicks.user_id → profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'short_video_clicks_user_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.short_video_clicks
      ADD CONSTRAINT short_video_clicks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- short_video_clicks.community_id → communities
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'short_video_clicks_community_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.short_video_clicks
      ADD CONSTRAINT short_video_clicks_community_id_fkey
      FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL;
  END IF;

  -- short_video_clicks.order_id → orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'short_video_clicks_order_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.short_video_clicks
      ADD CONSTRAINT short_video_clicks_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;

  -- short_videos.community_id → communities
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'short_videos_community_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.short_videos
      ADD CONSTRAINT short_videos_community_id_fkey
      FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 13. ADD MISSING INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_items_vendor_id
  ON public.order_items(vendor_id);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id
  ON public.transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON public.transactions(status);

CREATE INDEX IF NOT EXISTS idx_reviews_order_item_id
  ON public.reviews(order_item_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id
  ON public.reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id
  ON public.reviews(vendor_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
  ON public.order_status_history(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_status
  ON public.orders(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_vendor_status
  ON public.orders(vendor_id, status);

-- ============================================================
-- 14. STANDARDIZE payment_status — migrate 'completed' to 'paid'
--     For orders. Transactions keep 'completed' for general use.
-- ============================================================

UPDATE public.orders
SET payment_status = 'paid'
WHERE payment_status = 'completed';

-- ============================================================
-- 15. ADD TABLES TO REALTIME PUBLICATION (Supabase realtime)
--     Wrapped in DO block so it doesn't fail if publication
--     doesn't exist or table is already added.
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'orders',
    'order_items',
    'order_status_history',
    'transactions',
    'community_messages',
    'community_inbox_messages',
    'conversation_messages',
    'notifications',
    'community_posts',
    'community_post_likes',
    'community_post_comments',
    'short_videos',
    'short_video_likes',
    'short_video_comments'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION
        WHEN duplicate_object THEN NULL;  -- already in publication
        WHEN undefined_table THEN
          RAISE NOTICE 'Table public.% does not exist, skipping realtime', t;
      END;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- 16. CLEAN UP DUPLICATE community_memberships POLICIES
--     Original migration had three overlapping policies.
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own membership"      ON public.community_memberships;
DROP POLICY IF EXISTS "memberships_select_own_or_staff"      ON public.community_memberships;
DROP POLICY IF EXISTS "memberships_update_own_or_staff"      ON public.community_memberships;
DROP POLICY IF EXISTS "memberships_delete_own_or_owner"      ON public.community_memberships;
DROP POLICY IF EXISTS "memberships_insert_self_or_invited"   ON public.community_memberships;

CREATE POLICY "memberships_select_own_or_owner"
  ON public.community_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
  );

CREATE POLICY "memberships_insert_self"
  ON public.community_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "memberships_update_own_or_owner"
  ON public.community_memberships FOR UPDATE
  USING (
    user_id = auth.uid()
    OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
  );

CREATE POLICY "memberships_delete_own_or_owner"
  ON public.community_memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR community_id IN (SELECT id FROM public.communities WHERE owner_id = auth.uid())
  );

COMMIT;

-- ============================================================
-- JIMVIO — MIGRATION 060
-- Products schema consolidation + cross-cutting fixes
--
-- Combines:
--   - Expanded product_type enum (Option A)
--   - Promoted source_metadata toggles to real columns
--   - Dimensions documented as JSONB shape
--   - payment_status standardized on 'paid'
--   - Slug uniqueness per vendor
--   - pricing_type / billing_period consistency check
--   - is_digital / requires_shipping consistency check
--   - Vendor UPDATE policy on order_items
--   - published_at auto-set trigger
--   - Active-products partial index
--
-- Idempotent where Postgres allows. Wrapped in transaction
-- EXCEPT for ALTER TYPE ADD VALUE, which Postgres requires
-- to run outside a transaction block (handled first).
-- ============================================================

-- ============================================================
-- PART 1 — Enum changes (must run outside transaction)
-- Run this block first, then run PART 2 separately if your
-- migration runner wraps everything in BEGIN/COMMIT.
-- Supabase's migration runner handles this correctly per-file.
-- ============================================================

ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'coaching';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'community';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'bundle';

-- ============================================================
-- PART 2 — Everything else (transactional)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Add new columns to products
-- ------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_author        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_reviews       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_discussions BOOLEAN DEFAULT FALSE;

-- Document the JSONB shape for dimensions (no type change needed)
COMMENT ON COLUMN public.products.dimensions IS
  'JSONB shape: {length: number, width: number, height: number, unit: "cm"|"in"}';

-- ------------------------------------------------------------
-- 2. Backfill new columns from source_metadata
--    Default TRUE/TRUE/FALSE matches what the form previously
--    fell back to, so unset rows behave identically.
-- ------------------------------------------------------------

UPDATE public.products
SET
  show_author = COALESCE(
    (source_metadata->>'show_author')::boolean,
    show_author,
    TRUE
  ),
  show_reviews = COALESCE(
    (source_metadata->>'show_reviews')::boolean,
    show_reviews,
    TRUE
  ),
  enable_discussions = COALESCE(
    (source_metadata->>'enable_discussions')::boolean,
    enable_discussions,
    FALSE
  )
WHERE source_metadata ? 'show_author'
   OR source_metadata ? 'show_reviews'
   OR source_metadata ? 'enable_discussions';

-- ------------------------------------------------------------
-- 3. Migrate product_subtype from source_metadata to product_type
--    Only for rows whose subtype maps to a valid enum value.
--    Existing 'digital' rows with a subtype get promoted.
-- ------------------------------------------------------------

UPDATE public.products
SET product_type = (source_metadata->>'product_subtype')::product_type
WHERE source_metadata->>'product_subtype' IS NOT NULL
  AND source_metadata->>'product_subtype' IN (
    'course', 'software', 'template', 'ebook',
    'coaching', 'community', 'bundle', 'subscription'
  )
  AND product_type = 'digital';   -- only re-classify generic digital rows

-- Strip the now-redundant key from source_metadata so we
-- don't have two sources of truth on existing rows.
UPDATE public.products
SET source_metadata = source_metadata - 'product_subtype'
                                      - 'show_author'
                                      - 'show_reviews'
                                      - 'enable_discussions'
WHERE source_metadata ?| ARRAY[
  'product_subtype', 'show_author', 'show_reviews', 'enable_discussions'
];

-- ------------------------------------------------------------
-- 4. Standardize payment_status on 'paid'
--    Migrate any remaining 'completed' rows on orders.
--    (Transactions table keeps 'completed' for general use.)
-- ------------------------------------------------------------

UPDATE public.orders
SET payment_status = 'paid'
WHERE payment_status = 'completed';

-- Note: We can't DROP enum values in Postgres without recreating
-- the enum. Application code should now only WRITE 'paid'. The
-- 'completed' value remains valid but unused for orders.

-- ------------------------------------------------------------
-- 5. Slug uniqueness — per-vendor instead of global
-- ------------------------------------------------------------

-- Drop the global UNIQUE constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_slug_key'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products DROP CONSTRAINT products_slug_key;
  END IF;
END $$;

-- Add per-vendor unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_vendor_slug_unique'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_vendor_slug_unique UNIQUE (vendor_id, slug);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 6. Consistency constraints
--    Wrap in DO blocks so re-runs don't fail.
-- ------------------------------------------------------------

-- pricing_type ↔ billing_period
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_billing_period_consistency'
      AND conrelid = 'public.products'::regclass
  ) THEN
    -- Clean any inconsistent rows before adding the constraint
    UPDATE public.products
    SET billing_period = NULL
    WHERE pricing_type = 'one_time' AND billing_period IS NOT NULL;

    UPDATE public.products
    SET billing_period = 'monthly'
    WHERE pricing_type = 'recurring' AND billing_period IS NULL;

    ALTER TABLE public.products
      ADD CONSTRAINT products_billing_period_consistency CHECK (
        (pricing_type = 'recurring' AND billing_period IS NOT NULL)
        OR
        (pricing_type = 'one_time' AND billing_period IS NULL)
      );
  END IF;
END $$;

-- Same constraint on order_items (which has the same columns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_billing_period_consistency'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    UPDATE public.order_items
    SET billing_period = NULL
    WHERE pricing_type = 'one_time' AND billing_period IS NOT NULL;

    UPDATE public.order_items
    SET billing_period = 'monthly'
    WHERE pricing_type = 'recurring' AND billing_period IS NULL;

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_billing_period_consistency CHECK (
        (pricing_type = 'recurring' AND billing_period IS NOT NULL)
        OR
        (pricing_type = 'one_time' AND billing_period IS NULL)
      );
  END IF;
END $$;

-- is_digital ↔ requires_shipping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_digital_shipping_consistency'
      AND conrelid = 'public.products'::regclass
  ) THEN
    -- Clean inconsistent rows: digital products should not require shipping
    UPDATE public.products
    SET requires_shipping = FALSE
    WHERE is_digital = TRUE AND requires_shipping = TRUE;

    ALTER TABLE public.products
      ADD CONSTRAINT products_digital_shipping_consistency CHECK (
        (is_digital = TRUE AND requires_shipping = FALSE)
        OR
        (is_digital = FALSE)
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. Vendor UPDATE policy on order_items
--    Needed for vendors to mark fulfillment, add tracking,
--    set digital_download_url, etc.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Vendors can update order items for their products"
  ON public.order_items;

CREATE POLICY "Vendors can update order items for their products"
  ON public.order_items FOR UPDATE
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 8. Auto-set published_at when status transitions to 'active'
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_product_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- On UPDATE: status transitioning into 'active' for the first time
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active'
       AND OLD.status IS DISTINCT FROM 'active'
       AND NEW.published_at IS NULL THEN
      NEW.published_at = NOW();
    END IF;
  END IF;

  -- On INSERT: row created already 'active'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' AND NEW.published_at IS NULL THEN
      NEW.published_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_products_published_at ON public.products;

CREATE TRIGGER tr_products_published_at
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_product_published_at();

-- Backfill: any active product without published_at
UPDATE public.products
SET published_at = COALESCE(created_at, NOW())
WHERE status = 'active' AND published_at IS NULL;

-- ------------------------------------------------------------
-- 9. Partial index for the most common buyer-facing query
--    "Active products in category, sorted by sales"
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_active_category
  ON public.products(category_id, sale_count DESC)
  WHERE status = 'active' AND is_active = TRUE;

-- Also helpful: active products by vendor (for store pages)
CREATE INDEX IF NOT EXISTS idx_products_active_vendor
  ON public.products(vendor_id, created_at DESC)
  WHERE status = 'active' AND is_active = TRUE;

-- ------------------------------------------------------------
-- 10. Indexes on new columns (light — only if you'll query them)
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_enable_discussions
  ON public.products(enable_discussions)
  WHERE enable_discussions = TRUE;

COMMIT;


CREATE OR REPLACE FUNCTION public.increment_link_clicks(p_link_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliate_links
  SET total_clicks = total_clicks + 1
  WHERE id = p_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_affiliate_clicks(p_affiliate_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliates
  SET total_clicks = total_clicks + 1
  WHERE id = p_affiliate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_link_clicks(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_clicks(UUID) TO service_role;