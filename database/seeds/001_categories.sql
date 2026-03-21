-- Seed product categories
INSERT INTO public.product_categories (name, slug, description, icon, color, sort_order) VALUES
-- Physical
('Electronics', 'electronics', 'Phones, laptops, gadgets & more', '💻', '#6366f1', 1),
('Fashion', 'fashion', 'Clothing, shoes, accessories', '👗', '#ec4899', 2),
('Home & Garden', 'home-garden', 'Furniture, decor, appliances', '🏠', '#10b981', 3),
('Industrial', 'industrial', 'Machinery, tools, equipment', '⚙️', '#f59e0b', 4),
('Automotive', 'automotive', 'Cars, parts, accessories', '🚗', '#3b82f6', 5),
('Agriculture', 'agriculture', 'Seeds, tools, farm equipment', '🌱', '#22c55e', 6),
('Construction', 'construction', 'Building materials & tools', '🏗️', '#f97316', 7),
('Health & Beauty', 'health-beauty', 'Skincare, wellness, medical', '💊', '#a855f7', 8),
('Office Supplies', 'office-supplies', 'Stationery, furniture, tech', '📎', '#0ea5e9', 9),
('Food & Beverage', 'food-beverage', 'Local & imported products', '🍎', '#ef4444', 10),
-- Digital
('Software', 'software', 'Apps, SaaS, tools', '🖥️', '#8b5cf6', 11),
('Online Courses', 'courses', 'Skills, certifications, training', '📚', '#f59e0b', 12),
('AI Tools', 'ai-tools', 'Prompts, models, AI products', '🤖', '#06b6d4', 13),
('Templates', 'templates', 'Design, code, business templates', '📐', '#ec4899', 14),
('Ebooks', 'ebooks', 'Books, guides, reports', '📖', '#84cc16', 15),
('Music & Audio', 'music-audio', 'Beats, samples, sound packs', '🎵', '#f43f5e', 16),
('Graphics & Design', 'graphics-design', 'Icons, fonts, UI kits', '🎨', '#d946ef', 17),
('Photography', 'photography', 'Presets, stock photos', '📸', '#14b8a6', 18);
