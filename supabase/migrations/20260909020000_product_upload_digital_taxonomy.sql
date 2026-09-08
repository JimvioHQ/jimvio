-- Product upload: review statuses + digital taxonomy
DO $$ BEGIN
  ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'pending_review';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Education & Learning', 'digital-education-learning', 'digital', true, 10, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-education-learning');
UPDATE public.product_categories
SET name = 'Education & Learning', category_type = 'digital', is_active = true, sort_order = 10, parent_id = NULL
WHERE slug = 'digital-education-learning';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Online Courses', 'digital-online-courses', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-online-courses');
UPDATE public.product_categories c
SET name = 'Online Courses', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-online-courses';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Tutorials', 'digital-tutorials', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-tutorials');
UPDATE public.product_categories c
SET name = 'Tutorials', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-tutorials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Workshops', 'digital-workshops', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-workshops');
UPDATE public.product_categories c
SET name = 'Workshops', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-workshops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Masterclasses', 'digital-masterclasses', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-masterclasses');
UPDATE public.product_categories c
SET name = 'Masterclasses', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-masterclasses';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Study Materials', 'digital-study-materials', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-study-materials');
UPDATE public.product_categories c
SET name = 'Study Materials', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-study-materials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Exam Preparation', 'digital-exam-preparation', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-exam-preparation');
UPDATE public.product_categories c
SET name = 'Exam Preparation', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-exam-preparation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Educational Guides', 'digital-educational-guides', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-educational-guides');
UPDATE public.product_categories c
SET name = 'Educational Guides', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-educational-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Study Notes', 'digital-study-notes', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-study-notes');
UPDATE public.product_categories c
SET name = 'Study Notes', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-study-notes';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Ebooks', 'digital-education-ebooks', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-education-ebooks');
UPDATE public.product_categories c
SET name = 'Ebooks', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-education-ebooks';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Research Materials', 'digital-research-materials', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-research-materials');
UPDATE public.product_categories c
SET name = 'Research Materials', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-research-materials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Teaching Resources', 'digital-teaching-resources', 'digital', true, 11, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-teaching-resources');
UPDATE public.product_categories c
SET name = 'Teaching Resources', category_type = 'digital', is_active = true, sort_order = 11,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-teaching-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lesson Plans', 'digital-lesson-plans', 'digital', true, 12, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-lesson-plans');
UPDATE public.product_categories c
SET name = 'Lesson Plans', category_type = 'digital', is_active = true, sort_order = 12,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-lesson-plans';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Templates for Education', 'digital-education-templates', 'digital', true, 13, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-education-templates');
UPDATE public.product_categories c
SET name = 'Templates for Education', category_type = 'digital', is_active = true, sort_order = 13,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-education-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Certifications / Training Materials', 'digital-certifications-training', 'digital', true, 14, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-education-learning'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-certifications-training');
UPDATE public.product_categories c
SET name = 'Certifications / Training Materials', category_type = 'digital', is_active = true, sort_order = 14,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-education-learning' LIMIT 1)
WHERE c.slug = 'digital-certifications-training';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business & Entrepreneurship', 'digital-business-entrepreneurship', 'digital', true, 20, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship');
UPDATE public.product_categories
SET name = 'Business & Entrepreneurship', category_type = 'digital', is_active = true, sort_order = 20, parent_id = NULL
WHERE slug = 'digital-business-entrepreneurship';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Plans', 'digital-business-plans', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-business-plans');
UPDATE public.product_categories c
SET name = 'Business Plans', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-business-plans';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Startup Resources', 'digital-startup-resources', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-startup-resources');
UPDATE public.product_categories c
SET name = 'Startup Resources', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-startup-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Templates', 'digital-business-templates', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-business-templates');
UPDATE public.product_categories c
SET name = 'Business Templates', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-business-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SOPs', 'digital-sops', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sops');
UPDATE public.product_categories c
SET name = 'SOPs', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-sops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Operations Templates', 'digital-operations-templates', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-operations-templates');
UPDATE public.product_categories c
SET name = 'Operations Templates', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-operations-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Strategy Documents', 'digital-strategy-documents', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-strategy-documents');
UPDATE public.product_categories c
SET name = 'Strategy Documents', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-strategy-documents';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Consulting Resources', 'digital-consulting-resources', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-consulting-resources');
UPDATE public.product_categories c
SET name = 'Consulting Resources', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-consulting-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sales Resources', 'digital-sales-resources', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sales-resources');
UPDATE public.product_categories c
SET name = 'Sales Resources', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-sales-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Marketing Resources', 'digital-marketing-resources-biz', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-marketing-resources-biz');
UPDATE public.product_categories c
SET name = 'Marketing Resources', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-marketing-resources-biz';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'HR Resources', 'digital-hr-resources', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-hr-resources');
UPDATE public.product_categories c
SET name = 'HR Resources', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-hr-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Finance Resources', 'digital-finance-resources-biz', 'digital', true, 11, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-finance-resources-biz');
UPDATE public.product_categories c
SET name = 'Finance Resources', category_type = 'digital', is_active = true, sort_order = 11,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-finance-resources-biz';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Productivity Systems', 'digital-productivity-systems', 'digital', true, 12, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-business-entrepreneurship'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-productivity-systems');
UPDATE public.product_categories c
SET name = 'Productivity Systems', category_type = 'digital', is_active = true, sort_order = 12,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship' LIMIT 1)
WHERE c.slug = 'digital-productivity-systems';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Marketing & Sales', 'digital-marketing-sales', 'digital', true, 30, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-marketing-sales');
UPDATE public.product_categories
SET name = 'Marketing & Sales', category_type = 'digital', is_active = true, sort_order = 30, parent_id = NULL
WHERE slug = 'digital-marketing-sales';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Social Media Templates', 'digital-social-media-templates', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-social-media-templates');
UPDATE public.product_categories c
SET name = 'Social Media Templates', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-social-media-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Content Calendars', 'digital-content-calendars', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-content-calendars');
UPDATE public.product_categories c
SET name = 'Content Calendars', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-content-calendars';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Ad Templates', 'digital-ad-templates', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ad-templates');
UPDATE public.product_categories c
SET name = 'Ad Templates', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-ad-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Copywriting Resources', 'digital-copywriting-resources', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-copywriting-resources');
UPDATE public.product_categories c
SET name = 'Copywriting Resources', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-copywriting-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Email Marketing', 'digital-email-marketing', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-email-marketing');
UPDATE public.product_categories c
SET name = 'Email Marketing', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-email-marketing';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sales Scripts', 'digital-sales-scripts', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sales-scripts');
UPDATE public.product_categories c
SET name = 'Sales Scripts', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-sales-scripts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lead Generation', 'digital-lead-generation', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-lead-generation');
UPDATE public.product_categories c
SET name = 'Lead Generation', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-lead-generation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Branding Resources', 'digital-branding-resources', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-branding-resources');
UPDATE public.product_categories c
SET name = 'Branding Resources', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-branding-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SEO Resources', 'digital-seo-resources', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-seo-resources');
UPDATE public.product_categories c
SET name = 'SEO Resources', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-seo-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Marketing Templates', 'digital-marketing-templates', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-marketing-sales'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-marketing-templates');
UPDATE public.product_categories c
SET name = 'Marketing Templates', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-marketing-sales' LIMIT 1)
WHERE c.slug = 'digital-marketing-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Design & Creative', 'digital-design-creative', 'digital', true, 40, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-design-creative');
UPDATE public.product_categories
SET name = 'Design & Creative', category_type = 'digital', is_active = true, sort_order = 40, parent_id = NULL
WHERE slug = 'digital-design-creative';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Graphics', 'digital-graphics', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-graphics');
UPDATE public.product_categories c
SET name = 'Graphics', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-graphics';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Templates', 'digital-design-templates', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-design-templates');
UPDATE public.product_categories c
SET name = 'Templates', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-design-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'UI Kits', 'digital-ui-kits', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ui-kits');
UPDATE public.product_categories c
SET name = 'UI Kits', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-ui-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'UX Resources', 'digital-ux-resources', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ux-resources');
UPDATE public.product_categories c
SET name = 'UX Resources', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-ux-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Icons', 'digital-icons', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-icons');
UPDATE public.product_categories c
SET name = 'Icons', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-icons';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Illustrations', 'digital-illustrations', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-illustrations');
UPDATE public.product_categories c
SET name = 'Illustrations', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-illustrations';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Fonts', 'digital-fonts', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-fonts');
UPDATE public.product_categories c
SET name = 'Fonts', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-fonts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presets', 'digital-presets-design', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-presets-design');
UPDATE public.product_categories c
SET name = 'Presets', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-presets-design';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Mockups', 'digital-mockups', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-mockups');
UPDATE public.product_categories c
SET name = 'Mockups', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-mockups';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Brand Kits', 'digital-brand-kits', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-brand-kits');
UPDATE public.product_categories c
SET name = 'Brand Kits', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-brand-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presentation Templates', 'digital-presentation-templates', 'digital', true, 11, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-presentation-templates');
UPDATE public.product_categories c
SET name = 'Presentation Templates', category_type = 'digital', is_active = true, sort_order = 11,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-presentation-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Printables', 'digital-printables', 'digital', true, 12, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-printables');
UPDATE public.product_categories c
SET name = 'Printables', category_type = 'digital', is_active = true, sort_order = 12,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-printables';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Design Assets', 'digital-design-assets', 'digital', true, 13, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-design-creative'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-design-assets');
UPDATE public.product_categories c
SET name = 'Design Assets', category_type = 'digital', is_active = true, sort_order = 13,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-design-creative' LIMIT 1)
WHERE c.slug = 'digital-design-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Photography & Video', 'digital-photography-video', 'digital', true, 50, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-photography-video');
UPDATE public.product_categories
SET name = 'Photography & Video', category_type = 'digital', is_active = true, sort_order = 50, parent_id = NULL
WHERE slug = 'digital-photography-video';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Stock Photos', 'digital-stock-photos', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-stock-photos');
UPDATE public.product_categories c
SET name = 'Stock Photos', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-stock-photos';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Stock Videos', 'digital-stock-videos', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-stock-videos');
UPDATE public.product_categories c
SET name = 'Stock Videos', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-stock-videos';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'LUTs', 'digital-luts', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-luts');
UPDATE public.product_categories c
SET name = 'LUTs', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-luts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presets', 'digital-presets-photo', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-presets-photo');
UPDATE public.product_categories c
SET name = 'Presets', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-presets-photo';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Video Templates', 'digital-video-templates', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-video-templates');
UPDATE public.product_categories c
SET name = 'Video Templates', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-video-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Motion Graphics', 'digital-motion-graphics', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-motion-graphics');
UPDATE public.product_categories c
SET name = 'Motion Graphics', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-motion-graphics';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Editing Assets', 'digital-editing-assets', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-editing-assets');
UPDATE public.product_categories c
SET name = 'Editing Assets', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-editing-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sound Effects', 'digital-sound-effects-av', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sound-effects-av');
UPDATE public.product_categories c
SET name = 'Sound Effects', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-sound-effects-av';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Photography Guides', 'digital-photography-guides', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-photography-guides');
UPDATE public.product_categories c
SET name = 'Photography Guides', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-photography-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Video Courses', 'digital-video-courses', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-photography-video'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-video-courses');
UPDATE public.product_categories c
SET name = 'Video Courses', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-photography-video' LIMIT 1)
WHERE c.slug = 'digital-video-courses';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Music & Audio', 'digital-music-audio', 'digital', true, 60, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-music-audio');
UPDATE public.product_categories
SET name = 'Music & Audio', category_type = 'digital', is_active = true, sort_order = 60, parent_id = NULL
WHERE slug = 'digital-music-audio';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Music', 'digital-music', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-music');
UPDATE public.product_categories c
SET name = 'Music', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-music';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Beats', 'digital-beats', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-beats');
UPDATE public.product_categories c
SET name = 'Beats', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-beats';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Instrumentals', 'digital-instrumentals', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-instrumentals');
UPDATE public.product_categories c
SET name = 'Instrumentals', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-instrumentals';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Samples', 'digital-samples', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-samples');
UPDATE public.product_categories c
SET name = 'Samples', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-samples';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sound Packs', 'digital-sound-packs', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sound-packs');
UPDATE public.product_categories c
SET name = 'Sound Packs', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-sound-packs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Loops', 'digital-loops', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-loops');
UPDATE public.product_categories c
SET name = 'Loops', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-loops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presets', 'digital-audio-presets', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-audio-presets');
UPDATE public.product_categories c
SET name = 'Presets', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-audio-presets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Audio Templates', 'digital-audio-templates', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-audio-templates');
UPDATE public.product_categories c
SET name = 'Audio Templates', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-audio-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Podcasts', 'digital-podcasts', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-podcasts');
UPDATE public.product_categories c
SET name = 'Podcasts', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-podcasts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Audiobooks', 'digital-audiobooks', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-audiobooks');
UPDATE public.product_categories c
SET name = 'Audiobooks', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-audiobooks';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Voice Assets', 'digital-voice-assets', 'digital', true, 11, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-voice-assets');
UPDATE public.product_categories c
SET name = 'Voice Assets', category_type = 'digital', is_active = true, sort_order = 11,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-voice-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SFX', 'digital-sfx', 'digital', true, 12, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-music-audio'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sfx');
UPDATE public.product_categories c
SET name = 'SFX', category_type = 'digital', is_active = true, sort_order = 12,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-music-audio' LIMIT 1)
WHERE c.slug = 'digital-sfx';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Software & Technology', 'digital-software-technology', 'digital', true, 70, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-software-technology');
UPDATE public.product_categories
SET name = 'Software & Technology', category_type = 'digital', is_active = true, sort_order = 70, parent_id = NULL
WHERE slug = 'digital-software-technology';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Software', 'digital-software', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-software');
UPDATE public.product_categories c
SET name = 'Software', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-software';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SaaS Resources', 'digital-saas-resources', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-saas-resources');
UPDATE public.product_categories c
SET name = 'SaaS Resources', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-saas-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Code', 'digital-code', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-code');
UPDATE public.product_categories c
SET name = 'Code', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Source Code', 'digital-source-code', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-source-code');
UPDATE public.product_categories c
SET name = 'Source Code', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-source-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Scripts', 'digital-scripts', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-scripts');
UPDATE public.product_categories c
SET name = 'Scripts', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-scripts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Plugins', 'digital-plugins', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-plugins');
UPDATE public.product_categories c
SET name = 'Plugins', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-plugins';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Themes', 'digital-themes', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-themes');
UPDATE public.product_categories c
SET name = 'Themes', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-themes';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Extensions', 'digital-extensions', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-extensions');
UPDATE public.product_categories c
SET name = 'Extensions', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-extensions';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'APIs', 'digital-apis', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-apis');
UPDATE public.product_categories c
SET name = 'APIs', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-apis';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Developer Tools', 'digital-developer-tools', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-developer-tools');
UPDATE public.product_categories c
SET name = 'Developer Tools', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-developer-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Automation', 'digital-automation', 'digital', true, 11, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-automation');
UPDATE public.product_categories c
SET name = 'Automation', category_type = 'digital', is_active = true, sort_order = 11,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-automation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'No-Code Resources', 'digital-no-code', 'digital', true, 12, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-no-code');
UPDATE public.product_categories c
SET name = 'No-Code Resources', category_type = 'digital', is_active = true, sort_order = 12,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-no-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Low-Code Resources', 'digital-low-code', 'digital', true, 13, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-low-code');
UPDATE public.product_categories c
SET name = 'Low-Code Resources', category_type = 'digital', is_active = true, sort_order = 13,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-low-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Databases / Data Resources', 'digital-data-resources', 'digital', true, 14, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-software-technology'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-data-resources');
UPDATE public.product_categories c
SET name = 'Databases / Data Resources', category_type = 'digital', is_active = true, sort_order = 14,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-software-technology' LIMIT 1)
WHERE c.slug = 'digital-data-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI & Automation', 'digital-ai-automation', 'digital', true, 80, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-ai-automation');
UPDATE public.product_categories
SET name = 'AI & Automation', category_type = 'digital', is_active = true, sort_order = 80, parent_id = NULL
WHERE slug = 'digital-ai-automation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Prompts', 'digital-ai-prompts', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-prompts');
UPDATE public.product_categories c
SET name = 'AI Prompts', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-prompts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Prompt Packs', 'digital-prompt-packs', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-prompt-packs');
UPDATE public.product_categories c
SET name = 'Prompt Packs', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-prompt-packs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Workflows', 'digital-ai-workflows', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-workflows');
UPDATE public.product_categories c
SET name = 'AI Workflows', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-workflows';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Templates', 'digital-ai-templates', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-templates');
UPDATE public.product_categories c
SET name = 'AI Templates', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Agents', 'digital-ai-agents', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-agents');
UPDATE public.product_categories c
SET name = 'AI Agents', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-agents';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Automation Templates', 'digital-automation-templates', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-automation-templates');
UPDATE public.product_categories c
SET name = 'Automation Templates', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-automation-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Content Tools', 'digital-ai-content-tools', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-content-tools');
UPDATE public.product_categories c
SET name = 'AI Content Tools', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-content-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Business Resources', 'digital-ai-business', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-business');
UPDATE public.product_categories c
SET name = 'AI Business Resources', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-business';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Design Resources', 'digital-ai-design', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-design');
UPDATE public.product_categories c
SET name = 'AI Design Resources', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-design';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Productivity Resources', 'digital-ai-productivity', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ai-automation'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ai-productivity');
UPDATE public.product_categories c
SET name = 'AI Productivity Resources', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ai-automation' LIMIT 1)
WHERE c.slug = 'digital-ai-productivity';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Finance & Investing', 'digital-finance-investing', 'digital', true, 90, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-finance-investing');
UPDATE public.product_categories
SET name = 'Finance & Investing', category_type = 'digital', is_active = true, sort_order = 90, parent_id = NULL
WHERE slug = 'digital-finance-investing';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Financial Templates', 'digital-financial-templates', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-financial-templates');
UPDATE public.product_categories c
SET name = 'Financial Templates', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-financial-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Budgeting Tools', 'digital-budgeting-tools', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-budgeting-tools');
UPDATE public.product_categories c
SET name = 'Budgeting Tools', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-budgeting-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Spreadsheets', 'digital-spreadsheets-finance', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-spreadsheets-finance');
UPDATE public.product_categories c
SET name = 'Spreadsheets', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-spreadsheets-finance';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Financial Education', 'digital-financial-education', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-financial-education');
UPDATE public.product_categories c
SET name = 'Financial Education', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-financial-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Trading Education', 'digital-trading-education', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-trading-education');
UPDATE public.product_categories c
SET name = 'Trading Education', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-trading-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Investment Education', 'digital-investment-education', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-investment-education');
UPDATE public.product_categories c
SET name = 'Investment Education', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-investment-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Finance Resources', 'digital-business-finance', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-business-finance');
UPDATE public.product_categories c
SET name = 'Business Finance Resources', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-business-finance';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Tax Education Resources', 'digital-tax-education', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-finance-investing'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-tax-education');
UPDATE public.product_categories c
SET name = 'Tax Education Resources', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-finance-investing' LIMIT 1)
WHERE c.slug = 'digital-tax-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Health & Fitness', 'digital-health-fitness', 'digital', true, 100, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-health-fitness');
UPDATE public.product_categories
SET name = 'Health & Fitness', category_type = 'digital', is_active = true, sort_order = 100, parent_id = NULL
WHERE slug = 'digital-health-fitness';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Workout Programs', 'digital-workout-programs', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-health-fitness'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-workout-programs');
UPDATE public.product_categories c
SET name = 'Workout Programs', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-health-fitness' LIMIT 1)
WHERE c.slug = 'digital-workout-programs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Fitness Guides', 'digital-fitness-guides', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-health-fitness'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-fitness-guides');
UPDATE public.product_categories c
SET name = 'Fitness Guides', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-health-fitness' LIMIT 1)
WHERE c.slug = 'digital-fitness-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Meal Planning Resources', 'digital-meal-planning', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-health-fitness'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-meal-planning');
UPDATE public.product_categories c
SET name = 'Meal Planning Resources', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-health-fitness' LIMIT 1)
WHERE c.slug = 'digital-meal-planning';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Wellness Guides', 'digital-wellness-guides', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-health-fitness'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-wellness-guides');
UPDATE public.product_categories c
SET name = 'Wellness Guides', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-health-fitness' LIMIT 1)
WHERE c.slug = 'digital-wellness-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Educational Materials', 'digital-health-education', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-health-fitness'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-health-education');
UPDATE public.product_categories c
SET name = 'Educational Materials', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-health-fitness' LIMIT 1)
WHERE c.slug = 'digital-health-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Training Programs', 'digital-training-programs', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-health-fitness'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-training-programs');
UPDATE public.product_categories c
SET name = 'Training Programs', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-health-fitness' LIMIT 1)
WHERE c.slug = 'digital-training-programs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lifestyle', 'digital-lifestyle', 'digital', true, 110, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-lifestyle');
UPDATE public.product_categories
SET name = 'Lifestyle', category_type = 'digital', is_active = true, sort_order = 110, parent_id = NULL
WHERE slug = 'digital-lifestyle';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Planners', 'digital-planners', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-planners');
UPDATE public.product_categories c
SET name = 'Planners', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-planners';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Journals', 'digital-journals', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-journals');
UPDATE public.product_categories c
SET name = 'Journals', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-journals';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Checklists', 'digital-checklists', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-checklists');
UPDATE public.product_categories c
SET name = 'Checklists', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-checklists';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Guides', 'digital-lifestyle-guides', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-lifestyle-guides');
UPDATE public.product_categories c
SET name = 'Guides', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-lifestyle-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Travel Resources', 'digital-travel-resources', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-travel-resources');
UPDATE public.product_categories c
SET name = 'Travel Resources', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-travel-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lifestyle Templates', 'digital-lifestyle-templates', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-lifestyle-templates');
UPDATE public.product_categories c
SET name = 'Lifestyle Templates', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-lifestyle-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Personal Development', 'digital-personal-development', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-personal-development');
UPDATE public.product_categories c
SET name = 'Personal Development', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-personal-development';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Productivity', 'digital-productivity', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-lifestyle'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-productivity');
UPDATE public.product_categories c
SET name = 'Productivity', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-lifestyle' LIMIT 1)
WHERE c.slug = 'digital-productivity';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator & Influencer', 'digital-creator-influencer', 'digital', true, 120, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-creator-influencer');
UPDATE public.product_categories
SET name = 'Creator & Influencer', category_type = 'digital', is_active = true, sort_order = 120, parent_id = NULL
WHERE slug = 'digital-creator-influencer';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator Templates', 'digital-creator-templates', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-creator-templates');
UPDATE public.product_categories c
SET name = 'Creator Templates', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-creator-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Media Kits', 'digital-media-kits', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-media-kits');
UPDATE public.product_categories c
SET name = 'Media Kits', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-media-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Content Templates', 'digital-content-templates', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-content-templates');
UPDATE public.product_categories c
SET name = 'Content Templates', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-content-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Social Media Kits', 'digital-social-media-kits', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-social-media-kits');
UPDATE public.product_categories c
SET name = 'Social Media Kits', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-social-media-kits';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator Guides', 'digital-creator-guides', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-creator-guides');
UPDATE public.product_categories c
SET name = 'Creator Guides', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-creator-guides';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'UGC Resources', 'digital-ugc-resources', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ugc-resources');
UPDATE public.product_categories c
SET name = 'UGC Resources', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-ugc-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Editing Templates', 'digital-editing-templates-creator', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-editing-templates-creator');
UPDATE public.product_categories c
SET name = 'Editing Templates', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-editing-templates-creator';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator Business Tools', 'digital-creator-business-tools', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-creator-business-tools');
UPDATE public.product_categories c
SET name = 'Creator Business Tools', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-creator-business-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sponsorship Resources', 'digital-sponsorship-resources', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-creator-influencer'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-sponsorship-resources');
UPDATE public.product_categories c
SET name = 'Sponsorship Resources', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-creator-influencer' LIMIT 1)
WHERE c.slug = 'digital-sponsorship-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Ebooks & Publications', 'digital-ebooks-publications', 'digital', true, 130, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-ebooks-publications');
UPDATE public.product_categories
SET name = 'Ebooks & Publications', category_type = 'digital', is_active = true, sort_order = 130, parent_id = NULL
WHERE slug = 'digital-ebooks-publications';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Fiction', 'digital-fiction', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-fiction');
UPDATE public.product_categories c
SET name = 'Fiction', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-fiction';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Non-Fiction', 'digital-non-fiction', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-non-fiction');
UPDATE public.product_categories c
SET name = 'Non-Fiction', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-non-fiction';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business', 'digital-ebooks-business', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ebooks-business');
UPDATE public.product_categories c
SET name = 'Business', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-ebooks-business';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Education', 'digital-ebooks-education', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ebooks-education');
UPDATE public.product_categories c
SET name = 'Education', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-ebooks-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Technology', 'digital-ebooks-technology', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-ebooks-technology');
UPDATE public.product_categories c
SET name = 'Technology', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-ebooks-technology';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Self-Development', 'digital-self-development', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-self-development');
UPDATE public.product_categories c
SET name = 'Self-Development', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-self-development';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Guides', 'digital-guides-pubs', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-guides-pubs');
UPDATE public.product_categories c
SET name = 'Guides', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-guides-pubs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Manuals', 'digital-manuals', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-manuals');
UPDATE public.product_categories c
SET name = 'Manuals', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-manuals';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Workbooks', 'digital-workbooks', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-workbooks');
UPDATE public.product_categories c
SET name = 'Workbooks', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-workbooks';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Reports', 'digital-reports', 'digital', true, 10, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-ebooks-publications'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-reports');
UPDATE public.product_categories c
SET name = 'Reports', category_type = 'digital', is_active = true, sort_order = 10,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-ebooks-publications' LIMIT 1)
WHERE c.slug = 'digital-reports';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Documents & Templates', 'digital-documents-templates', 'digital', true, 140, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-documents-templates');
UPDATE public.product_categories
SET name = 'Documents & Templates', category_type = 'digital', is_active = true, sort_order = 140, parent_id = NULL
WHERE slug = 'digital-documents-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Contracts / Legal Templates', 'digital-legal-templates', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-legal-templates');
UPDATE public.product_categories c
SET name = 'Contracts / Legal Templates', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-legal-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business Documents', 'digital-business-documents', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-business-documents');
UPDATE public.product_categories c
SET name = 'Business Documents', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-business-documents';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Proposal Templates', 'digital-proposal-templates', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-proposal-templates');
UPDATE public.product_categories c
SET name = 'Proposal Templates', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-proposal-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Invoice Templates', 'digital-invoice-templates', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-invoice-templates');
UPDATE public.product_categories c
SET name = 'Invoice Templates', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-invoice-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Resume Templates', 'digital-resume-templates', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-resume-templates');
UPDATE public.product_categories c
SET name = 'Resume Templates', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-resume-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presentation Templates', 'digital-presentation-docs', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-presentation-docs');
UPDATE public.product_categories c
SET name = 'Presentation Templates', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-presentation-docs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Spreadsheet Templates', 'digital-spreadsheet-templates', 'digital', true, 7, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-spreadsheet-templates');
UPDATE public.product_categories c
SET name = 'Spreadsheet Templates', category_type = 'digital', is_active = true, sort_order = 7,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-spreadsheet-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Notion Templates', 'digital-notion-templates', 'digital', true, 8, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-notion-templates');
UPDATE public.product_categories c
SET name = 'Notion Templates', category_type = 'digital', is_active = true, sort_order = 8,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-notion-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Productivity Templates', 'digital-productivity-templates', 'digital', true, 9, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-documents-templates'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-productivity-templates');
UPDATE public.product_categories c
SET name = 'Productivity Templates', category_type = 'digital', is_active = true, sort_order = 9,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-documents-templates' LIMIT 1)
WHERE c.slug = 'digital-productivity-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Memberships & Digital Access', 'digital-memberships-access', 'digital', true, 150, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-memberships-access');
UPDATE public.product_categories
SET name = 'Memberships & Digital Access', category_type = 'digital', is_active = true, sort_order = 150, parent_id = NULL
WHERE slug = 'digital-memberships-access';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Memberships', 'digital-memberships', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-memberships-access'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-memberships');
UPDATE public.product_categories c
SET name = 'Memberships', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-memberships-access' LIMIT 1)
WHERE c.slug = 'digital-memberships';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Communities', 'digital-communities', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-memberships-access'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-communities');
UPDATE public.product_categories c
SET name = 'Communities', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-memberships-access' LIMIT 1)
WHERE c.slug = 'digital-communities';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Premium Content', 'digital-premium-content', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-memberships-access'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-premium-content');
UPDATE public.product_categories c
SET name = 'Premium Content', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-memberships-access' LIMIT 1)
WHERE c.slug = 'digital-premium-content';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Digital Subscriptions', 'digital-subscriptions', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-memberships-access'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-subscriptions');
UPDATE public.product_categories c
SET name = 'Digital Subscriptions', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-memberships-access' LIMIT 1)
WHERE c.slug = 'digital-subscriptions';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Resource Libraries', 'digital-resource-libraries', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-memberships-access'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-resource-libraries');
UPDATE public.product_categories c
SET name = 'Resource Libraries', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-memberships-access' LIMIT 1)
WHERE c.slug = 'digital-resource-libraries';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Exclusive Access', 'digital-exclusive-access', 'digital', true, 6, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-memberships-access'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-exclusive-access');
UPDATE public.product_categories c
SET name = 'Exclusive Access', category_type = 'digital', is_active = true, sort_order = 6,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-memberships-access' LIMIT 1)
WHERE c.slug = 'digital-exclusive-access';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Events & Experiences', 'digital-events-experiences', 'digital', true, 160, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-events-experiences');
UPDATE public.product_categories
SET name = 'Events & Experiences', category_type = 'digital', is_active = true, sort_order = 160, parent_id = NULL
WHERE slug = 'digital-events-experiences';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Digital Events', 'digital-events', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-events-experiences'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-events');
UPDATE public.product_categories c
SET name = 'Digital Events', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-events-experiences' LIMIT 1)
WHERE c.slug = 'digital-events';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Webinars', 'digital-webinars', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-events-experiences'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-webinars');
UPDATE public.product_categories c
SET name = 'Webinars', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-events-experiences' LIMIT 1)
WHERE c.slug = 'digital-webinars';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Virtual Workshops', 'digital-virtual-workshops', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-events-experiences'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-virtual-workshops');
UPDATE public.product_categories c
SET name = 'Virtual Workshops', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-events-experiences' LIMIT 1)
WHERE c.slug = 'digital-virtual-workshops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Conference Materials', 'digital-conference-materials', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-events-experiences'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-conference-materials');
UPDATE public.product_categories c
SET name = 'Conference Materials', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-events-experiences' LIMIT 1)
WHERE c.slug = 'digital-conference-materials';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Tickets', 'digital-tickets', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-events-experiences'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-tickets');
UPDATE public.product_categories c
SET name = 'Tickets', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-events-experiences' LIMIT 1)
WHERE c.slug = 'digital-tickets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Games & Entertainment', 'digital-games-entertainment', 'digital', true, 170, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-games-entertainment');
UPDATE public.product_categories
SET name = 'Games & Entertainment', category_type = 'digital', is_active = true, sort_order = 170, parent_id = NULL
WHERE slug = 'digital-games-entertainment';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Game Assets', 'digital-game-assets', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-games-entertainment'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-game-assets');
UPDATE public.product_categories c
SET name = 'Game Assets', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-games-entertainment' LIMIT 1)
WHERE c.slug = 'digital-game-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Game Mods', 'digital-game-mods', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-games-entertainment'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-game-mods');
UPDATE public.product_categories c
SET name = 'Game Mods', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-games-entertainment' LIMIT 1)
WHERE c.slug = 'digital-game-mods';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Digital Entertainment', 'digital-entertainment', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-games-entertainment'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-entertainment');
UPDATE public.product_categories c
SET name = 'Digital Entertainment', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-games-entertainment' LIMIT 1)
WHERE c.slug = 'digital-entertainment';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Game Development Resources', 'digital-game-dev-resources', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-games-entertainment'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-game-dev-resources');
UPDATE public.product_categories c
SET name = 'Game Development Resources', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-games-entertainment' LIMIT 1)
WHERE c.slug = 'digital-game-dev-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Religion / Culture / Language', 'digital-culture-language', 'digital', true, 180, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-culture-language');
UPDATE public.product_categories
SET name = 'Religion / Culture / Language', category_type = 'digital', is_active = true, sort_order = 180, parent_id = NULL
WHERE slug = 'digital-culture-language';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Language Learning', 'digital-language-learning', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-culture-language'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-language-learning');
UPDATE public.product_categories c
SET name = 'Language Learning', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-culture-language' LIMIT 1)
WHERE c.slug = 'digital-language-learning';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Cultural Resources', 'digital-cultural-resources', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-culture-language'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-cultural-resources');
UPDATE public.product_categories c
SET name = 'Cultural Resources', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-culture-language' LIMIT 1)
WHERE c.slug = 'digital-cultural-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Educational Materials', 'digital-culture-education', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-culture-language'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-culture-education');
UPDATE public.product_categories c
SET name = 'Educational Materials', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-culture-language' LIMIT 1)
WHERE c.slug = 'digital-culture-education';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Books', 'digital-culture-books', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-culture-language'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-culture-books');
UPDATE public.product_categories c
SET name = 'Books', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-culture-language' LIMIT 1)
WHERE c.slug = 'digital-culture-books';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Study Resources', 'digital-culture-study', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-culture-language'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-culture-study');
UPDATE public.product_categories c
SET name = 'Study Resources', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-culture-language' LIMIT 1)
WHERE c.slug = 'digital-culture-study';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Art & Collectibles', 'digital-art-collectibles', 'digital', true, 190, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-art-collectibles');
UPDATE public.product_categories
SET name = 'Art & Collectibles', category_type = 'digital', is_active = true, sort_order = 190, parent_id = NULL
WHERE slug = 'digital-art-collectibles';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Digital Art', 'digital-art', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-art-collectibles'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-art');
UPDATE public.product_categories c
SET name = 'Digital Art', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-art-collectibles' LIMIT 1)
WHERE c.slug = 'digital-art';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Illustrations', 'digital-art-illustrations', 'digital', true, 2, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-art-collectibles'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-art-illustrations');
UPDATE public.product_categories c
SET name = 'Illustrations', category_type = 'digital', is_active = true, sort_order = 2,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-art-collectibles' LIMIT 1)
WHERE c.slug = 'digital-art-illustrations';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT '3D Assets', 'digital-3d-assets', 'digital', true, 3, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-art-collectibles'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-3d-assets');
UPDATE public.product_categories c
SET name = '3D Assets', category_type = 'digital', is_active = true, sort_order = 3,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-art-collectibles' LIMIT 1)
WHERE c.slug = 'digital-3d-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Digital Collectibles', 'digital-collectibles', 'digital', true, 4, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-art-collectibles'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-collectibles');
UPDATE public.product_categories c
SET name = 'Digital Collectibles', category_type = 'digital', is_active = true, sort_order = 4,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-art-collectibles' LIMIT 1)
WHERE c.slug = 'digital-collectibles';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creative Assets', 'digital-creative-assets', 'digital', true, 5, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-art-collectibles'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-creative-assets');
UPDATE public.product_categories c
SET name = 'Creative Assets', category_type = 'digital', is_active = true, sort_order = 5,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-art-collectibles' LIMIT 1)
WHERE c.slug = 'digital-creative-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Other Digital Products', 'digital-other', 'digital', true, 200, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-other');
UPDATE public.product_categories
SET name = 'Other Digital Products', category_type = 'digital', is_active = true, sort_order = 200, parent_id = NULL
WHERE slug = 'digital-other';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Other', 'digital-other-misc', 'digital', true, 1, p.id
FROM public.product_categories p
WHERE p.slug = 'digital-other'
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = 'digital-other-misc');
UPDATE public.product_categories c
SET name = 'Other', category_type = 'digital', is_active = true, sort_order = 1,
    parent_id = (SELECT id FROM public.product_categories WHERE slug = 'digital-other' LIMIT 1)
WHERE c.slug = 'digital-other-misc';


UPDATE public.product_categories
SET category_type = 'digital'
WHERE category_type IS DISTINCT FROM 'digital'
  AND (
    slug IN ('courses','ebooks','templates','software','coaching','community','bundle','subscriptions','digital')
    OR slug LIKE 'digital-%'
    OR slug IN ('courses-education','ai-tools','saas-products','creator-resources','design-assets','freelance-services','marketing-tools','automation-software','business-systems','communities-memberships')
  );
