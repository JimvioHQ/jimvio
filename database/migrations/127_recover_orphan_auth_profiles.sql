-- Recover Auth users whose profile insert failed on profiles_email_key.
-- Applied to production as recover_orphan_auth_profiles_v3 (20260824021611).
-- Canonical copy: supabase/migrations/20260824021611_recover_orphan_auth_profiles_v3.sql

CREATE OR REPLACE FUNCTION public.recover_profile_for_auth_user(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_orphan_id uuid;
  r record;
BEGIN
  IF p_auth_user_id IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_auth_user_id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_auth_user_id, 'buyer')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.wallets (user_id)
    VALUES (p_auth_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'reason', 'already_linked');
  END IF;

  SELECT p.id INTO v_orphan_id
  FROM public.profiles p
  WHERE lower(p.email) = v_email
  LIMIT 1;

  IF v_orphan_id IS NULL THEN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      p_auth_user_id,
      v_email,
      COALESCE(p_full_name, split_part(v_email, '@', 1)),
      p_avatar_url
    );
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_auth_user_id, 'buyer')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.wallets (user_id)
    VALUES (p_auth_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'reason', 'created');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_orphan_id
      AND u.id IS DISTINCT FROM p_auth_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_owned_by_live_user');
  END IF;

  DROP TABLE IF EXISTS pg_temp.recover_profile_row;
  CREATE TEMP TABLE recover_profile_row AS
  SELECT * FROM public.profiles WHERE id = v_orphan_id;

  UPDATE recover_profile_row
  SET
    id = p_auth_user_id,
    email = v_email,
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW();

  UPDATE public.profiles
  SET
    email = 'orphan.' || v_orphan_id::text || '@orphan.invalid',
    username = NULL,
    updated_at = NOW()
  WHERE id = v_orphan_id;

  INSERT INTO public.profiles SELECT * FROM recover_profile_row;
  DROP TABLE IF EXISTS recover_profile_row;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  DELETE FROM public.jip_identity WHERE user_id = p_auth_user_id;
  UPDATE public.jip_identity
  SET user_id = p_auth_user_id
  WHERE user_id = v_orphan_id;
  INSERT INTO public.jip_identity (user_id)
  VALUES (p_auth_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
    JOIN pg_class fc ON fc.oid = con.confrelid
    JOIN pg_namespace fn ON fn.oid = fc.relnamespace
    JOIN pg_attribute fa ON fa.attrelid = con.confrelid AND fa.attnum = ANY (con.confkey)
    WHERE con.contype = 'f'
      AND fn.nspname = 'public'
      AND fc.relname = 'profiles'
      AND fa.attname = 'id'
      AND array_length(con.conkey, 1) = 1
      AND c.relname NOT IN ('profiles', 'jip_identity')
  LOOP
    BEGIN
      EXECUTE format(
        'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
        r.schema_name, r.table_name, r.column_name, r.column_name
      )
      USING p_auth_user_id, v_orphan_id;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_auth_user_id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.wallets (user_id)
  VALUES (p_auth_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'reason', 'relinked',
    'from_id', v_orphan_id
  );
END;
$$;

ALTER FUNCTION public.recover_profile_for_auth_user(uuid, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.recover_profile_for_auth_user(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recover_profile_for_auth_user(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.recover_profile_for_auth_user(uuid, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recover_profile_for_auth_user(uuid, text, text, text) TO postgres;
GRANT EXECUTE ON FUNCTION public.recover_profile_for_auth_user(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.auth_identity_providers_for_email(p_email text)
RETURNS TABLE(user_id uuid, providers text[])
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    u.id,
    coalesce(
      array_agg(i.provider ORDER BY i.provider) FILTER (WHERE i.provider IS NOT NULL),
      '{}'::text[]
    ) AS providers
  FROM auth.users u
  LEFT JOIN auth.identities i ON i.user_id = u.id
  WHERE lower(u.email) = lower(trim(p_email))
  GROUP BY u.id
  LIMIT 1;
$$;

ALTER FUNCTION public.auth_identity_providers_for_email(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.auth_identity_providers_for_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_identity_providers_for_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.auth_identity_providers_for_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auth_identity_providers_for_email(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.auth_identity_providers_for_email(text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recover_profile_for_auth_user(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  u record;
BEGIN
  FOR u IN
    SELECT
      au.id,
      au.email,
      au.raw_user_meta_data->>'full_name' AS full_name,
      au.raw_user_meta_data->>'avatar_url' AS avatar_url
    FROM auth.users au
    WHERE au.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = au.id
      )
  LOOP
    PERFORM public.recover_profile_for_auth_user(
      u.id,
      u.email,
      u.full_name,
      u.avatar_url
    );
  END LOOP;
END;
$$;
