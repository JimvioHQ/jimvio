-- P0-4: Unpublish listings that break Jimvio's own prohibited-products policy.
-- Tobacco/smoking accessories (no age verification), flammable lighters
-- (dangerous goods), adult toys, unapproved medical devices, health claims,
-- and a car-key programming tool. Listings are set to draft with an
-- auto-unpublish reason; nothing is deleted. Previous state archived.

CREATE SCHEMA IF NOT EXISTS catalog_archive;
REVOKE ALL ON SCHEMA catalog_archive FROM PUBLIC;
REVOKE ALL ON SCHEMA catalog_archive FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS catalog_archive.p0_4_unpublished (
  product_id uuid PRIMARY KEY,
  previous_status text,
  previous_auto_unpublished boolean,
  reason text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

WITH targets(id, reason) AS (
  VALUES
    ('875dd448-65e9-4101-8940-a3a5c0014d09'::uuid, 'P0-4 tobacco accessory without age verification'),
    ('0c8ba160-ef3f-45ab-8e35-c191e4424612'::uuid, 'P0-4 tobacco accessory without age verification'),
    ('d356adc7-0aaf-4820-9379-eff9c1039979'::uuid, 'P0-4 smoking pipe without age verification'),
    ('f1e91ec9-fda1-427d-bfb1-c8729c02ebf6'::uuid, 'P0-4 smoking pipe without age verification'),
    ('75879bdd-4cfa-4d30-82b6-d6286d009ae8'::uuid, 'P0-4 smoking pipe without age verification'),
    ('777c12be-5779-48d3-8770-466948078b80'::uuid, 'P0-4 flammable lighter (dangerous goods)'),
    ('7c4a6f41-12a9-4694-8d8a-c9a2d8ae6b74'::uuid, 'P0-4 lighter (dangerous goods)'),
    ('61130dd4-3743-4f88-b78e-9ae2d1c19f62'::uuid, 'P0-4 lighter (dangerous goods)'),
    ('c61e4e05-efbe-44f5-8146-cc6c0e9464ac'::uuid, 'P0-4 adult product'),
    ('56daf58a-9ba9-4155-baf8-13ad48e76465'::uuid, 'P0-4 unsupported health claim'),
    ('ee2a5a51-c2c4-4e94-a325-2a4742603396'::uuid, 'P0-4 unsupported health claim'),
    ('ffd6f0ea-7050-4bfe-b489-e90d57ca982e'::uuid, 'P0-4 medical device without approval'),
    ('4e9b38c0-276f-45b8-937e-1090e4d9b2ae'::uuid, 'P0-4 medical device without approval'),
    ('962bc622-be35-4bda-8ec7-dce585a227e4'::uuid, 'P0-4 medical device without approval'),
    ('eacf2202-5ada-40ad-bab2-53239729b18e'::uuid, 'P0-4 first-aid device with medical claims'),
    ('fec94a54-6c1a-4664-87fd-cfda8d38495b'::uuid, 'P0-4 vehicle key programming tool')
)
INSERT INTO catalog_archive.p0_4_unpublished (product_id, previous_status, previous_auto_unpublished, reason)
SELECT p.id, p.status, p.auto_unpublished, t.reason
FROM public.products p JOIN targets t ON t.id = p.id
ON CONFLICT (product_id) DO NOTHING;

UPDATE public.products p
SET status = 'draft',
    auto_unpublished = true,
    auto_unpublish_reason = a.reason,
    auto_unpublished_at = now()
FROM catalog_archive.p0_4_unpublished a
WHERE a.product_id = p.id
  AND p.status = 'active';
