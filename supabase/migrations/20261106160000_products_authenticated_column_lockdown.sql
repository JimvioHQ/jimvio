-- Signed-in sessions (buyers and sellers, browser key + user JWT) may read storefront
-- columns of products and product_variants only, exactly like anonymous visitors:
-- never purchase cost, supplier metadata, paid-file URLs, file digests or
-- admin/review fields. Row visibility is unchanged (products_select RLS policy).
--
-- Code that legitimately needs those fields reads them server-side with the
-- service role after its own check: cart/checkout actions (catalogReader in
-- lib/actions/marketplace.ts), the seller edit form (getSellerProductForEdit,
-- vendor-scoped), seller duplicate, admin actions (assertAdminAccess), webhooks.
--
-- merge_variant_source_metadata is only called by the CJ webhook (service role);
-- signed-in and anonymous callers lose EXECUTE.
--
-- Rollback:
--   grant select on public.products, public.product_variants to authenticated;
--   grant execute on function public.merge_variant_source_metadata(text, jsonb) to authenticated;
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products'
    and column_name not in (
      'cost_price', 'source_metadata', 'review_notes', 'override_reason', 'override_user',
      'override_time', 'verification_assignee_id', 'approved_file_digest', 'file_digest',
      'digital_file_url', 'submitted_for_review_at', 'auto_unpublish_reason', 'declarations_accepted_at'
    );
  execute 'revoke select on public.products from authenticated';
  execute format('grant select (%s) on public.products to authenticated', v_cols);

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'product_variants'
    and column_name not in ('source_metadata');
  execute 'revoke select on public.product_variants from authenticated';
  execute format('grant select (%s) on public.product_variants to authenticated', v_cols);
end $$;

do $$
declare
  f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname = 'merge_variant_source_metadata'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
