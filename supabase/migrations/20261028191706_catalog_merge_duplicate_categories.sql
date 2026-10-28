-- M-8: one taxonomy. Merge duplicate top categories created by two imports.
-- "Toys, Kids & Babies" children move under "Toys, Kids & Baby"; the empty
-- "Bag & Shoes" twin of "Bags & Shoes" is deactivated. Previous values are
-- archived in catalog_archive.
CREATE TABLE IF NOT EXISTS catalog_archive.category_merge_20261028 AS
SELECT id, slug, parent_id, is_active
FROM public.product_categories
WHERE slug IN ('toys-kids-babies', 'bag-shoes')
   OR parent_id IN (SELECT id FROM public.product_categories WHERE slug IN ('toys-kids-babies', 'bag-shoes'));

UPDATE public.product_categories c
SET parent_id = (SELECT id FROM public.product_categories WHERE slug = 'toys-kids-baby')
WHERE c.parent_id = (SELECT id FROM public.product_categories WHERE slug = 'toys-kids-babies')
  AND EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'toys-kids-baby');

UPDATE public.product_categories c
SET parent_id = (SELECT id FROM public.product_categories WHERE slug = 'bags-shoes')
WHERE c.parent_id = (SELECT id FROM public.product_categories WHERE slug = 'bag-shoes')
  AND EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'bags-shoes');

UPDATE public.product_categories
SET is_active = false
WHERE slug IN ('toys-kids-babies', 'bag-shoes')
  AND NOT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.category_id = product_categories.id AND p.status = 'active'
  );
