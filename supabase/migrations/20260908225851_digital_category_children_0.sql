INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Online Courses', 'digital-online-courses', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-online-courses');
UPDATE public.product_categories c SET name='Online Courses', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-online-courses';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Tutorials', 'digital-tutorials', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-tutorials');
UPDATE public.product_categories c SET name='Tutorials', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-tutorials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Workshops', 'digital-workshops', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-workshops');
UPDATE public.product_categories c SET name='Workshops', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-workshops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Masterclasses', 'digital-masterclasses', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-masterclasses');
UPDATE public.product_categories c SET name='Masterclasses', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-masterclasses';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Study Materials', 'digital-study-materials', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-study-materials');
UPDATE public.product_categories c SET name='Study Materials', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-study-materials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Exam Preparation', 'digital-exam-preparation', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-exam-preparation');
UPDATE public.product_categories c SET name='Exam Preparation', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-exam-preparation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Educational Guides', 'digital-educational-guides', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-educational-guides');
UPDATE public.product_categories c SET name='Educational Guides', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-educational-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Study Notes', 'digital-study-notes', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-study-notes');
UPDATE public.product_categories c SET name='Study Notes', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-study-notes';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Ebooks', 'digital-education-ebooks', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-education-ebooks');
UPDATE public.product_categories c SET name='Ebooks', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-education-ebooks';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Research Materials', 'digital-research-materials', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-research-materials');
UPDATE public.product_categories c SET name='Research Materials', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-research-materials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Teaching Resources', 'digital-teaching-resources', 'digital', true, 11, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-teaching-resources');
UPDATE public.product_categories c SET name='Teaching Resources', category_type='digital', is_active=true, sort_order=11,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-teaching-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lesson Plans', 'digital-lesson-plans', 'digital', true, 12, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-lesson-plans');
UPDATE public.product_categories c SET name='Lesson Plans', category_type='digital', is_active=true, sort_order=12,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-lesson-plans';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Templates for Education', 'digital-education-templates', 'digital', true, 13, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-education-templates');
UPDATE public.product_categories c SET name='Templates for Education', category_type='digital', is_active=true, sort_order=13,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-education-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Certifications / Training Materials', 'digital-certifications-training', 'digital', true, 14, p.id
FROM public.product_categories p WHERE p.slug='digital-education-learning'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-certifications-training');
UPDATE public.product_categories c SET name='Certifications / Training Materials', category_type='digital', is_active=true, sort_order=14,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-education-learning' LIMIT 1) WHERE c.slug='digital-certifications-training';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Plans', 'digital-business-plans', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-business-plans');
UPDATE public.product_categories c SET name='Business Plans', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-business-plans';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Startup Resources', 'digital-startup-resources', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-startup-resources');
UPDATE public.product_categories c SET name='Startup Resources', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-startup-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Templates', 'digital-business-templates', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-business-templates');
UPDATE public.product_categories c SET name='Business Templates', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-business-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SOPs', 'digital-sops', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sops');
UPDATE public.product_categories c SET name='SOPs', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-sops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Operations Templates', 'digital-operations-templates', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-operations-templates');
UPDATE public.product_categories c SET name='Operations Templates', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-operations-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Strategy Documents', 'digital-strategy-documents', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-strategy-documents');
UPDATE public.product_categories c SET name='Strategy Documents', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-strategy-documents';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Consulting Resources', 'digital-consulting-resources', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-consulting-resources');
UPDATE public.product_categories c SET name='Consulting Resources', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-consulting-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sales Resources', 'digital-sales-resources', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sales-resources');
UPDATE public.product_categories c SET name='Sales Resources', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-sales-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Marketing Resources', 'digital-marketing-resources-biz', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-marketing-resources-biz');
UPDATE public.product_categories c SET name='Marketing Resources', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-marketing-resources-biz';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'HR Resources', 'digital-hr-resources', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-hr-resources');
UPDATE public.product_categories c SET name='HR Resources', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-hr-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Finance Resources', 'digital-finance-resources-biz', 'digital', true, 11, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-finance-resources-biz');
UPDATE public.product_categories c SET name='Finance Resources', category_type='digital', is_active=true, sort_order=11,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-finance-resources-biz';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Productivity Systems', 'digital-productivity-systems', 'digital', true, 12, p.id
FROM public.product_categories p WHERE p.slug='digital-business-entrepreneurship'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-productivity-systems');
UPDATE public.product_categories c SET name='Productivity Systems', category_type='digital', is_active=true, sort_order=12,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-business-entrepreneurship' LIMIT 1) WHERE c.slug='digital-productivity-systems';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Social Media Templates', 'digital-social-media-templates', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-social-media-templates');
UPDATE public.product_categories c SET name='Social Media Templates', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-social-media-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Content Calendars', 'digital-content-calendars', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-content-calendars');
UPDATE public.product_categories c SET name='Content Calendars', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-content-calendars';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Ad Templates', 'digital-ad-templates', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ad-templates');
UPDATE public.product_categories c SET name='Ad Templates', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-ad-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Copywriting Resources', 'digital-copywriting-resources', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-copywriting-resources');
UPDATE public.product_categories c SET name='Copywriting Resources', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-copywriting-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Email Marketing', 'digital-email-marketing', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-email-marketing');
UPDATE public.product_categories c SET name='Email Marketing', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-email-marketing';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sales Scripts', 'digital-sales-scripts', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sales-scripts');
UPDATE public.product_categories c SET name='Sales Scripts', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-sales-scripts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lead Generation', 'digital-lead-generation', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-lead-generation');
UPDATE public.product_categories c SET name='Lead Generation', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-lead-generation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Branding Resources', 'digital-branding-resources', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-branding-resources');
UPDATE public.product_categories c SET name='Branding Resources', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-branding-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SEO Resources', 'digital-seo-resources', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-seo-resources');
UPDATE public.product_categories c SET name='SEO Resources', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-seo-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Marketing Templates', 'digital-marketing-templates', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-marketing-sales'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-marketing-templates');
UPDATE public.product_categories c SET name='Marketing Templates', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-marketing-sales' LIMIT 1) WHERE c.slug='digital-marketing-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Graphics', 'digital-graphics', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-graphics');
UPDATE public.product_categories c SET name='Graphics', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-graphics';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Templates', 'digital-design-templates', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-design-templates');
UPDATE public.product_categories c SET name='Templates', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-design-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'UI Kits', 'digital-ui-kits', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ui-kits');
UPDATE public.product_categories c SET name='UI Kits', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-ui-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'UX Resources', 'digital-ux-resources', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ux-resources');
UPDATE public.product_categories c SET name='UX Resources', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-ux-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Icons', 'digital-icons', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-icons');
UPDATE public.product_categories c SET name='Icons', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-icons';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Illustrations', 'digital-illustrations', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-illustrations');
UPDATE public.product_categories c SET name='Illustrations', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-illustrations';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Fonts', 'digital-fonts', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-fonts');
UPDATE public.product_categories c SET name='Fonts', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-fonts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presets', 'digital-presets-design', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-presets-design');
UPDATE public.product_categories c SET name='Presets', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-presets-design';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Mockups', 'digital-mockups', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-mockups');
UPDATE public.product_categories c SET name='Mockups', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-mockups';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Brand Kits', 'digital-brand-kits', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-brand-kits');
UPDATE public.product_categories c SET name='Brand Kits', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-brand-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presentation Templates', 'digital-presentation-templates', 'digital', true, 11, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-presentation-templates');
UPDATE public.product_categories c SET name='Presentation Templates', category_type='digital', is_active=true, sort_order=11,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-presentation-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Printables', 'digital-printables', 'digital', true, 12, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-printables');
UPDATE public.product_categories c SET name='Printables', category_type='digital', is_active=true, sort_order=12,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-printables';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Design Assets', 'digital-design-assets', 'digital', true, 13, p.id
FROM public.product_categories p WHERE p.slug='digital-design-creative'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-design-assets');
UPDATE public.product_categories c SET name='Design Assets', category_type='digital', is_active=true, sort_order=13,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-design-creative' LIMIT 1) WHERE c.slug='digital-design-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Stock Photos', 'digital-stock-photos', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-stock-photos');
UPDATE public.product_categories c SET name='Stock Photos', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-stock-photos';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Stock Videos', 'digital-stock-videos', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-stock-videos');
UPDATE public.product_categories c SET name='Stock Videos', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-stock-videos';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'LUTs', 'digital-luts', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-luts');
UPDATE public.product_categories c SET name='LUTs', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-luts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presets', 'digital-presets-photo', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-presets-photo');
UPDATE public.product_categories c SET name='Presets', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-presets-photo';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Video Templates', 'digital-video-templates', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-video-templates');
UPDATE public.product_categories c SET name='Video Templates', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-video-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Motion Graphics', 'digital-motion-graphics', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-motion-graphics');
UPDATE public.product_categories c SET name='Motion Graphics', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-motion-graphics';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Editing Assets', 'digital-editing-assets', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-editing-assets');
UPDATE public.product_categories c SET name='Editing Assets', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-editing-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sound Effects', 'digital-sound-effects-av', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sound-effects-av');
UPDATE public.product_categories c SET name='Sound Effects', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-sound-effects-av';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Photography Guides', 'digital-photography-guides', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-photography-guides');
UPDATE public.product_categories c SET name='Photography Guides', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-photography-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Video Courses', 'digital-video-courses', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-photography-video'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-video-courses');
UPDATE public.product_categories c SET name='Video Courses', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-photography-video' LIMIT 1) WHERE c.slug='digital-video-courses';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Music', 'digital-music', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-music');
UPDATE public.product_categories c SET name='Music', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-music';