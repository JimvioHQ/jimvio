-- M-1: extend the publish guard with a quality gate for supplier listings.
-- A CJ/supplier listing with no real description cannot go active; it stays
-- draft with a reason. Seller-created products are not affected. Admin
-- override is still respected.
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
    RETURN NEW;
  END IF;
  IF NEW.source = 'cj' AND length(COALESCE(btrim(NEW.description), '')) < 40 THEN
    NEW.status := 'draft';
    NEW.auto_unpublished := true;
    NEW.auto_unpublish_reason := 'Quality gate: listing has no product description';
    NEW.auto_unpublished_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_prohibited_listing'
      AND tgrelid = 'public.products'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_attribute a ON a.attrelid = t.tgrelid AND a.attnum = ANY (t.tgattr::int2[])
    WHERE t.tgname = 'trg_guard_prohibited_listing' AND a.attname = 'description'
  ) THEN
    -- Recreate the column list so description edits are also checked.
    EXECUTE 'CREATE OR REPLACE TRIGGER trg_guard_prohibited_listing
      BEFORE INSERT OR UPDATE OF status, name, description, published_by_admin_override ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.guard_prohibited_listing()';
  END IF;
END $$;
