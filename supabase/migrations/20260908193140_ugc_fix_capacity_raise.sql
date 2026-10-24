CREATE OR REPLACE FUNCTION public.ugc_enforce_campaign_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_p integer;
  occupied integer;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('accepted', 'pending', 'invited', 'waitlisted') THEN
    RETURN NEW;
  END IF;

  SELECT c.max_participants
  INTO max_p
  FROM public.ugc_campaigns c
  WHERE c.id = NEW.campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF max_p IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
  INTO occupied
  FROM public.ugc_campaign_participants p
  WHERE p.campaign_id = NEW.campaign_id
    AND p.status IN ('accepted', 'pending', 'invited', 'waitlisted')
    AND p.id IS DISTINCT FROM NEW.id;

  IF occupied >= max_p THEN
    RAISE EXCEPTION 'Campaign is full'
      USING ERRCODE = 'check_violation',
            HINT = 'max_participants';
  END IF;

  RETURN NEW;
END;
$$;