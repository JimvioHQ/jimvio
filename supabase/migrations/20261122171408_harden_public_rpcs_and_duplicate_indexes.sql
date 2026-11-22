-- Production security/performance hardening.
-- Scope: revoke unsafe client RPC/table grants, preserve authenticated UGC RLS,
-- and remove only structurally identical duplicate indexes. No application data is deleted.

SET lock_timeout = '5s';

-- UGC authorization helpers are used by RLS policies that rely on auth.uid().
-- Make the dependent policies authenticated-only before removing PUBLIC execution.
ALTER POLICY ugc_automations_access ON public.ugc_automations TO authenticated;
ALTER POLICY ugc_brand_members_access ON public.ugc_brand_members TO authenticated;
ALTER POLICY ugc_chat_messages_access ON public.ugc_campaign_chat_messages TO authenticated;
ALTER POLICY ugc_chat_threads_access ON public.ugc_campaign_chat_threads TO authenticated;
ALTER POLICY ugc_templates_brand_all ON public.ugc_campaign_templates TO authenticated;
ALTER POLICY ugc_contract_versions_access ON public.ugc_contract_versions TO authenticated;
ALTER POLICY ugc_contracts_access ON public.ugc_contracts TO authenticated;
ALTER POLICY ugc_invites_brand ON public.ugc_creator_invitations TO authenticated;
ALTER POLICY ugc_crm_list_members_access ON public.ugc_crm_list_members TO authenticated;
ALTER POLICY ugc_crm_lists_access ON public.ugc_crm_lists TO authenticated;
ALTER POLICY ugc_dispute_evidence_access ON public.ugc_dispute_evidence TO authenticated;
ALTER POLICY ugc_dispute_messages_access ON public.ugc_dispute_messages TO authenticated;
ALTER POLICY ugc_disputes_access ON public.ugc_disputes TO authenticated;
ALTER POLICY ugc_escrow_ledger_access ON public.ugc_escrow_ledger TO authenticated;
ALTER POLICY ugc_fav_creators_brand ON public.ugc_favorite_creators TO authenticated;
ALTER POLICY ugc_webhook_deliveries_access ON public.ugc_webhook_deliveries TO authenticated;
ALTER POLICY ugc_webhook_subs_access ON public.ugc_webhook_subscriptions TO authenticated;
ALTER POLICY ugc_workflow_runs_access ON public.ugc_workflow_runs TO authenticated;
ALTER POLICY ugc_workflows_access ON public.ugc_workflows TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ugc_is_brand_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ugc_is_brand_member(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ugc_is_brand_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ugc_is_brand_owner(uuid) TO authenticated, service_role;

-- Cart mutation RPC requires an authenticated caller (the function also validates auth.uid()).
REVOKE EXECUTE ON FUNCTION public.add_to_cart(uuid, uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_to_cart(uuid, uuid, integer, uuid) TO authenticated, service_role;

-- Counter/affiliate write RPCs are invoked by trusted server actions or workers.
-- Client code uses server-side service-role clients for these operations.
REVOKE EXECUTE ON FUNCTION public.decrement_post_like_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_post_like_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.decrement_video_like_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_video_like_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.decrement_viewer_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_viewer_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_affiliate_clicks(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_clicks(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_link_clicks(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_link_clicks(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_post_comment_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_comment_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_post_like_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_like_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_video_click_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_video_click_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_video_like_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_video_like_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_video_view_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_viewer_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_viewer_count(uuid) TO service_role;

-- These RLS-enabled tables intentionally have no client policies and are used by
-- server-only routes/workers. Remove broad table grants so a future policy mistake
-- cannot accidentally expose them to anon/authenticated clients. service_role is retained.
REVOKE ALL PRIVILEGES ON TABLE
  public.cj_ai_recommendations,
  public.cj_auto_publish_analytics,
  public.cj_auto_publish_events,
  public.cj_auto_publish_queue,
  public.cj_catalog_health,
  public.cj_catalog_scan_state,
  public.cj_product_duplicates,
  public.cj_product_map,
  public.cj_product_search_index,
  public.cj_scan_failures,
  public.cj_signal_watch_queue,
  public.cj_supplier_reputation,
  public.cj_sync_logs,
  public.cj_watcher_state,
  public.community_event_invites,
  public.community_moderation_logs,
  public.ds_idempotency_keys,
  public.marketplace_category_intelligence,
  public.marketplace_customer_profiles,
  public.marketplace_intelligence_analytics,
  public.marketplace_intelligence_events,
  public.marketplace_product_intelligence,
  public.marketplace_search_intelligence,
  public.marketplace_seasons,
  public.marketplace_trending_hourly,
  public.merchant_store_credentials,
  public.newsletter_subscribers,
  public.ugc_join_audit,
  public.webhook_events
FROM PUBLIC, anon, authenticated;

-- Drop one member of each exact duplicate pair, preserving the used or
-- constraint-backed index where the database stats/metadata identify one.
DROP INDEX IF EXISTS public.idx_cj_auto_publish_queue_priority;
DROP INDEX IF EXISTS public.idx_cj_intel_enrichment;
DROP INDEX IF EXISTS public.idx_cj_intel_is_published_active;
DROP INDEX IF EXISTS public.idx_cj_intel_trending_true;
DROP INDEX IF EXISTS public.idx_live_participants_session;
DROP INDEX IF EXISTS public.idx_live_participants_user;
DROP INDEX IF EXISTS public.uq_live_participants_session_user;
DROP INDEX IF EXISTS public.idx_products_product_type;
DROP INDEX IF EXISTS public.transactions_order_id_idx;
DROP INDEX IF EXISTS public.transactions_status_idx;
DROP INDEX IF EXISTS public.transactions_user_id_idx;
DROP INDEX IF EXISTS public.idx_ugc_campaign_media_campaign_id;
DROP INDEX IF EXISTS public.idx_vendor_followers_composite;

-- Intentionally public read-only RPCs are retained:
-- get_product_gallery, get_trending_communities, get_trending_community_topics.
-- public.platform_verification_public is retained as a deliberately safe SECURITY DEFINER
-- projection; its backing evidence table remains inaccessible to anon.
