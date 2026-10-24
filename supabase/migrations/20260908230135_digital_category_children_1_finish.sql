INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Automation Templates', 'digital-automation-templates', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-automation-templates');
UPDATE public.product_categories c SET name='Automation Templates', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-automation-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Content Tools', 'digital-ai-content-tools', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-content-tools');
UPDATE public.product_categories c SET name='AI Content Tools', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-content-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Business Resources', 'digital-ai-business', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-business');
UPDATE public.product_categories c SET name='AI Business Resources', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-business';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Design Resources', 'digital-ai-design', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-design');
UPDATE public.product_categories c SET name='AI Design Resources', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-design';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Productivity Resources', 'digital-ai-productivity', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-productivity');
UPDATE public.product_categories c SET name='AI Productivity Resources', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-productivity';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Financial Templates', 'digital-financial-templates', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-financial-templates');
UPDATE public.product_categories c SET name='Financial Templates', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-financial-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Budgeting Tools', 'digital-budgeting-tools', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-budgeting-tools');
UPDATE public.product_categories c SET name='Budgeting Tools', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-budgeting-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Spreadsheets', 'digital-spreadsheets-finance', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-spreadsheets-finance');
UPDATE public.product_categories c SET name='Spreadsheets', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-spreadsheets-finance';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Financial Education', 'digital-financial-education', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-financial-education');
UPDATE public.product_categories c SET name='Financial Education', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-financial-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Trading Education', 'digital-trading-education', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-trading-education');
UPDATE public.product_categories c SET name='Trading Education', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-trading-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Investment Education', 'digital-investment-education', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-investment-education');
UPDATE public.product_categories c SET name='Investment Education', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-investment-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Finance Resources', 'digital-business-finance', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-business-finance');
UPDATE public.product_categories c SET name='Business Finance Resources', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-business-finance';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Tax Education Resources', 'digital-tax-education', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-finance-investing'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-tax-education');
UPDATE public.product_categories c SET name='Tax Education Resources', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-finance-investing' LIMIT 1) WHERE c.slug='digital-tax-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Workout Programs', 'digital-workout-programs', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-health-fitness'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-workout-programs');
UPDATE public.product_categories c SET name='Workout Programs', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-health-fitness' LIMIT 1) WHERE c.slug='digital-workout-programs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Fitness Guides', 'digital-fitness-guides', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-health-fitness'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-fitness-guides');
UPDATE public.product_categories c SET name='Fitness Guides', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-health-fitness' LIMIT 1) WHERE c.slug='digital-fitness-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Meal Planning Resources', 'digital-meal-planning', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-health-fitness'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-meal-planning');
UPDATE public.product_categories c SET name='Meal Planning Resources', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-health-fitness' LIMIT 1) WHERE c.slug='digital-meal-planning';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Wellness Guides', 'digital-wellness-guides', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-health-fitness'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-wellness-guides');
UPDATE public.product_categories c SET name='Wellness Guides', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-health-fitness' LIMIT 1) WHERE c.slug='digital-wellness-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Educational Materials', 'digital-health-education', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-health-fitness'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-health-education');
UPDATE public.product_categories c SET name='Educational Materials', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-health-fitness' LIMIT 1) WHERE c.slug='digital-health-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Training Programs', 'digital-training-programs', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-health-fitness'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-training-programs');
UPDATE public.product_categories c SET name='Training Programs', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-health-fitness' LIMIT 1) WHERE c.slug='digital-training-programs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Planners', 'digital-planners', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-planners');
UPDATE public.product_categories c SET name='Planners', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-planners';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Journals', 'digital-journals', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-journals');
UPDATE public.product_categories c SET name='Journals', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-journals';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Checklists', 'digital-checklists', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-checklists');
UPDATE public.product_categories c SET name='Checklists', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-checklists';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Guides', 'digital-lifestyle-guides', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-lifestyle-guides');
UPDATE public.product_categories c SET name='Guides', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-lifestyle-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Travel Resources', 'digital-travel-resources', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-travel-resources');
UPDATE public.product_categories c SET name='Travel Resources', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-travel-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lifestyle Templates', 'digital-lifestyle-templates', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-lifestyle-templates');
UPDATE public.product_categories c SET name='Lifestyle Templates', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-lifestyle-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Personal Development', 'digital-personal-development', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-personal-development');
UPDATE public.product_categories c SET name='Personal Development', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-personal-development';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Productivity', 'digital-productivity', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-lifestyle'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-productivity');
UPDATE public.product_categories c SET name='Productivity', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-lifestyle' LIMIT 1) WHERE c.slug='digital-productivity';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator Templates', 'digital-creator-templates', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-creator-templates');
UPDATE public.product_categories c SET name='Creator Templates', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-creator-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Media Kits', 'digital-media-kits', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-media-kits');
UPDATE public.product_categories c SET name='Media Kits', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-media-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Content Templates', 'digital-content-templates', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-content-templates');
UPDATE public.product_categories c SET name='Content Templates', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-content-templates';