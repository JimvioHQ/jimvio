-- Audit remediation batch A: private visibility, creator financial writes, Shopify token access.
-- Non-destructive: no application rows are deleted or rewritten.
SET lock_timeout = '5s';

-- Membership lookups use private SECURITY DEFINER helpers to avoid RLS recursion.
CREATE OR REPLACE FUNCTION private.is_community_admin(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_memberships m
    WHERE m.community_id = p_community_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('owner', 'admin')
  );
$function$;
REVOKE ALL ON FUNCTION private.is_community_admin(uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_community_admin(uuid) TO authenticated, service_role;

-- Private communities remain discoverable only when explicitly public and active.
DROP POLICY IF EXISTS communities_select ON public.communities;
DROP POLICY IF EXISTS communities_select_members ON public.communities;
CREATE POLICY communities_select_public
  ON public.communities FOR SELECT TO anon, authenticated
  USING (
    coalesce(is_private, false) = false
    AND coalesce(is_active, false) = true
    AND coalesce(visibility_mode, 'public') = 'public'
    AND coalesce(visibility, 'public') = 'public'
    AND archived_at IS NULL
  );
CREATE POLICY communities_select_members
  ON public.communities FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR private.is_active_community_member(communities.id, (SELECT auth.uid()))
  );

-- Hidden, locked, inactive and archived spaces/rooms are not exposed by broad
-- permissive policies. Owners/admins and active members retain appropriate access.
DROP POLICY IF EXISTS spaces_select ON public.spaces;
DROP POLICY IF EXISTS spaces_visible_to_members ON public.spaces;
DROP POLICY IF EXISTS spaces_select_public ON public.spaces;
DROP POLICY IF EXISTS spaces_select_members ON public.spaces;
CREATE POLICY spaces_select_public
  ON public.spaces FOR SELECT TO anon, authenticated
  USING (
    coalesce(spaces.is_active, false) = true
    AND spaces.archived_at IS NULL
    AND coalesce(spaces.is_hidden, false) = false
    AND coalesce(spaces.is_locked, false) = false
    AND coalesce(spaces.privacy, 'public') = 'public'
    AND spaces.community_id IN (
      SELECT c.id FROM public.communities c
      WHERE coalesce(c.is_private, false) = false
        AND coalesce(c.is_active, false) = true
        AND coalesce(c.visibility_mode, 'public') = 'public'
        AND coalesce(c.visibility, 'public') = 'public'
        AND c.archived_at IS NULL
    )
  );
CREATE POLICY spaces_select_members
  ON public.spaces FOR SELECT TO authenticated
  USING (
    coalesce(spaces.is_active, false) = true
    AND spaces.archived_at IS NULL
    AND private.is_active_community_member(spaces.community_id, (SELECT auth.uid()))
    AND (
      coalesce(spaces.is_hidden, false) = false
      OR private.is_community_admin(spaces.community_id)
    )
  );

DROP POLICY IF EXISTS rooms_select ON public.rooms;
DROP POLICY IF EXISTS rooms_visible_to_members ON public.rooms;
DROP POLICY IF EXISTS rooms_select_public ON public.rooms;
DROP POLICY IF EXISTS rooms_select_members ON public.rooms;
CREATE POLICY rooms_select_public
  ON public.rooms FOR SELECT TO anon, authenticated
  USING (
    coalesce(rooms.is_active, false) = true
    AND rooms.archived_at IS NULL
    AND coalesce(rooms.is_hidden, false) = false
    AND coalesce(rooms.is_locked, false) = false
    AND coalesce(rooms.visibility, 'public') = 'public'
    AND rooms.community_id IN (
      SELECT c.id FROM public.communities c
      WHERE coalesce(c.is_private, false) = false
        AND coalesce(c.is_active, false) = true
        AND coalesce(c.visibility_mode, 'public') = 'public'
        AND coalesce(c.visibility, 'public') = 'public'
        AND c.archived_at IS NULL
    )
  );
CREATE POLICY rooms_select_members
  ON public.rooms FOR SELECT TO authenticated
  USING (
    coalesce(rooms.is_active, false) = true
    AND rooms.archived_at IS NULL
    AND private.is_active_community_member(rooms.community_id, (SELECT auth.uid()))
    AND (
      coalesce(rooms.is_hidden, false) = false
      OR private.is_community_admin(rooms.community_id)
    )
  );

-- Buying requests are visible to signed-in buyers/vendors only when open,
-- while request owners can always see their own requests and related offers.
DROP POLICY IF EXISTS buying_requests_select ON public.buying_requests;
CREATE POLICY buying_requests_select_open_or_owner
  ON public.buying_requests FOR SELECT TO authenticated
  USING (
    buyer_id = (SELECT auth.uid())
    OR lower(coalesce(status, '')) IN ('open', 'published', 'active')
  );

DROP POLICY IF EXISTS buying_lead_offers_select ON public.buying_lead_offers;
CREATE POLICY buying_lead_offers_select_participants
  ON public.buying_lead_offers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buying_requests br
      WHERE br.id = buying_lead_offers.buying_request_id
        AND br.buyer_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = buying_lead_offers.vendor_id
        AND v.user_id = (SELECT auth.uid())
    )
  );

-- Affiliate balances, earnings, tiers and performance are server-managed.
DROP POLICY IF EXISTS affiliates_select ON public.affiliates;
CREATE POLICY affiliates_select_own
  ON public.affiliates FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS affiliates_update ON public.affiliates;
CREATE POLICY affiliates_update_own
  ON public.affiliates FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE SELECT ON TABLE public.affiliates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.affiliates TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_affiliate_financial_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.total_clicks, 0) <> 0
        OR coalesce(NEW.total_conversions, 0) <> 0
        OR coalesce(NEW.total_earnings, 0) <> 0
        OR coalesce(NEW.available_balance, 0) <> 0
        OR coalesce(NEW.pending_earnings, 0) <> 0
        OR coalesce(NEW.paid_earnings, 0) <> 0
        OR coalesce(NEW.conversion_rate, 0) <> 0
        OR coalesce(NEW.tier, 'bronze') <> 'bronze'
      THEN
        RAISE EXCEPTION 'Affiliate financial and tier fields are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    ELSE
      IF NEW.total_clicks IS DISTINCT FROM OLD.total_clicks
        OR NEW.total_conversions IS DISTINCT FROM OLD.total_conversions
        OR NEW.total_earnings IS DISTINCT FROM OLD.total_earnings
        OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
        OR NEW.pending_earnings IS DISTINCT FROM OLD.pending_earnings
        OR NEW.paid_earnings IS DISTINCT FROM OLD.paid_earnings
        OR NEW.conversion_rate IS DISTINCT FROM OLD.conversion_rate
        OR NEW.tier IS DISTINCT FROM OLD.tier
      THEN
        RAISE EXCEPTION 'Affiliate financial and tier fields are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_protect_affiliate_financial_fields ON public.affiliates;
CREATE TRIGGER trg_protect_affiliate_financial_fields
  BEFORE INSERT OR UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.protect_affiliate_financial_fields();

-- Affiliate link rows are read-only to the browser; creation, attribution,
-- commission rates and counters already flow through trusted server actions.
DROP POLICY IF EXISTS affiliate_links_select ON public.affiliate_links;
DROP POLICY IF EXISTS affiliate_links_select_own ON public.affiliate_links;
CREATE POLICY affiliate_links_select_own
  ON public.affiliate_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_links.affiliate_id
        AND a.user_id = (SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS affiliate_links_insert ON public.affiliate_links;
DROP POLICY IF EXISTS affiliate_links_update ON public.affiliate_links;
DROP POLICY IF EXISTS affiliate_links_delete ON public.affiliate_links;
REVOKE ALL PRIVILEGES ON TABLE public.affiliate_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.affiliate_links TO authenticated;

-- Influencer profile editing remains owner-controlled; money, verification,
-- featured state and measured performance cannot be client-written.
DROP POLICY IF EXISTS influencers_select ON public.influencers;
DROP POLICY IF EXISTS influencers_select_own ON public.influencers;
CREATE POLICY influencers_select_own
  ON public.influencers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS influencers_update ON public.influencers;
CREATE POLICY influencers_update_own
  ON public.influencers FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_influencer_financial_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.total_earnings, 0) <> 0
        OR coalesce(NEW.available_balance, 0) <> 0
        OR coalesce(NEW.pending_balance, 0) <> 0
        OR coalesce(NEW.total_campaigns, 0) <> 0
        OR coalesce(NEW.total_followers, 0) <> 0
        OR coalesce(NEW.engagement_rate, 0) <> 0
        OR coalesce(NEW.rating, 0) <> 0
        OR coalesce(NEW.is_verified, false)
        OR coalesce(NEW.is_featured, false)
      THEN
        RAISE EXCEPTION 'Influencer financial, trust and performance fields are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    ELSE
      IF NEW.total_earnings IS DISTINCT FROM OLD.total_earnings
        OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
        OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
        OR NEW.total_campaigns IS DISTINCT FROM OLD.total_campaigns
        OR NEW.total_followers IS DISTINCT FROM OLD.total_followers
        OR NEW.engagement_rate IS DISTINCT FROM OLD.engagement_rate
        OR NEW.rating IS DISTINCT FROM OLD.rating
        OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
        OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
      THEN
        RAISE EXCEPTION 'Influencer financial, trust and performance fields are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_protect_influencer_financial_fields ON public.influencers;
CREATE TRIGGER trg_protect_influencer_financial_fields
  BEFORE INSERT OR UPDATE ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION public.protect_influencer_financial_fields();

-- Vendor revenue/rating/featured and follower counters are computed or reviewed
-- by trusted platform workflows, not by the vendor's browser session.
CREATE OR REPLACE FUNCTION public.protect_vendor_financial_metrics()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.total_sales, 0) <> 0
        OR coalesce(NEW.total_revenue, 0) <> 0
        OR coalesce(NEW.rating, 0) <> 0
        OR coalesce(NEW.commission_rate, 0) <> 0
        OR coalesce(NEW.is_featured, false)
        OR coalesce(NEW.follower_count, 0) <> 0
        OR coalesce(NEW.display_follower_count, 0) <> 0
        OR NEW.physical_selling_reviewed_at IS NOT NULL
        OR NEW.physical_selling_reviewed_by IS NOT NULL
        OR coalesce(NEW.verification_status::text, 'pending') <> 'pending'
        OR NEW.verified_at IS NOT NULL
        OR NEW.verification_notes IS NOT NULL
      THEN
        RAISE EXCEPTION 'Vendor financial, verification and performance fields are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    ELSE
      IF NEW.total_sales IS DISTINCT FROM OLD.total_sales
        OR NEW.total_revenue IS DISTINCT FROM OLD.total_revenue
        OR NEW.rating IS DISTINCT FROM OLD.rating
        OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
        OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
        OR NEW.follower_count IS DISTINCT FROM OLD.follower_count
        OR NEW.display_follower_count IS DISTINCT FROM OLD.display_follower_count
        OR NEW.physical_selling_reviewed_at IS DISTINCT FROM OLD.physical_selling_reviewed_at
        OR NEW.physical_selling_reviewed_by IS DISTINCT FROM OLD.physical_selling_reviewed_by
      THEN
        RAISE EXCEPTION 'Vendor financial and performance fields are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_protect_vendor_financial_metrics ON public.vendors;
CREATE TRIGGER trg_protect_vendor_financial_metrics
  BEFORE INSERT OR UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_financial_metrics();

-- Profile follower counters are system-maintained, not self-editable.
CREATE OR REPLACE FUNCTION public.protect_profile_social_metrics()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.follower_count, 0) <> 0
        OR coalesce(NEW.following_count, 0) <> 0
      THEN
        RAISE EXCEPTION 'Profile follower metrics are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    ELSE
      IF NEW.follower_count IS DISTINCT FROM OLD.follower_count
        OR NEW.following_count IS DISTINCT FROM OLD.following_count
      THEN
        RAISE EXCEPTION 'Profile follower metrics are server-managed'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_protect_profile_social_metrics ON public.profiles;
CREATE TRIGGER trg_protect_profile_social_metrics
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_social_metrics();

-- Shopify credential access tokens are server-only. The vendor browser can
-- still read connection status and commission configuration columns.
REVOKE SELECT ON TABLE public.shopify_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, vendor_id, shop_domain, api_version, platform_commission_rate,
  connected_at, last_synced_at, is_active, merchant_store_id, created_at, updated_at
) ON TABLE public.shopify_credentials TO authenticated;

-- Keep public profiles/storefronts readable, but remove private fields from
-- unauthenticated Data API access. Authenticated owner/admin workflows retain
-- their existing table grants and RLS paths in this batch.
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon;
GRANT SELECT (
  id, username, full_name, avatar_url, bio, website, country, city, language,
  is_verified, is_active, created_at, updated_at, follower_count, following_count
) ON TABLE public.profiles TO anon;

REVOKE SELECT ON TABLE public.vendors FROM PUBLIC, anon;
GRANT SELECT (
  id, user_id, business_name, business_slug, business_description, business_logo,
  business_banner, business_country, website, rating, total_sales, is_featured,
  is_active, created_at, follower_count, business_type, product_categories,
  response_time, display_follower_count, verification_status
) ON TABLE public.vendors TO anon;

-- Public campaigns are visible only through the existing active-only policy.
-- Owners can still manage drafts; active/paused/completed campaign money terms
-- and activation state are protected at the database boundary.
DROP POLICY IF EXISTS ugc_campaigns_select ON public.ugc_campaigns;
CREATE OR REPLACE FUNCTION public.protect_live_ugc_campaign_terms()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF jwt_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
      RAISE EXCEPTION 'Campaigns must be activated through the authorized activation flow'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Campaigns must be activated through the authorized activation flow'
          USING ERRCODE = 'insufficient_privilege';
      END IF;

      IF OLD.status IN ('active', 'paused', 'completed') AND (
        NEW.total_budget IS DISTINCT FROM OLD.total_budget
        OR NEW.payment_model IS DISTINCT FROM OLD.payment_model
        OR NEW.rate_per_1k_views IS DISTINCT FROM OLD.rate_per_1k_views
        OR NEW.fixed_rate IS DISTINCT FROM OLD.fixed_rate
        OR NEW.max_payout_per_sub IS DISTINCT FROM OLD.max_payout_per_sub
        OR NEW.spent_budget IS DISTINCT FROM OLD.spent_budget
        OR NEW.allowed_platforms IS DISTINCT FROM OLD.allowed_platforms
        OR NEW.requires_face IS DISTINCT FROM OLD.requires_face
        OR NEW.min_duration IS DISTINCT FROM OLD.min_duration
        OR NEW.max_duration IS DISTINCT FROM OLD.max_duration
        OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
        OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
        OR NEW.max_participants IS DISTINCT FROM OLD.max_participants
        OR NEW.content_deadline IS DISTINCT FROM OLD.content_deadline
        OR NEW.submission_deadline IS DISTINCT FROM OLD.submission_deadline
        OR NEW.payment_at IS DISTINCT FROM OLD.payment_at
      ) THEN
        RAISE EXCEPTION 'Live campaign terms and escrow budget are immutable; use the campaign change workflow'
          USING ERRCODE = 'insufficient_privilege';
      END IF;

      IF OLD.status = 'active' AND NEW.status NOT IN ('active', 'paused') THEN
        RAISE EXCEPTION 'An active campaign may only be paused through the owner flow'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_protect_live_ugc_campaign_terms ON public.ugc_campaigns;
CREATE TRIGGER trg_protect_live_ugc_campaign_terms
  BEFORE INSERT OR UPDATE ON public.ugc_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.protect_live_ugc_campaign_terms();

-- Trigger functions are callable only through their triggers, not as public RPCs.
REVOKE ALL ON FUNCTION public.protect_affiliate_financial_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_influencer_financial_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_vendor_financial_metrics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_social_metrics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_live_ugc_campaign_terms() FROM PUBLIC, anon, authenticated;
