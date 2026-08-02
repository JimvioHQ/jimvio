-- ============================================================
-- Jimvio Identity Platform (JIP)
-- Additive central identity layer. profiles remains source of truth.
-- ============================================================

-- Extension 1:1 with profiles — JIP-only fields (never duplicate bio/avatar/username)
CREATE TABLE IF NOT EXISTS public.jip_identity (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_image text,
  headline text,
  creator_level text NOT NULL DEFAULT 'bronze'
    CHECK (creator_level IN ('bronze','silver','gold','platinum','diamond','elite')),
  trust_score numeric(5,2) NOT NULL DEFAULT 50,
  ai_score numeric(5,2) NOT NULL DEFAULT 50,
  reputation_score numeric(5,2) NOT NULL DEFAULT 50,
  overall_rank integer,
  languages text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  specialties text[] NOT NULL DEFAULT '{}',
  equipment text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT 'open'
    CHECK (availability IN ('open','limited','booked','unavailable')),
  availability_note text,
  contact_preferences jsonb NOT NULL DEFAULT '{"email":true,"in_app":true,"booking":true}'::jsonb,
  privacy_visibility text NOT NULL DEFAULT 'public'
    CHECK (privacy_visibility IN ('public','private','brand_only','followers_only','custom')),
  privacy_custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_kit_url text,
  xp integer NOT NULL DEFAULT 0,
  identity_verified boolean NOT NULL DEFAULT false,
  documents_verified boolean NOT NULL DEFAULT false,
  social_verified boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jip_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN (
    'tiktok','instagram','youtube','facebook','x','threads',
    'linkedin','pinterest','snapchat','website'
  )),
  handle text,
  url text,
  followers integer NOT NULL DEFAULT 0,
  avg_views integer NOT NULL DEFAULT 0,
  engagement_rate numeric(6,3) NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  verification_method text,
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS public.jip_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('video','image','campaign','brand','testimonial','other')),
  title text NOT NULL,
  description text,
  media_url text,
  thumbnail_url text,
  external_url text,
  brand_name text,
  campaign_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jip_portfolio_user_idx
  ON public.jip_portfolio_items (user_id, sort_order);

CREATE TABLE IF NOT EXISTS public.jip_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text,
  author_company text,
  quote text NOT NULL,
  rating numeric(2,1),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jip_resume_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN (
    'experience','industry','brand','campaign','education','certification'
  )),
  title text NOT NULL,
  organization text,
  description text,
  started_on date,
  ended_on date,
  is_current boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jip_badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'verified','elite','community','affiliate','ugc','milestone','general'
    )),
  xp_reward integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.jip_user_badges (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.jip_badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.jip_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

CREATE TABLE IF NOT EXISTS public.jip_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jip_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','completed')),
  scheduled_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 30,
  meeting_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jip_bookings_creator_idx ON public.jip_bookings (creator_id, status);
CREATE INDEX IF NOT EXISTS jip_bookings_brand_idx ON public.jip_bookings (brand_user_id, status);

CREATE TABLE IF NOT EXISTS public.jip_ai_insights (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  opportunities text[] NOT NULL DEFAULT '{}',
  recommended_campaigns text[] NOT NULL DEFAULT '{}',
  recommended_products text[] NOT NULL DEFAULT '{}',
  posting_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  revenue_opportunities text[] NOT NULL DEFAULT '{}',
  growth_roadmap text[] NOT NULL DEFAULT '{}',
  summary text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jip_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN (
    'identity','documents','social','trust','level'
  )),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_id uuid REFERENCES public.profiles(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

INSERT INTO public.jip_badges (id, name, description, icon, category, xp_reward) VALUES
  ('verified_identity', 'Verified Identity', 'Government or platform identity verified', 'shield', 'verified', 100),
  ('elite_creator', 'Elite Creator', 'Top-tier creator performance', 'star', 'elite', 250),
  ('community_champion', 'Community Champion', 'Active and trusted in communities', 'users', 'community', 80),
  ('affiliate_pro', 'Affiliate Pro', 'Proven affiliate earner', 'link', 'affiliate', 80),
  ('ugc_master', 'UGC Master', 'High approval UGC track record', 'video', 'ugc', 120),
  ('first_campaign', 'First Campaign', 'Completed first campaign', 'flag', 'milestone', 40),
  ('portfolio_ready', 'Portfolio Ready', 'Published a professional portfolio', 'briefcase', 'milestone', 30)
ON CONFLICT (id) DO NOTHING;

-- Ensure every profile has a JIP row
INSERT INTO public.jip_identity (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.jip_ensure_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.jip_identity (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jip_profiles_ensure_identity ON public.profiles;
CREATE TRIGGER jip_profiles_ensure_identity
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.jip_ensure_identity();

CREATE OR REPLACE FUNCTION public.jip_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jip_identity_touch ON public.jip_identity;
CREATE TRIGGER jip_identity_touch
  BEFORE UPDATE ON public.jip_identity
  FOR EACH ROW EXECUTE FUNCTION public.jip_touch_updated_at();

DROP TRIGGER IF EXISTS jip_social_touch ON public.jip_social_accounts;
CREATE TRIGGER jip_social_touch
  BEFORE UPDATE ON public.jip_social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.jip_touch_updated_at();

DROP TRIGGER IF EXISTS jip_bookings_touch ON public.jip_bookings;
CREATE TRIGGER jip_bookings_touch
  BEFORE UPDATE ON public.jip_bookings
  FOR EACH ROW EXECUTE FUNCTION public.jip_touch_updated_at();

-- RLS
ALTER TABLE public.jip_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_resume_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jip_identity_select ON public.jip_identity;
CREATE POLICY jip_identity_select ON public.jip_identity
  FOR SELECT USING (
    privacy_visibility = 'public'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.is_active = true
    )
  );

DROP POLICY IF EXISTS jip_identity_own ON public.jip_identity;
CREATE POLICY jip_identity_own ON public.jip_identity
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_social_select ON public.jip_social_accounts;
CREATE POLICY jip_social_select ON public.jip_social_accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS jip_social_own ON public.jip_social_accounts;
CREATE POLICY jip_social_own ON public.jip_social_accounts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_portfolio_select ON public.jip_portfolio_items;
CREATE POLICY jip_portfolio_select ON public.jip_portfolio_items
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS jip_portfolio_own ON public.jip_portfolio_items;
CREATE POLICY jip_portfolio_own ON public.jip_portfolio_items
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_testimonials_select ON public.jip_testimonials;
CREATE POLICY jip_testimonials_select ON public.jip_testimonials
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS jip_testimonials_own ON public.jip_testimonials;
CREATE POLICY jip_testimonials_own ON public.jip_testimonials
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_resume_select ON public.jip_resume_entries;
CREATE POLICY jip_resume_select ON public.jip_resume_entries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS jip_resume_own ON public.jip_resume_entries;
CREATE POLICY jip_resume_own ON public.jip_resume_entries
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_badges_read ON public.jip_badges;
CREATE POLICY jip_badges_read ON public.jip_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS jip_user_badges_read ON public.jip_user_badges;
CREATE POLICY jip_user_badges_read ON public.jip_user_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS jip_milestones_read ON public.jip_milestones;
CREATE POLICY jip_milestones_read ON public.jip_milestones FOR SELECT USING (true);

DROP POLICY IF EXISTS jip_availability_select ON public.jip_availability_slots;
CREATE POLICY jip_availability_select ON public.jip_availability_slots
  FOR SELECT USING (is_active = true OR user_id = auth.uid());

DROP POLICY IF EXISTS jip_availability_own ON public.jip_availability_slots;
CREATE POLICY jip_availability_own ON public.jip_availability_slots
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_bookings_select ON public.jip_bookings;
CREATE POLICY jip_bookings_select ON public.jip_bookings
  FOR SELECT USING (
    creator_id = auth.uid() OR brand_user_id = auth.uid()
  );

DROP POLICY IF EXISTS jip_bookings_insert ON public.jip_bookings;
CREATE POLICY jip_bookings_insert ON public.jip_bookings
  FOR INSERT WITH CHECK (brand_user_id = auth.uid());

DROP POLICY IF EXISTS jip_bookings_update ON public.jip_bookings;
CREATE POLICY jip_bookings_update ON public.jip_bookings
  FOR UPDATE USING (
    creator_id = auth.uid() OR brand_user_id = auth.uid()
  );

DROP POLICY IF EXISTS jip_ai_select ON public.jip_ai_insights;
CREATE POLICY jip_ai_select ON public.jip_ai_insights
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.jip_identity ji
      WHERE ji.user_id = jip_ai_insights.user_id
        AND ji.privacy_visibility = 'public'
    )
  );

DROP POLICY IF EXISTS jip_ai_own ON public.jip_ai_insights;
CREATE POLICY jip_ai_own ON public.jip_ai_insights
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jip_verify_own ON public.jip_verification_requests;
CREATE POLICY jip_verify_own ON public.jip_verification_requests
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS jip_verify_insert ON public.jip_verification_requests;
CREATE POLICY jip_verify_insert ON public.jip_verification_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
