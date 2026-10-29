-- Close name matches among Jimvio's active products, for originality signals.
drop function if exists public.trust_similar_products(text, integer);
create or replace function public.trust_similar_products(q text, max_rows integer default 5, only_digital boolean default true)
returns table (id uuid, name text, slug text, store text, similarity real)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.name, p.slug, v.business_name, similarity(p.name, q)::real as similarity
  from public.products p
  left join public.vendors v on v.id = p.vendor_id
  where p.deleted_at is null
    and p.status = 'active'
    and length(q) >= 4
    and (not only_digital or p.is_digital)
    and p.name % q
  order by 5 desc
  limit greatest(1, least(max_rows, 10));
$$;
revoke all on function public.trust_similar_products(text, integer, boolean) from public, anon, authenticated;
grant execute on function public.trust_similar_products(text, integer, boolean) to service_role;
