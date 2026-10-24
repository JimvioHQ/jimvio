-- Prevent authenticated clients from writing admin-activation override columns.
-- Service-role (admin activate API) may still set them. Does not change
-- campaign status/funding rules for the brand funding path.

CREATE OR REPLACE FUNCTION public.ugc_campaigns_protect_admin_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.activated_by_admin := false;
    NEW.admin_activated_at := NULL;
    NEW.admin_activated_by := NULL;
    NEW.admin_activation_reason := NULL;
    RETURN NEW;
  END IF;

  NEW.activated_by_admin := OLD.activated_by_admin;
  NEW.admin_activated_at := OLD.admin_activated_at;
  NEW.admin_activated_by := OLD.admin_activated_by;
  NEW.admin_activation_reason := OLD.admin_activation_reason;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ugc_campaigns_protect_admin_activation ON public.ugc_campaigns;
CREATE TRIGGER trg_ugc_campaigns_protect_admin_activation
  BEFORE INSERT OR UPDATE ON public.ugc_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.ugc_campaigns_protect_admin_activation();

REVOKE UPDATE (
  activated_by_admin,
  admin_activated_at,
  admin_activated_by,
  admin_activation_reason
) ON TABLE public.ugc_campaigns FROM PUBLIC, anon, authenticated;

GRANT UPDATE (
  activated_by_admin,
  admin_activated_at,
  admin_activated_by,
  admin_activation_reason
) ON TABLE public.ugc_campaigns TO service_role;