-- Dedicated public read / admin-service-role write bucket for versioned Jimvio site icons.
-- Writes are performed only by the authenticated platform-admin API route using the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-icons',
  'site-icons',
  true,
  1048576,
  array['image/png', 'image/svg+xml', 'image/x-icon']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
