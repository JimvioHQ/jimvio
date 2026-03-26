-- PawaPay mobile money deposits: idempotency key we send as depositId (UUID)
-- Apply in Supabase: Dashboard → SQL → New query → paste this file → Run
alter table public.orders
  add column if not exists pawapay_deposit_id uuid null;

create index if not exists orders_pawapay_deposit_id_idx on public.orders (pawapay_deposit_id)
  where pawapay_deposit_id is not null;

comment on column public.orders.pawapay_deposit_id is 'PawaPay depositId (client-generated UUID) for reconciliation and callbacks';
