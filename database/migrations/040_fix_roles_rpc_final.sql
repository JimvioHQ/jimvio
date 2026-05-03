-- ============================================================
-- FINAL FIX: get_user_roles RPC
-- The bug: using TEXT[] || 'literal' causes "malformed array literal"
-- The fix: use array_append() instead
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    roles_out TEXT[] := ARRAY['buyer'::TEXT];
    rec RECORD;
BEGIN
    -- Step 1: Pull all active roles from user_roles table
    FOR rec IN (
        SELECT role::TEXT AS r
        FROM public.user_roles
        WHERE user_id = lookup_user_id
          AND is_active = TRUE
    ) LOOP
        IF NOT (rec.r = ANY(roles_out)) THEN
            roles_out := array_append(roles_out, rec.r);
        END IF;
    END LOOP;

    -- Step 2: Fallback checks on entity tables
    IF EXISTS (SELECT 1 FROM public.vendors WHERE user_id = lookup_user_id) THEN
        IF NOT ('vendor' = ANY(roles_out)) THEN
            roles_out := array_append(roles_out, 'vendor'::TEXT);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = lookup_user_id) THEN
        IF NOT ('affiliate' = ANY(roles_out)) THEN
            roles_out := array_append(roles_out, 'affiliate'::TEXT);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.influencers WHERE user_id = lookup_user_id) THEN
        IF NOT ('influencer' = ANY(roles_out)) THEN
            roles_out := array_append(roles_out, 'influencer'::TEXT);
        END IF;
    END IF;

    RETURN roles_out;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO anon;
