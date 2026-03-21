-- Update comment_count on community_posts when a comment is added
CREATE OR REPLACE FUNCTION update_community_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comment_count = COALESCE(comment_count, 0) + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_community_post_comment_count ON public.community_post_comments;
CREATE TRIGGER trigger_community_post_comment_count
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_community_post_comment_count();

-- Notify post author when someone else comments (via trigger; bypasses RLS for insert)
CREATE OR REPLACE FUNCTION notify_post_author_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_community_id UUID;
  v_commenter_name TEXT;
  v_post_title TEXT;
  v_community_slug TEXT;
BEGIN
  SELECT author_id, title, community_id INTO v_author_id, v_post_title, v_community_id
  FROM public.community_posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO v_commenter_name FROM public.profiles WHERE id = NEW.author_id;
  SELECT slug INTO v_community_slug FROM public.communities WHERE id = v_community_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    v_author_id,
    'community',
    'New comment on your post',
    COALESCE(v_commenter_name, 'Someone') || ' replied to your post' || COALESCE(': ' || LEFT(v_post_title, 50), ''),
    '/communities/' || COALESCE(v_community_slug, '') || '/post/' || NEW.post_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_post_author_on_comment ON public.community_post_comments;
CREATE TRIGGER trigger_notify_post_author_on_comment
  AFTER INSERT ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_post_author_on_comment();

-- Notify parent comment author when someone replies to their comment
CREATE OR REPLACE FUNCTION notify_comment_author_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_author_id UUID;
  v_replier_name TEXT;
  v_community_slug TEXT;
  BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT author_id INTO v_parent_author_id FROM public.community_post_comments WHERE id = NEW.parent_id;
  IF v_parent_author_id IS NULL OR v_parent_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO v_replier_name FROM public.profiles WHERE id = NEW.author_id;
  SELECT slug INTO v_community_slug FROM public.communities WHERE id = (SELECT community_id FROM public.community_posts WHERE id = NEW.post_id);
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    v_parent_author_id,
    'community',
    'Reply to your comment',
    COALESCE(v_replier_name, 'Someone') || ' replied to your comment',
    '/communities/' || COALESCE(v_community_slug, '') || '/post/' || NEW.post_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_comment_author_on_reply ON public.community_post_comments;
CREATE TRIGGER trigger_notify_comment_author_on_reply
  AFTER INSERT ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_author_on_reply();

-- Seed example communities (only if they don't exist)
INSERT INTO public.communities (owner_id, name, slug, description, category, is_private, is_active)
SELECT p.id, 'Electronics', 'electronics', 'Discuss gadgets, devices, and electronics. Share reviews and deals.', 'Technology', false, true
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE slug = 'electronics')
ORDER BY p.created_at ASC LIMIT 1;

INSERT INTO public.communities (owner_id, name, slug, description, category, is_private, is_active)
SELECT p.id, 'Startups', 'startups', 'For founders and startup enthusiasts. Pitch ideas and get feedback.', 'Business', false, true
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE slug = 'startups')
ORDER BY p.created_at ASC LIMIT 1;

INSERT INTO public.communities (owner_id, name, slug, description, category, is_private, is_active)
SELECT p.id, 'E-commerce', 'e-commerce', 'Sellers and buyers. Tips, tools, and marketplace discussions.', 'Business', false, true
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE slug = 'e-commerce')
ORDER BY p.created_at ASC LIMIT 1;

INSERT INTO public.communities (owner_id, name, slug, description, category, is_private, is_active)
SELECT p.id, 'Tech Creators', 'tech-creators', 'Content creators in tech. Collabs, growth, and monetization.', 'Technology', false, true
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE slug = 'tech-creators')
ORDER BY p.created_at ASC LIMIT 1;

INSERT INTO public.communities (owner_id, name, slug, description, category, is_private, is_active)
SELECT p.id, 'Fashion', 'fashion', 'Style, trends, and fashion business. Share looks and brands.', 'Other', false, true
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE slug = 'fashion')
ORDER BY p.created_at ASC LIMIT 1;
