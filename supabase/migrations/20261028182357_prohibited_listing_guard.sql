-- M-11 / P0-4: Database guard against publishing prohibited listings.
-- Runs on every insert/update of public.products, so it covers seller
-- tools, admin bulk publish, auto-publish, CJ import and webhooks alike.
-- A listing whose name matches a prohibited pattern cannot become
-- 'active'; it is kept as draft with an auto-unpublish reason.
-- An explicit admin override (published_by_admin_override = true) is
-- respected so reviewed exceptions remain possible.

CREATE OR REPLACE FUNCTION public.prohibited_listing_reason(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_name ~* '(cigarette|tobacco|smoking pipe|\mpipe smoking|\mvape\M|vaping|e-cig|hookah|shisha)'
      THEN 'tobacco or vaping product without age verification'
    WHEN p_name ~* '(kerosene|butane|torch|windproof|cigarette|ignition|electronic|induction|plasma|arc)\s.*lighter|lighter\s+(windproof|refill)|\migniter\M'
      THEN 'lighter or igniter (dangerous goods)'
    WHEN p_name ~* '(sex toy|adult toy|dildo|vibrator\M|masturbat|stimulating (metal )?(tools )?toys?|erotic)'
      THEN 'adult product'
    WHEN p_name ~* '(fat reducing|fat burning|weight loss (pill|capsule|tea)|diet pill|slimming (pill|capsule|patch)|health paste)'
      THEN 'unsupported health claim'
    WHEN p_name ~* '(endoscope|dental punch|medical atomizer|nebuli[sz]er|venom|blood pressure monitor|glucose meter)'
      THEN 'medical device without approval'
    WHEN p_name ~* '(key matching|key programm|lock pick|stun gun|taser|pepper spray|firearm|ammunition|\mbullet\M)'
      THEN 'restricted tool or weapon'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.guard_prohibited_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  reason text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.published_by_admin_override, false) THEN
    RETURN NEW;
  END IF;
  reason := public.prohibited_listing_reason(NEW.name);
  IF reason IS NOT NULL THEN
    NEW.status := 'draft';
    NEW.auto_unpublished := true;
    NEW.auto_unpublish_reason := 'Prohibited listing: ' || reason;
    NEW.auto_unpublished_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_prohibited_listing'
      AND tgrelid = 'public.products'::regclass
  ) THEN
    CREATE TRIGGER trg_guard_prohibited_listing
    BEFORE INSERT OR UPDATE OF status, name, published_by_admin_override ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.guard_prohibited_listing();
  END IF;
END $$;
