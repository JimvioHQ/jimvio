-- Product pages load variants by product_id; without this index every page scans all variants.
create index if not exists idx_product_variants_product_id on public.product_variants (product_id);
