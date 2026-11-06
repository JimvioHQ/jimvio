-- Applied 2026-11-06. Storefront badge facts as plain columns, so browsers never need source_metadata.
alter table public.products
  add column if not exists is_trending boolean generated always as (
    coalesce(source_metadata -> 'cj_trending' = 'true'::jsonb, false)
    and coalesce(source_metadata ->> 'trend_classification', '') <> 'cj_order_count'
  ) stored,
  add column if not exists has_supplier_video boolean generated always as (
    coalesce(source_metadata -> 'cj_has_video' = 'true'::jsonb, false)
    and jsonb_typeof(source_metadata -> 'cj_videos') = 'array'
    and source_metadata -> 'cj_videos' <> '[]'::jsonb
  ) stored,
  add column if not exists is_partner_verified boolean generated always as (
    coalesce(source_metadata -> 'cj_supplier_verified' = 'true'::jsonb, false)
    or coalesce(source_metadata ->> 'cj_verified_warehouse', '') = '1'
  ) stored;
