-- Performance indexes for homepage / hero / communities queries (statement timeout fix)
-- Safe to run multiple times (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_communities_active_member_count
  ON public.communities (member_count DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active_sale_count
  ON public.products (sale_count DESC)
  WHERE status = 'active' AND is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_active_created
  ON public.ugc_campaigns (created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_influencers_active_earnings
  ON public.influencers (total_earnings DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ugc_submissions_approved_views
  ON public.ugc_submissions (total_views_earned DESC)
  WHERE status = 'approved';
