-- M-2: Remove supplier/marketplace jargon from dropshipping product names.
-- CJ titles carry seller-side keywords ("European And American", "Hot
-- Selling", "Wholesale", "AliExpress", "Amazon", "Ins", "Qixi", "Foreign
-- Trade", "Explosion Models"…) that read as spam to buyers. Only the
-- matched phrases are removed; slugs and URLs do not change.
-- Previous names are archived in catalog_archive.m2_names_20261028.

CREATE TABLE IF NOT EXISTS catalog_archive.m2_names_20261028 (
  product_id uuid PRIMARY KEY,
  previous_name text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

WITH cleaned AS (
  SELECT id, name,
    trim(regexp_replace(regexp_replace(regexp_replace(name,
      '(european and american|europe and the united states|cross[- ]border|foreign trade|explosion models?|factory direct sales of|selling hot selling|hot selling|hot sale|wholesale|ins style|\mins\M|net red|aliexpress|amazon|\mwish\M|best sellers?|spot goods|han guo yin|qixi)',
      '', 'gi'),
      '\s*[,;/]\s*$', '', 'g'),
      '\s{2,}', ' ', 'g')) AS clean
  FROM public.products
  WHERE status = 'active' AND source = 'cj'
)
INSERT INTO catalog_archive.m2_names_20261028 (product_id, previous_name)
SELECT id, name FROM cleaned
WHERE clean <> name AND length(clean) >= 8
ON CONFLICT (product_id) DO NOTHING;

UPDATE public.products p
SET name = upper(left(c.clean, 1)) || substr(c.clean, 2)
FROM (
  SELECT a.product_id,
    trim(regexp_replace(regexp_replace(regexp_replace(a.previous_name,
      '(european and american|europe and the united states|cross[- ]border|foreign trade|explosion models?|factory direct sales of|selling hot selling|hot selling|hot sale|wholesale|ins style|\mins\M|net red|aliexpress|amazon|\mwish\M|best sellers?|spot goods|han guo yin|qixi)',
      '', 'gi'),
      '\s*[,;/]\s*$', '', 'g'),
      '\s{2,}', ' ', 'g')) AS clean
  FROM catalog_archive.m2_names_20261028 a
) c
WHERE c.product_id = p.id
  AND p.name IS DISTINCT FROM upper(left(c.clean, 1)) || substr(c.clean, 2);
