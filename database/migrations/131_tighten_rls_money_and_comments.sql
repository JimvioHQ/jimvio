-- Phase 10C: tighten remaining RLS/grant gaps after 130.
-- Canonical copy: supabase/migrations/20260825120000_tighten_rls_money_and_comments.sql
-- Twin: database/migrations/131_tighten_rls_money_and_comments.sql
--
-- Does NOT:
--   modify wallet balances, orders, products, communities, payments
--   mutate auth.users
--   DELETE / UPDATE / TRUNCATE application rows
--   restore or reset data
--   rotate secrets
--
-- Evidence (production vsfhwfimudpdipdkxbww):
--   wallet_deposits_own FOR ALL (user_id = auth.uid())
--   wallets_insert / wallets_update still present (writes already grant-revoked)
--   community_post_comments_select USING (true)
--   comments_pin_by_staff WITH CHECK (true)
--   ugc_campaign_escrow brands_manage_escrow FOR ALL + GRANT ALL to anon/authenticated
--   orders / transactions GRANT ALL to anon (TRUNCATE/DELETE included)
--   platform_secrets RLS on, no policies (fail-closed) — revoke leftover grants

-- ── wallet_deposits: SELECT own only ────────────────────────────────────────

DROP POLICY IF EXISTS wallet_deposits_own ON public.wallet_deposits;

CREATE POLICY wallet_deposits_select_own
  ON public.wallet_deposits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.wallet_deposits FROM PUBLIC;
REVOKE ALL ON TABLE public.wallet_deposits FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.wallet_deposits FROM authenticated;
GRANT SELECT ON TABLE public.wallet_deposits TO authenticated;
GRANT SELECT, REFERENCES ON TABLE public.wallet_deposits TO anon;

-- ── wallets: drop stale write policies (grants already SELECT-only) ─────────

DROP POLICY IF EXISTS wallets_insert ON public.wallets;
DROP POLICY IF EXISTS wallets_update ON public.wallets;

-- ── comments: drop public USING(true); keep member visibility + public posts ─

DROP POLICY IF EXISTS community_post_comments_select ON public.community_post_comments;

CREATE POLICY community_post_comments_select_public
  ON public.community_post_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    post_id IN (
      SELECT p.id
      FROM public.community_posts p
      JOIN public.communities c ON c.id = p.community_id
      WHERE COALESCE(p.is_published, false) = true
        AND p.archived_at IS NULL
        AND (p.audience IS NULL OR p.audience = 'public')
        AND c.is_active IS TRUE
        AND COALESCE(c.is_private, false) = false
    )
  );

DROP POLICY IF EXISTS comments_pin_by_staff ON public.community_post_comments;

CREATE POLICY comments_pin_by_staff
  ON public.community_post_comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_posts p
      WHERE p.id = community_post_comments.post_id
        AND (
          p.author_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.community_memberships m
            WHERE m.community_id = p.community_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'moderator'::text])
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.community_posts p
      WHERE p.id = community_post_comments.post_id
        AND (
          p.author_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.community_memberships m
            WHERE m.community_id = p.community_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'moderator'::text])
          )
        )
    )
  );

-- ── UGC escrow: client cannot mutate balances ───────────────────────────────

DROP POLICY IF EXISTS brands_manage_escrow ON public.ugc_campaign_escrow;

CREATE POLICY ugc_campaign_escrow_select_own
  ON public.ugc_campaign_escrow
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT ugc_campaigns.id
      FROM public.ugc_campaigns
      WHERE ugc_campaigns.brand_id IN (
        SELECT vendors.id
        FROM public.vendors
        WHERE vendors.user_id = auth.uid()
      )
    )
  );

REVOKE ALL ON TABLE public.ugc_campaign_escrow FROM PUBLIC;
REVOKE ALL ON TABLE public.ugc_campaign_escrow FROM anon;
REVOKE ALL ON TABLE public.ugc_campaign_escrow FROM authenticated;
GRANT SELECT ON TABLE public.ugc_campaign_escrow TO authenticated;

-- ── transactions: no client writes ──────────────────────────────────────────

REVOKE ALL ON TABLE public.transactions FROM PUBLIC;
REVOKE ALL ON TABLE public.transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.transactions FROM authenticated;
GRANT SELECT ON TABLE public.transactions TO authenticated;

-- ── orders: remove anon table-level write/truncate ──────────────────────────

REVOKE ALL ON TABLE public.orders FROM PUBLIC;
REVOKE ALL ON TABLE public.orders FROM anon;
REVOKE TRUNCATE, DELETE, TRIGGER ON TABLE public.orders FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.orders TO anon;

-- ── platform_secrets: fail closed ───────────────────────────────────────────

REVOKE ALL ON TABLE public.platform_secrets FROM PUBLIC;
REVOKE ALL ON TABLE public.platform_secrets FROM anon;
REVOKE ALL ON TABLE public.platform_secrets FROM authenticated;
