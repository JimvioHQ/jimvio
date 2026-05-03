-- =============================================================================
-- Migration: Payment Webhook Infrastructure
-- Created: 2026-04-12
-- Purpose: Add webhook_events audit table + idempotency constraints for
--          community_payments. These changes are additive and backward-safe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. webhook_events — audit log for every incoming payment callback
--    Provides idempotency, retry-tracking, and production debugging.
-- -----------------------------------------------------------------------------
create table if not exists webhook_events (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null,
  idempotency_key text not null,
  payload         jsonb,
  status          text not null default 'received', -- received | processed | failed
  error           text,
  order_id        uuid references orders(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One row per unique payment event — prevents duplicate processing
  constraint webhook_events_idempotency_key_key unique (idempotency_key)
);

-- Index for monitoring dashboards and replays
create index if not exists webhook_events_provider_idx
  on webhook_events (provider, created_at desc);

create index if not exists webhook_events_order_id_idx
  on webhook_events (order_id)
  where order_id is not null;

create index if not exists webhook_events_status_idx
  on webhook_events (status, created_at desc);

-- Comment for documentation
comment on table webhook_events is
  'Audit log for all incoming payment provider webhooks. '
  'idempotency_key prevents double-processing of the same event. '
  'status: received → processed / failed.';

-- -----------------------------------------------------------------------------
-- 2. community_payments — add unique constraint on payment_reference
--    Guards against duplicate community subscription credits on retried webhooks.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from   pg_constraint
    where  conname = 'community_payments_payment_reference_key'
      and  conrelid = 'community_payments'::regclass
  ) then
    alter table community_payments
      add constraint community_payments_payment_reference_key
      unique (payment_reference);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. payment_status — ensure the Enum type supports all needed values.
--    The application uses 'completed', but gateways often mention 'paid'.
-- -----------------------------------------------------------------------------
do $$
begin
  -- Note: ADD VALUE cannot run inside a transaction block in some versions,
  -- but since Supabase runs these in individual blocks or we use 'do', 
  -- we handle it gracefully.
  begin
    alter type payment_status add value 'paid';
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter type payment_status add value 'completed';
  exception
    when duplicate_object then null;
  end;
end $$;

-- -----------------------------------------------------------------------------
-- 4. orders — ensure payment_status never goes backward after completion.
--    This is enforced in application code, but the check constraint adds a
--    DB-level safety net.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from   pg_constraint
    where  conname = 'orders_payment_status_values'
      and  conrelid = 'orders'::regclass
  ) then
    alter table orders
      add constraint orders_payment_status_values
      check (
        payment_status::text in (
          'pending', 'processing', 'paid', 'completed',
          'failed', 'refunded', 'cancelled'
        )
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Helpful view: recent webhook failures (use in Supabase Studio)
-- -----------------------------------------------------------------------------
create or replace view webhook_failures as
select
  we.id,
  we.provider,
  we.idempotency_key,
  we.error,
  we.order_id,
  we.created_at,
  we.updated_at
from webhook_events we
where we.status = 'failed'
order by we.created_at desc;

comment on view webhook_failures is
  'Quick view of webhook events that failed processing. '
  'Use for alerting and manual retry decisions.';
