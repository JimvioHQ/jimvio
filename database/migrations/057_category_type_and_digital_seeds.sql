-- ============================================================
-- Migration 057: Add category_type column and seed digital categories
-- ============================================================

-- 1. Add category_type column
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (category_type IN ('physical', 'digital', 'both'));

-- 2. Mark known physical categories
UPDATE public.product_categories SET category_type = 'physical'
WHERE slug IN (
  'electronics', 'fashion', 'home-garden', 'industrial', 'automotive',
  'agriculture', 'construction', 'health-beauty', 'office-supplies', 'food-beverage'
);

-- 3. Mark known digital categories (from seed)
UPDATE public.product_categories SET category_type = 'digital'
WHERE slug IN (
  'software', 'courses', 'ai-tools', 'templates', 'ebooks',
  'music-audio', 'graphics-design', 'photography'
);

-- 4. Upsert digital categories (in case they were never seeded)
INSERT INTO public.product_categories (name, slug, description, icon, color, sort_order, is_active, category_type)
VALUES
  ('Software', 'software', 'Apps, SaaS, tools', '🖥️', '#8b5cf6', 101, true, 'digital'),
  ('Online Courses', 'courses', 'Skills, certifications, training', '📚', '#f59e0b', 102, true, 'digital'),
  ('AI Tools', 'ai-tools', 'Prompts, models, AI products', '🤖', '#06b6d4', 103, true, 'digital'),
  ('Templates', 'templates', 'Design, code, business templates', '📐', '#ec4899', 104, true, 'digital'),
  ('Ebooks', 'ebooks', 'Books, guides, reports', '📖', '#84cc16', 105, true, 'digital'),
  ('Music & Audio', 'music-audio', 'Beats, samples, sound packs', '🎵', '#f43f5e', 106, true, 'digital'),
  ('Graphics & Design', 'graphics-design', 'Icons, fonts, UI kits', '🎨', '#d946ef', 107, true, 'digital'),
  ('Photography', 'photography', 'Presets, stock photos', '📸', '#14b8a6', 108, true, 'digital')
ON CONFLICT (slug) DO UPDATE
  SET category_type = 'digital', is_active = true;

-- 5. Mark everything else (Shopify-synced) as physical by default if not already set
UPDATE public.product_categories
  SET category_type = 'physical'
  WHERE category_type = 'physical'  -- leave as-is (just confirms default)
    AND slug NOT IN ('software', 'courses', 'ai-tools', 'templates', 'ebooks', 'music-audio', 'graphics-design', 'photography');
