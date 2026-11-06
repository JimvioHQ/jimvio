-- Anonymous visitors (public key) may read storefront columns only: never cost,
-- supplier metadata, paid-file URLs, file digests or admin/review fields.
-- Server code uses the service role and is unaffected. Listing code already
-- reads is_trending / has_supplier_video / is_partner_verified instead of
-- source_metadata (PR #176).
--
-- Rollback: grant select on public.products, public.product_variants to anon;
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
  execute 'revoke select on public.products from anon';
  execute format('grant select (%s) on public.products to anon', v_cols);

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'product_variants'
    and column_name not in ('source_metadata');
  execute 'revoke select on public.product_variants from anon';
  execute format('grant select (%s) on public.product_variants to anon', v_cols);
end $$;
