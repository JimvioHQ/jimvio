-- Clean product URLs: supplier-fulfilled products lose the supplier code in their
-- slug ("…-cjbjpfmb00711" → "whitehead-deep-cleansing-acne-mask").
-- Every old slug is kept in product_slug_redirects; the product page resolves an
-- old address and answers with a permanent (308) redirect to the current one.
-- Nothing is deleted. SKUs are unchanged (fulfilment and old-URL lookups use them).
--
-- Rollback:
--   update public.products p set slug = r.old_slug
--   from public.product_slug_redirects r
--   where r.product_id = p.id and r.reason = 'clean_slug_2026_11';

create table if not exists public.product_slug_redirects (
  old_slug text primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  reason text not null default 'rename',
  created_at timestamptz not null default now()
);
create index if not exists product_slug_redirects_product_idx on public.product_slug_redirects(product_id);
-- Read only by the server (service role); no public access.
alter table public.product_slug_redirects enable row level security;
revoke all on public.product_slug_redirects from anon, authenticated;

create temporary table _slug_plan on commit drop as
with c as (
  select id, slug, source, status, is_active, created_at, deleted_at,
    regexp_replace(
      regexp_replace(
        lower(regexp_replace(replace(name, '''', ''),
          '\m(wholesale|cross-?border|foreign trade|hot sale|hot selling|new arrival|new style|best seller|factory direct|amazon|ebay|tiktok|in stock)\M', ' ', 'gi')),
        '[^a-z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g') as t
  from public.products
), b as (
  select *,
    case when deleted_at is null and source = 'cj'
              and (slug ~ '-cj[a-z0-9]{5,}$' or slug ~ '^cj[a-z0-9]{5,}$' or slug ~* 'wholesale|hot-sale|cross-border')
      then coalesce(nullif(case when length(t) <= 80 then t else regexp_replace(left(t, 81), '-?[a-z0-9]*$', '') end, ''), 'product')
    end as newbase
  from c
), ranked as (
  select *,
    row_number() over (
      partition by coalesce(newbase, slug)
      order by (newbase is null) desc, (status = 'active' and is_active) desc, created_at, id
    ) as rn
  from b
)
select id, slug as old_slug, newbase || case when rn > 1 then '-' || rn else '' end as new_slug
from ranked
where newbase is not null;

-- A planned slug that equals another product's current (unchanged) slug gets an id tail.
update _slug_plan p set new_slug = p.new_slug || '-' || left(replace(p.id::text, '-', ''), 6)
where exists (
  select 1 from public.products x
  where x.slug = p.new_slug and x.id <> p.id and not exists (select 1 from _slug_plan y where y.id = x.id)
);

insert into public.product_slug_redirects (old_slug, product_id, reason)
select old_slug, id, 'clean_slug_2026_11' from _slug_plan where old_slug <> new_slug
on conflict (old_slug) do nothing;

update public.products p set slug = s.new_slug
from _slug_plan s
where s.id = p.id and p.slug <> s.new_slug;
