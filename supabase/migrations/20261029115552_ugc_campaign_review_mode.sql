-- Owner choice: review submissions by hand, or let the Jimvio checker approve
-- posts whose views are verified real.
alter table public.ugc_campaigns add column if not exists review_mode text not null default 'manual';
alter table public.ugc_campaigns drop constraint if exists ugc_campaigns_review_mode_check;
alter table public.ugc_campaigns add constraint ugc_campaigns_review_mode_check check (review_mode in ('manual','auto'));
