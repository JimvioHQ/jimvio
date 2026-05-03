-- database/migrations/039_fix_rpc_user_roles.sql
-- Improved version of get_user_roles that checks both user_roles table and specialized tables.

CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    roles_list TEXT[];
BEGIN
    -- Collect all roles from user_roles table (ACTIVE only)
    SELECT ARRAY_AGG(DISTINCT role::TEXT)
    FROM public.user_roles
    WHERE user_id = lookup_user_id AND is_active = TRUE
    INTO roles_list;

    -- Ensure 'buyer' is always present
    IF roles_list IS NULL THEN
        roles_list := ARRAY['buyer'];
    ELSIF NOT ('buyer' = ANY(roles_list)) THEN
        roles_list := roles_list || 'buyer';
    END IF;

    -- Backwards compatibility: Check specialized tables if roles are missing
    -- This handles users who migrated but don't have user_roles entries yet.
    
    -- Check Vendor
    IF NOT ('vendor' = ANY(roles_list)) AND EXISTS (SELECT 1 FROM public.vendors WHERE user_id = lookup_user_id) THEN
        roles_list := roles_list || 'vendor';
    END IF;

    -- Check Affiliate
    IF NOT ('affiliate' = ANY(roles_list)) AND EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = lookup_user_id) THEN
        roles_list := roles_list || 'affiliate';
    END IF;

    -- Check Influencer
    IF NOT ('influencer' = ANY(roles_list)) AND EXISTS (SELECT 1 FROM public.influencers WHERE user_id = lookup_user_id) THEN
        roles_list := roles_list || 'influencer';
    END IF;

    -- Return as JSONB array
    RETURN to_jsonb(roles_list);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_roles IS 'Returns a JSON array of active dashboard roles for a user, checking both user_roles and entity-specific tables.';
