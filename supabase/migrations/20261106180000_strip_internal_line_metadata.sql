-- Buyers can read their own cart and order lines. Those lines carried a copy of the
-- catalog metadata, including the supplier cost and pricing policy
-- (jimvio_pricing), raw supplier titles and supplier catalog fields. None of these
-- are read from cart or order lines by any code (fulfilment uses cj_vid / cj_pid /
-- cj_sku / weight / options, which stay). A trigger keeps them out of new and
-- updated lines; existing lines are cleaned once. Nothing else changes.
--
-- Rollback: drop the two triggers and the function (the removed keys are not needed;
-- the product rows still hold them).

create or replace function public.strip_internal_line_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source_metadata is not null and jsonb_typeof(new.source_metadata) = 'object' then
    new.source_metadata := new.source_metadata - array[
      'jimvio_pricing', 'jimvio_pricing_conflict', 'pricing_tier', 'supplier_cost_usd',
      'cj_product_names_raw', 'cj_category_id', 'cj_category_name', 'cj_create_time',
      'cj_sale_status', 'trend_evidence', 'trend_classification'
    ];
  end if;
  return new;
end;
$$;
revoke execute on function public.strip_internal_line_metadata() from public, anon, authenticated;

drop trigger if exists tr_cart_items_strip_internal_metadata on public.cart_items;
create trigger tr_cart_items_strip_internal_metadata
  before insert or update of source_metadata on public.cart_items
  for each row execute function public.strip_internal_line_metadata();

drop trigger if exists tr_order_items_strip_internal_metadata on public.order_items;
create trigger tr_order_items_strip_internal_metadata
  before insert or update of source_metadata on public.order_items
  for each row execute function public.strip_internal_line_metadata();

-- One-time clean-up of existing lines. Totals triggers are paused for this
-- statement only, so no order or cart total is recomputed (amounts are untouched).
alter table public.order_items disable trigger tr_update_order_totals;
alter table public.cart_items disable trigger tr_cart_items_recompute;

update public.cart_items set source_metadata = source_metadata - array['jimvio_pricing', 'jimvio_pricing_conflict', 'pricing_tier', 'supplier_cost_usd', 'cj_product_names_raw', 'cj_category_id', 'cj_category_name', 'cj_create_time', 'cj_sale_status', 'trend_evidence', 'trend_classification']
where source_metadata ?| array['jimvio_pricing', 'jimvio_pricing_conflict', 'pricing_tier', 'supplier_cost_usd', 'cj_product_names_raw', 'cj_category_id', 'cj_category_name', 'cj_create_time', 'cj_sale_status', 'trend_evidence', 'trend_classification'];

update public.order_items set source_metadata = source_metadata - array['jimvio_pricing', 'jimvio_pricing_conflict', 'pricing_tier', 'supplier_cost_usd', 'cj_product_names_raw', 'cj_category_id', 'cj_category_name', 'cj_create_time', 'cj_sale_status', 'trend_evidence', 'trend_classification']
where source_metadata ?| array['jimvio_pricing', 'jimvio_pricing_conflict', 'pricing_tier', 'supplier_cost_usd', 'cj_product_names_raw', 'cj_category_id', 'cj_category_name', 'cj_create_time', 'cj_sale_status', 'trend_evidence', 'trend_classification'];

alter table public.order_items enable trigger tr_update_order_totals;
alter table public.cart_items enable trigger tr_cart_items_recompute;
