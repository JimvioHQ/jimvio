-- database/migrations/038_rpc_user_roles.sql
-- Function to fetch all active dashboard roles for a user in a single request.
-- This optimizes the DashboardShell which previously made 4 separate calls.

CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    roles_out TEXT[] := ARRAY['buyer'];
    exists_check BOOLEAN;
BEGIN
    -- 1. Check user_roles table (Explicit assignments)
    -- We append all active roles found there
    SELECT ARRAY_AGG(DISTINCT role::TEXT)
    FROM public.user_roles
    WHERE user_id = lookup_user_id AND is_active = TRUE
    INTO roles_out;

    -- Ensure it's not null and has buyer
    IF roles_out IS NULL THEN
        roles_out := ARRAY['buyer'];
    END IF;

    IF NOT ('buyer' = ANY(roles_out)) THEN
        roles_out := roles_out || 'buyer';
    END IF;

    -- 2. Fallback: Force-check specialized tables to be absolutely sure
    -- This handles edge cases where user_roles record might be missing
    
    -- Check Vendor
    SELECT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = lookup_user_id) INTO exists_check;
    IF exists_check AND NOT ('vendor' = ANY(roles_out)) THEN
        roles_out := roles_out || 'vendor';
    END IF;

    -- Check Affiliate
    SELECT EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = lookup_user_id) INTO exists_check;
    IF exists_check AND NOT ('affiliate' = ANY(roles_out)) THEN
        roles_out := roles_out || 'affiliate';
    END IF;

    -- Check Influencer
    SELECT EXISTS (SELECT 1 FROM public.influencers WHERE user_id = lookup_user_id) INTO exists_check;
    IF exists_check AND NOT ('influencer' = ANY(roles_out)) THEN
        roles_out := roles_out || 'influencer';
    END IF;

    RETURN roles_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_roles IS 'Returns a JSON array of dashboard roles (buyer, vendor, affiliate, influencer) for a given user ID.';
