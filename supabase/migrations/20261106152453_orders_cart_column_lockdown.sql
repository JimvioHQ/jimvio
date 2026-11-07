-- Cart & orders: buyers and merchants (browser key + user JWT) keep reading their own
-- rows exactly as before (RLS unchanged), but no longer see supplier data:
--   cart_items.source_metadata, order_items.source_metadata  (supplier cost/pricing
--   policy copy, supplier ids, raw supplier titles)
--   orders.cj_supplier_cost, cj_order_id, cj_order_num, cj_dispute_id,
--   cj_submit_time, cj_last_sync, source_payload
-- Nothing is deleted or rewritten: the values stay in the database for checkout,
-- fulfilment, payouts and admin, which read them server-side (service role) after
-- their own ownership/admin checks. No SECURITY DEFINER function is added.
--
-- Rollback:
--   grant select on public.cart_items, public.order_items, public.orders to authenticated;
do $$
declare
  t record;
  v_cols text;
begin
  for t in
    select * from (values
      ('cart_items', array['source_metadata']),
      ('order_items', array['source_metadata']),
      ('orders', array['cj_supplier_cost', 'cj_order_id', 'cj_order_num', 'cj_dispute_id', 'cj_submit_time', 'cj_last_sync', 'source_payload'])
    ) as x(tbl, hidden)
  loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
    from information_schema.columns
    where table_schema = 'public' and table_name = t.tbl and column_name <> all (t.hidden);
    execute format('revoke select on public.%I from anon, authenticated', t.tbl);
    execute format('grant select (%s) on public.%I to authenticated', v_cols, t.tbl);
  end loop;
end $$;
