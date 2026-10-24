INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Beats', 'digital-beats', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-beats');
UPDATE public.product_categories c SET name='Beats', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-beats';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Instrumentals', 'digital-instrumentals', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-instrumentals');
UPDATE public.product_categories c SET name='Instrumentals', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-instrumentals';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Samples', 'digital-samples', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-samples');
UPDATE public.product_categories c SET name='Samples', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-samples';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Sound Packs', 'digital-sound-packs', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sound-packs');
UPDATE public.product_categories c SET name='Sound Packs', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-sound-packs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Loops', 'digital-loops', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-loops');
UPDATE public.product_categories c SET name='Loops', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-loops';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Presets', 'digital-audio-presets', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-audio-presets');
UPDATE public.product_categories c SET name='Presets', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-audio-presets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Audio Templates', 'digital-audio-templates', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-audio-templates');
UPDATE public.product_categories c SET name='Audio Templates', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-audio-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Podcasts', 'digital-podcasts', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-podcasts');
UPDATE public.product_categories c SET name='Podcasts', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-podcasts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Audiobooks', 'digital-audiobooks', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-audiobooks');
UPDATE public.product_categories c SET name='Audiobooks', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-audiobooks';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Voice Assets', 'digital-voice-assets', 'digital', true, 11, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-voice-assets');
UPDATE public.product_categories c SET name='Voice Assets', category_type='digital', is_active=true, sort_order=11,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-voice-assets';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SFX', 'digital-sfx', 'digital', true, 12, p.id
FROM public.product_categories p WHERE p.slug='digital-music-audio'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-sfx');
UPDATE public.product_categories c SET name='SFX', category_type='digital', is_active=true, sort_order=12,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-music-audio' LIMIT 1) WHERE c.slug='digital-sfx';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Software', 'digital-software', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-software');
UPDATE public.product_categories c SET name='Software', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-software';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'SaaS Resources', 'digital-saas-resources', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-saas-resources');
UPDATE public.product_categories c SET name='SaaS Resources', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-saas-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Code', 'digital-code', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-code');
UPDATE public.product_categories c SET name='Code', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Source Code', 'digital-source-code', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-source-code');
UPDATE public.product_categories c SET name='Source Code', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-source-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Scripts', 'digital-scripts', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-scripts');
UPDATE public.product_categories c SET name='Scripts', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-scripts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Plugins', 'digital-plugins', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-plugins');
UPDATE public.product_categories c SET name='Plugins', category_type='digital', is_active=true, sort_order=6,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-plugins';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Themes', 'digital-themes', 'digital', true, 7, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-themes');
UPDATE public.product_categories c SET name='Themes', category_type='digital', is_active=true, sort_order=7,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-themes';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Extensions', 'digital-extensions', 'digital', true, 8, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-extensions');
UPDATE public.product_categories c SET name='Extensions', category_type='digital', is_active=true, sort_order=8,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-extensions';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'APIs', 'digital-apis', 'digital', true, 9, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-apis');
UPDATE public.product_categories c SET name='APIs', category_type='digital', is_active=true, sort_order=9,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-apis';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Developer Tools', 'digital-developer-tools', 'digital', true, 10, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-developer-tools');
UPDATE public.product_categories c SET name='Developer Tools', category_type='digital', is_active=true, sort_order=10,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-developer-tools';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Automation', 'digital-automation', 'digital', true, 11, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-automation');
UPDATE public.product_categories c SET name='Automation', category_type='digital', is_active=true, sort_order=11,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-automation';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'No-Code Resources', 'digital-no-code', 'digital', true, 12, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-no-code');
UPDATE public.product_categories c SET name='No-Code Resources', category_type='digital', is_active=true, sort_order=12,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-no-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Low-Code Resources', 'digital-low-code', 'digital', true, 13, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-low-code');
UPDATE public.product_categories c SET name='Low-Code Resources', category_type='digital', is_active=true, sort_order=13,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-low-code';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Databases / Data Resources', 'digital-data-resources', 'digital', true, 14, p.id
FROM public.product_categories p WHERE p.slug='digital-software-technology'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-data-resources');
UPDATE public.product_categories c SET name='Databases / Data Resources', category_type='digital', is_active=true, sort_order=14,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-software-technology' LIMIT 1) WHERE c.slug='digital-data-resources';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Prompts', 'digital-ai-prompts', 'digital', true, 1, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-prompts');
UPDATE public.product_categories c SET name='AI Prompts', category_type='digital', is_active=true, sort_order=1,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-prompts';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Prompt Packs', 'digital-prompt-packs', 'digital', true, 2, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-prompt-packs');
UPDATE public.product_categories c SET name='Prompt Packs', category_type='digital', is_active=true, sort_order=2,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-prompt-packs';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Workflows', 'digital-ai-workflows', 'digital', true, 3, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-workflows');
UPDATE public.product_categories c SET name='AI Workflows', category_type='digital', is_active=true, sort_order=3,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-workflows';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Templates', 'digital-ai-templates', 'digital', true, 4, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-templates');
UPDATE public.product_categories c SET name='AI Templates', category_type='digital', is_active=true, sort_order=4,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-templates';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'AI Agents', 'digital-ai-agents', 'digital', true, 5, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-agents');
UPDATE public.product_categories c SET name='AI Agents', category_type='digital', is_active=true, sort_order=5,
parent_id=(SELECT id FROM public.product_categories WHERE slug='digital-ai-automation' LIMIT 1) WHERE c.slug='digital-ai-agents';

INSERT INTO public.product_categories (name, slug, category_type, is_active, sort_order, parent_id)
SELECT 'Automation Templates', 'digital-automation-templates', 'digital', true, 6, p.id
FROM public.product_categories p WHERE p.slug='digital-ai-automation'
AND NOT EXISTS (SELECT 1 FROM public.product_categories x WHERE x.slug='digital-ai-templates');
