-- Platform-configurable marketing, fees, and public blog posts
-- Run in Supabase SQL editor or your migration runner.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_settings_updated_at_idx ON public.platform_settings (updated_at DESC);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_select_public"
  ON public.platform_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.platform_settings IS 'Key-value JSON config; writes via service role only.';

INSERT INTO public.platform_settings (key, value) VALUES
  ('fees', jsonb_build_object(
    'min_payout_rwf', 50,
    'default_affiliate_commission_percent', 5,
    'shopify_default_platform_commission_percent', 8,
    'platform_fee_percent', 5,
    'platform_fee_fixed_rwf', 0
  )),
  ('social_proof', jsonb_build_object(
    'success_rate_display', '99.2%',
    'countries_display', '80+',
    'fallback_verified_vendors', '2.4k+',
    'fallback_total_products', '180k+'
  )),
  ('marketing', jsonb_build_object(
    'trending_search_keywords', jsonb_build_array(
      'Electronics', 'Apparel', 'Custom manufacturing', 'Verified suppliers', 'Wholesale', 'Dropshipping'
    ),
    'affiliate_value_props', jsonb_build_array(
      'Competitive affiliate rates',
      'Lifetime referral tracking',
      'Creator & affiliate tools'
    ),
    'trust_bar', jsonb_build_array(
      jsonb_build_object('title', 'Trade Assurance', 'desc', 'Payment protection & peace of mind'),
      jsonb_build_object('title', 'Verified Partners', 'desc', 'Audited manufacturer profiles'),
      jsonb_build_object('title', 'Global Logistics', 'desc', 'Freight & fulfillment partners'),
      jsonb_build_object('title', 'Secure Payouts', 'desc', 'Multi-currency payout options'),
      jsonb_build_object('title', 'Creator Network', 'desc', 'Affiliates & influencers worldwide')
    )
  )),
  ('contact', jsonb_build_object(
    'support_email', 'support@jimvio.com',
    'info_email', 'info@jimvio.com',
    'social_x', 'https://x.com/Jimvio_Official',
    'social_youtube', 'https://youtube.com/@jimvio?si=V-gMmLi6YUr8xAhv',
    'social_instagram', 'https://www.instagram.com/jimvio_official?igsh=MWc2Ym5qZmx4MzYzcA==',
    'social_tiktok', 'https://www.tiktok.com/@jimvio_official?_r=1&_t=ZS-94dJpCa6Mr3',
    'hq_line1', 'Kigali Heights, 4th Floor',
    'hq_line2', 'KG 7 Ave, Kigali, Rwanda'
  ))
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  author_name text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  read_time_minutes integer NOT NULL DEFAULT 5,
  category text NOT NULL DEFAULT 'General',
  image_url text,
  body text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON public.blog_posts (is_published, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

COMMENT ON TABLE public.blog_posts IS 'Marketing blog; admin publishes via service role.';

INSERT INTO public.blog_posts (
  slug, title, excerpt, author_name, published_at, read_time_minutes, category, image_url, is_published
) VALUES
(
  'rise-of-creator-commerce-east-africa',
  'The Rise of Creator-Commerce in East Africa',
  'How digital creators are transforming the traditional B2B landscape in Rwanda and beyond.',
  'James Mugabo',
  '2026-03-12 12:00:00+00',
  8,
  'Market Insights',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80',
  true
),
(
  'sustainable-manufacturing-modern-vendors',
  'Sustainable Manufacturing: A Guide for Modern Vendors',
  'Why eco-friendly practices are no longer optional for global exporters.',
  'Sarah Chen',
  '2026-03-10 12:00:00+00',
  12,
  'Sustainability',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  true
),
(
  'mastering-viral-clipping',
  'Mastering the Art of Viral Clipping',
  'The ultimate strategy for creating product videos that actually convert to sales.',
  'Alex Rivera',
  '2026-03-08 12:00:00+00',
  15,
  'Creator Tips',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
  true
),
(
  'global-logistics-2026',
  'Navigating Global Logistics in 2026',
  'Understanding the new shipping corridors and digital customs platforms.',
  'David Okoro',
  '2026-03-05 12:00:00+00',
  10,
  'Logistics',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
  true
)
ON CONFLICT (slug) DO NOTHING;
