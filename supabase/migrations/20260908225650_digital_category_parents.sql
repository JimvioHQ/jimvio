INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Education & Learning', 'digital-education-learning', 'digital', true, 10, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-education-learning');
UPDATE public.product_categories SET name='Education & Learning', category_type='digital', is_active=true, sort_order=10, parent_id=NULL WHERE slug='digital-education-learning';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Business & Entrepreneurship', 'digital-business-entrepreneurship', 'digital', true, 20, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-business-entrepreneurship');
UPDATE public.product_categories SET name='Business & Entrepreneurship', category_type='digital', is_active=true, sort_order=20, parent_id=NULL WHERE slug='digital-business-entrepreneurship';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Marketing & Sales', 'digital-marketing-sales', 'digital', true, 30, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-marketing-sales');
UPDATE public.product_categories SET name='Marketing & Sales', category_type='digital', is_active=true, sort_order=30, parent_id=NULL WHERE slug='digital-marketing-sales';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Design & Creative', 'digital-design-creative', 'digital', true, 40, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-design-creative');
UPDATE public.product_categories SET name='Design & Creative', category_type='digital', is_active=true, sort_order=40, parent_id=NULL WHERE slug='digital-design-creative';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Photography & Video', 'digital-photography-video', 'digital', true, 50, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-photography-video');
UPDATE public.product_categories SET name='Photography & Video', category_type='digital', is_active=true, sort_order=50, parent_id=NULL WHERE slug='digital-photography-video';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Music & Audio', 'digital-music-audio', 'digital', true, 60, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-music-audio');
UPDATE public.product_categories SET name='Music & Audio', category_type='digital', is_active=true, sort_order=60, parent_id=NULL WHERE slug='digital-music-audio';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Software & Technology', 'digital-software-technology', 'digital', true, 70, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-software-technology');
UPDATE public.product_categories SET name='Software & Technology', category_type='digital', is_active=true, sort_order=70, parent_id=NULL WHERE slug='digital-software-technology';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI & Automation', 'digital-ai-automation', 'digital', true, 80, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-ai-automation');
UPDATE public.product_categories SET name='AI & Automation', category_type='digital', is_active=true, sort_order=80, parent_id=NULL WHERE slug='digital-ai-automation';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Finance & Investing', 'digital-finance-investing', 'digital', true, 90, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-finance-investing');
UPDATE public.product_categories SET name='Finance & Investing', category_type='digital', is_active=true, sort_order=90, parent_id=NULL WHERE slug='digital-finance-investing';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Health & Fitness', 'digital-health-fitness', 'digital', true, 100, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-health-fitness');
UPDATE public.product_categories SET name='Health & Fitness', category_type='digital', is_active=true, sort_order=100, parent_id=NULL WHERE slug='digital-health-fitness';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Lifestyle', 'digital-lifestyle', 'digital', true, 110, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-lifestyle');
UPDATE public.product_categories SET name='Lifestyle', category_type='digital', is_active=true, sort_order=110, parent_id=NULL WHERE slug='digital-lifestyle';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Creator & Influencer', 'digital-creator-influencer', 'digital', true, 120, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-creator-influencer');
UPDATE public.product_categories SET name='Creator & Influencer', category_type='digital', is_active=true, sort_order=120, parent_id=NULL WHERE slug='digital-creator-influencer';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Ebooks & Publications', 'digital-ebooks-publications', 'digital', true, 130, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-ebooks-publications');
UPDATE public.product_categories SET name='Ebooks & Publications', category_type='digital', is_active=true, sort_order=130, parent_id=NULL WHERE slug='digital-ebooks-publications';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Documents & Templates', 'digital-documents-templates', 'digital', true, 140, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-documents-templates');
UPDATE public.product_categories SET name='Documents & Templates', category_type='digital', is_active=true, sort_order=140, parent_id=NULL WHERE slug='digital-documents-templates';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Memberships & Digital Access', 'digital-memberships-access', 'digital', true, 150, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-memberships-access');
UPDATE public.product_categories SET name='Memberships & Digital Access', category_type='digital', is_active=true, sort_order=150, parent_id=NULL WHERE slug='digital-memberships-access';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Events & Experiences', 'digital-events-experiences', 'digital', true, 160, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-events-experiences');
UPDATE public.product_categories SET name='Events & Experiences', category_type='digital', is_active=true, sort_order=160, parent_id=NULL WHERE slug='digital-events-experiences';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Games & Entertainment', 'digital-games-entertainment', 'digital', true, 170, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-games-entertainment');
UPDATE public.product_categories SET name='Games & Entertainment', category_type='digital', is_active=true, sort_order=170, parent_id=NULL WHERE slug='digital-games-entertainment';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Religion / Culture / Language', 'digital-culture-language', 'digital', true, 180, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-culture-language');
UPDATE public.product_categories SET name='Religion / Culture / Language', category_type='digital', is_active=true, sort_order=180, parent_id=NULL WHERE slug='digital-culture-language';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Art & Collectibles', 'digital-art-collectibles', 'digital', true, 190, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-art-collectibles');
UPDATE public.product_categories SET name='Art & Collectibles', category_type='digital', is_active=true, sort_order=190, parent_id=NULL WHERE slug='digital-art-collectibles';
INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Other Digital Products', 'digital-other', 'digital', true, 200, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories WHERE slug = 'digital-other');
UPDATE public.product_categories SET name='Other Digital Products', category_type='digital', is_active=true, sort_order=200, parent_id=NULL WHERE slug='digital-other';