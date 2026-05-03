-- ============================================================
-- JIMVIO — Fix handle_new_user trigger
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vsfhwfimudpdipdkxbww/sql/new
-- ============================================================

-- Drop old trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with robust error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile (ignore if already exists)
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();

  -- Insert default buyer role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert wallet (ignore if already exists)
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth transaction
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create profiles for any existing auth users that were missed
-- (run this once to backfill)
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, 'buyer')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.wallets (user_id)
    VALUES (u.id)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Backfilled profile for %', u.email;
  END LOOP;
END;
$$;

-- Verify everything looks good
SELECT
  p.email,
  p.full_name,
  p.created_at,
  (SELECT COUNT(*) FROM public.user_roles ur WHERE ur.user_id = p.id) AS role_count,
  (SELECT COUNT(*) FROM public.wallets w WHERE w.user_id = p.id) AS wallet_count
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 10;
