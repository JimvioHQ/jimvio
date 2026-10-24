INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Social Media Kits', 'digital-social-media-kits', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-social-media-kits');
UPDATE public.product_categories c SET name='Social Media Kits', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-social-media-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator Guides', 'digital-creator-guides', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-creator-guides');
UPDATE public.product_categories c SET name='Creator Guides', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-creator-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'UGC Resources', 'digital-ugc-resources', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ugc-resources');
UPDATE public.product_categories c SET name='UGC Resources', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-ugc-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Editing Templates', 'digital-editing-templates-creator', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-editing-templates-creator');
UPDATE public.product_categories c SET name='Editing Templates', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-editing-templates-creator';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator Business Tools', 'digital-creator-business-tools', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-creator-business-tools');
UPDATE public.product_categories c SET name='Creator Business Tools', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-creator-business-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sponsorship Resources', 'digital-sponsorship-resources', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-creator-influencer'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sponsorship-resources');
UPDATE public.product_categories c SET name='Sponsorship Resources', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-creator-influencer' LIMIT 1) WHERE c.slug='digital-sponsorship-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Fiction', 'digital-fiction', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-fiction');
UPDATE public.product_categories c SET name='Fiction', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-fiction';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Non-Fiction', 'digital-non-fiction', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-non-fiction');
UPDATE public.product_categories c SET name='Non-Fiction', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-non-fiction';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business', 'digital-ebooks-business', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ebooks-business');
UPDATE public.product_categories c SET name='Business', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-ebooks-business';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Education', 'digital-ebooks-education', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ebooks-education');
UPDATE public.product_categories c SET name='Education', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-ebooks-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Technology', 'digital-ebooks-technology', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ebooks-technology');
UPDATE public.product_categories c SET name='Technology', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-ebooks-technology';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Self-Development', 'digital-self-development', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-self-development');
UPDATE public.product_categories c SET name='Self-Development', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-self-development';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Guides', 'digital-guides-pubs', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-guides-pubs');
UPDATE public.product_categories c SET name='Guides', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-guides-pubs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Manuals', 'digital-manuals', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-manuals');
UPDATE public.product_categories c SET name='Manuals', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-manuals';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Workbooks', 'digital-workbooks', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-workbooks');
UPDATE public.product_categories c SET name='Workbooks', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-workbooks';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Reports', 'digital-reports', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-ebooks-publications'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-reports');
UPDATE public.product_categories c SET name='Reports', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ebooks-publications' LIMIT 1) WHERE c.slug='digital-reports';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Contracts / Legal Templates', 'digital-legal-templates', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-legal-templates');
UPDATE public.product_categories c SET name='Contracts / Legal Templates', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-legal-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Documents', 'digital-business-documents', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-business-documents');
UPDATE public.product_categories c SET name='Business Documents', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-business-documents';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Proposal Templates', 'digital-proposal-templates', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-proposal-templates');
UPDATE public.product_categories c SET name='Proposal Templates', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-proposal-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Invoice Templates', 'digital-invoice-templates', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-invoice-templates');
UPDATE public.product_categories c SET name='Invoice Templates', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-invoice-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Resume Templates', 'digital-resume-templates', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-resume-templates');
UPDATE public.product_categories c SET name='Resume Templates', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-resume-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presentation Templates', 'digital-presentation-docs', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-presentation-docs');
UPDATE public.product_categories c SET name='Presentation Templates', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-presentation-docs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Spreadsheet Templates', 'digital-spreadsheet-templates', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-spreadsheet-templates');
UPDATE public.product_categories c SET name='Spreadsheet Templates', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-spreadsheet-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Notion Templates', 'digital-notion-templates', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-notion-templates');
UPDATE public.product_categories c SET name='Notion Templates', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-notion-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Productivity Templates', 'digital-productivity-templates', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-documents-templates'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-productivity-templates');
UPDATE public.product_categories c SET name='Productivity Templates', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-documents-templates' LIMIT 1) WHERE c.slug='digital-productivity-templates';