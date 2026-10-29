-- Community Access pricing: free/paid, one-time or subscription (weekly, monthly,
-- quarterly, yearly), compare-at price and an affiliate commission.
-- Additive only: existing monthly/yearly/lifetime prices keep working.
alter table public.communities
  add column if not exists weekly_price numeric(12,2),
  add column if not exists quarterly_price numeric(12,2),
  add column if not exists compare_at_price numeric(12,2),
  add column if not exists billing_type text,
  add column if not exists billing_interval text,
  add column if not exists affiliate_commission_rate numeric(5,2);

do $$ begin
  alter table public.communities add constraint communities_billing_type_check
    check (billing_type is null or billing_type in ('one_time','subscription'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.communities add constraint communities_billing_interval_check
    check (billing_interval is null or billing_interval in ('weekly','monthly','quarterly','yearly'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.communities add constraint communities_access_prices_check
    check (coalesce(weekly_price,0) >= 0 and coalesce(quarterly_price,0) >= 0 and coalesce(compare_at_price,0) >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.communities add constraint communities_affiliate_commission_check
    check (affiliate_commission_rate is null or (affiliate_commission_rate >= 0 and affiliate_commission_rate <= 90));
exception when duplicate_object then null; end $$;

alter table public.community_membership_tiers drop constraint if exists community_membership_tiers_plan_type_check;
alter table public.community_membership_tiers add constraint community_membership_tiers_plan_type_check
  check (plan_type = any (array['free','weekly','monthly','quarterly','yearly','lifetime']));
