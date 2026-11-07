-- Supabase advisor "function_search_path_mutable": 32 functions ran with the caller's
-- search_path. Each one only references objects in public (or schema-qualified
-- auth.* / built-ins in pg_catalog, which is always searched first), so pinning
-- search_path to public, pg_temp keeps their behaviour while preventing a caller's
-- objects from being picked up (important for the 11 SECURITY DEFINER ones).
-- Signatures, bodies, owners, SECURITY mode and EXECUTE grants are unchanged.
--
-- Rollback (per function): alter function public.<name>(<args>) reset search_path;
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and p.proconfig is null
      and p.proname = any (array[
        'update_updated_at_column', 'update_product_rating', 'update_vendor_overall_rating',
        'update_vendor_follower_count', 'update_order_totals', 'set_product_published_at',
        'increment_video_view_count', 'increment_video_click_count', 'increment_video_like_count',
        'decrement_video_like_count', 'increment_post_like_count', 'decrement_post_like_count',
        'increment_post_comment_count', 'set_updated_at', 'merge_variant_source_metadata',
        'recompute_order_total', 'increment_product_view_count', 'update_product_wishlist_count',
        'update_product_sale_count', 'guard_product_delete', 'log_variant_stock_change',
        'log_variant_stock_on_insert', 'guard_membership_plan_change', 'recompute_cart_totals',
        'cj_touch_updated_at', 'increment_viewer_count', 'decrement_viewer_count',
        'community_trending_score', 'jip_touch_updated_at', 'prevent_verification_audit_mutation',
        'digital_verification_can_transition', 'enforce_digital_product_verification'
      ])
  loop
    execute format('alter function %s set search_path = public, pg_temp', f);
  end loop;
end $$;
