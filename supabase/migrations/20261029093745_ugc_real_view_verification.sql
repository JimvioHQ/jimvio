-- Real view verification for UGC submissions.
-- Platform API snapshots prove views on the creator's own connected account.
alter table public.ugc_submissions
  add column if not exists platform_video_id text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_account_id text,
  add column if not exists baseline_views bigint,
  add column if not exists latest_views bigint,
  add column if not exists verified_views bigint,
  add column if not exists verification_flags text[] not null default '{}',
  add column if not exists verification_checked_at timestamptz,
  add column if not exists verification_note text;

alter table public.ugc_submissions drop constraint if exists ugc_submissions_verification_status_check;
alter table public.ugc_submissions add constraint ugc_submissions_verification_status_check
  check (verification_status in ('unverified','verified','owner_mismatch','needs_connection','needs_permission','unsupported','unavailable'));

create index if not exists ugc_submissions_platform_video_idx
  on public.ugc_submissions (platform, platform_video_id) where platform_video_id is not null;
create index if not exists ugc_submissions_verification_due_idx
  on public.ugc_submissions (verification_checked_at nulls first) where status in ('pending','approved');

alter table public.ugc_view_snapshots
  add column if not exists source text not null default 'manual';
alter table public.ugc_view_snapshots drop constraint if exists ugc_view_snapshots_source_check;
alter table public.ugc_view_snapshots add constraint ugc_view_snapshots_source_check
  check (source in ('manual','platform_api'));
create index if not exists ugc_view_snapshots_submission_time_idx
  on public.ugc_view_snapshots (submission_id, snapshotted_at);
