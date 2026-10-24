-- Digital product source, license, scan, review, enforcement, and customer issues.
-- Additive. Legacy products keep a null digital_verification_state and are not unpublished.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS acquisition_model text,
  ADD COLUMN IF NOT EXISTS fulfillment_mode text,
  ADD COLUMN IF NOT EXISTS affiliate_destination_url text,
  ADD COLUMN IF NOT EXISTS rightsholder_name text,
  ADD COLUMN IF NOT EXISTS digital_verification_state text,
  ADD COLUMN IF NOT EXISTS approved_file_digest text,
  ADD COLUMN IF NOT EXISTS file_digest text,
  ADD COLUMN IF NOT EXISTS buyer_license_summary text,
  ADD COLUMN IF NOT EXISTS refund_policy_note text,
  ADD COLUMN IF NOT EXISTS compatibility_notes text,
  ADD COLUMN IF NOT EXISTS update_policy text,
  ADD COLUMN IF NOT EXISTS content_language text,
  ADD COLUMN IF NOT EXISTS intended_audience text,
  ADD COLUMN IF NOT EXISTS declarations_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_assignee_id uuid;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_acquisition_model_check;
ALTER TABLE public.products ADD CONSTRAINT products_acquisition_model_check
  CHECK (
    acquisition_model IS NULL OR acquisition_model IN (
      'original_vendor_product',
      'licensed_resale_product',
      'distribution_partner_product',
      'affiliate_only_product'
    )
  );

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_fulfillment_mode_check;
ALTER TABLE public.products ADD CONSTRAINT products_fulfillment_mode_check
  CHECK (fulfillment_mode IS NULL OR fulfillment_mode IN ('download', 'affiliate_redirect'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_digital_verification_state_check;
ALTER TABLE public.products ADD CONSTRAINT products_digital_verification_state_check
  CHECK (
    digital_verification_state IS NULL OR digital_verification_state IN (
      'draft', 'submitted', 'automated_checks', 'under_review', 'needs_changes',
      'approved', 'published', 'rejected', 'suspended', 'quarantined',
      'takedown_pending', 'removed', 'expired'
    )
  );

CREATE INDEX IF NOT EXISTS products_digital_verification_queue_idx
  ON public.products (digital_verification_state, submitted_for_review_at DESC NULLS LAST)
  WHERE is_digital = true AND digital_verification_state IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_license_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  rightsholder_name text,
  acquisition_model text NOT NULL,
  license_type text,
  status text NOT NULL DEFAULT 'requires_human_review',
  permits_commercial_sale boolean NOT NULL DEFAULT false,
  permits_marketplace boolean NOT NULL DEFAULT false,
  permits_digital_delivery boolean NOT NULL DEFAULT false,
  permits_modification boolean,
  permits_bundling boolean,
  permits_sublicense boolean,
  territories text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  reviewer_id uuid,
  reviewed_at timestamptz,
  rationale text,
  policy_version text NOT NULL,
  requires_human_review boolean NOT NULL DEFAULT true,
  declarations_accepted_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_license_records_status_check CHECK (
    status IN (
      'draft', 'submitted', 'under_review', 'accepted', 'rejected',
      'expired', 'revoked', 'requires_human_review'
    )
  ),
  CONSTRAINT product_license_records_model_check CHECK (
    acquisition_model IN (
      'original_vendor_product',
      'licensed_resale_product',
      'distribution_partner_product',
      'affiliate_only_product'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS product_license_records_current_idx
  ON public.product_license_records (product_id)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS product_license_records_expiry_idx
  ON public.product_license_records (expires_at)
  WHERE superseded_at IS NULL AND status = 'accepted';

CREATE TABLE IF NOT EXISTS public.product_license_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.product_license_records(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  storage_url text NOT NULL,
  original_filename text,
  mime_type text,
  byte_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_license_evidence_product_idx
  ON public.product_license_evidence (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_digest text,
  status text NOT NULL,
  engine text NOT NULL,
  engine_version text,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_security_scans_status_check CHECK (
    status IN (
      'pending', 'scanning', 'passed', 'failed', 'unavailable',
      'quarantined', 'requires_review', 'not_applicable'
    )
  )
);

CREATE INDEX IF NOT EXISTS product_security_scans_product_idx
  ON public.product_security_scans (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_state text,
  to_state text,
  reason text,
  internal_notes text,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_review_decisions_product_idx
  ON public.product_review_decisions (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_enforcement_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  case_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  blocks_publication boolean NOT NULL DEFAULT true,
  blocks_delivery boolean NOT NULL DEFAULT false,
  summary text NOT NULL,
  evidence_note text,
  opened_by uuid,
  resolved_by uuid,
  resolution text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_enforcement_cases_type_check CHECK (
    case_type IN ('copyright', 'license_dispute', 'malware', 'fraud', 'misleading', 'other')
  ),
  CONSTRAINT product_enforcement_cases_status_check CHECK (
    status IN ('open', 'takedown_pending', 'resolved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS product_enforcement_cases_open_idx
  ON public.product_enforcement_cases (product_id, created_at DESC)
  WHERE status IN ('open', 'takedown_pending');

CREATE TABLE IF NOT EXISTS public.product_customer_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  issue_type text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  financial_action_count integer NOT NULL DEFAULT 0 CHECK (financial_action_count >= 0),
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_customer_issues_type_check CHECK (
    issue_type IN ('corrupted_file', 'missing_content', 'unauthorized_product', 'misleading_listing', 'other')
  ),
  CONSTRAINT product_customer_issues_status_check CHECK (
    status IN ('open', 'in_review', 'resolved', 'rejected')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS product_customer_issues_open_key
  ON public.product_customer_issues (reporter_id, product_id, issue_type, COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('open', 'in_review');

CREATE INDEX IF NOT EXISTS product_customer_issues_queue_idx
  ON public.product_customer_issues (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_state text,
  to_state text,
  outcome text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_verification_events_product_idx
  ON public.product_verification_events (product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_verification_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'verification audit history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS product_verification_events_append_only ON public.product_verification_events;
CREATE TRIGGER product_verification_events_append_only
  BEFORE UPDATE OR DELETE ON public.product_verification_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_verification_audit_mutation();

DROP TRIGGER IF EXISTS product_review_decisions_append_only ON public.product_review_decisions;
CREATE TRIGGER product_review_decisions_append_only
  BEFORE UPDATE OR DELETE ON public.product_review_decisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_verification_audit_mutation();

CREATE OR REPLACE FUNCTION public.digital_verification_can_transition(p_from text, p_to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_from
    WHEN 'draft' THEN p_to IN ('submitted')
    WHEN 'submitted' THEN p_to IN ('automated_checks', 'needs_changes', 'rejected', 'quarantined')
    WHEN 'automated_checks' THEN p_to IN ('under_review', 'quarantined', 'needs_changes')
    WHEN 'under_review' THEN p_to IN ('approved', 'needs_changes', 'rejected', 'quarantined', 'suspended')
    WHEN 'needs_changes' THEN p_to IN ('submitted')
    WHEN 'approved' THEN p_to IN ('published', 'needs_changes', 'rejected')
    WHEN 'published' THEN p_to IN ('suspended', 'takedown_pending', 'needs_changes', 'expired', 'removed', 'submitted')
    WHEN 'rejected' THEN p_to IN ('submitted')
    WHEN 'suspended' THEN p_to IN ('under_review', 'removed')
    WHEN 'quarantined' THEN p_to IN ('under_review', 'removed')
    WHEN 'takedown_pending' THEN p_to IN ('removed', 'under_review')
    WHEN 'removed' THEN p_to IN ('under_review')
    WHEN 'expired' THEN p_to IN ('submitted', 'under_review')
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_digital_product_verification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
  privileged boolean;
BEGIN
  IF NEW.is_digital IS NOT TRUE AND COALESCE(NEW.product_type::text, '') = 'physical' THEN
    RETURN NEW;
  END IF;

  IF NEW.fulfillment_mode = 'affiliate_redirect' OR NEW.acquisition_model = 'affiliate_only_product' THEN
    NEW.digital_file_url := NULL;
    NEW.fulfillment_mode := 'affiliate_redirect';
  END IF;

  -- A null state is a legacy listing, not a verification pass.
  -- Already-public legacy rows may stay public. A new insert, a first
  -- activation, or a file swap while public must not skip review.
  IF NEW.digital_verification_state IS NULL THEN
    IF NEW.is_digital IS TRUE THEN
      IF TG_OP = 'INSERT' AND NEW.status::text = 'active' THEN
        RAISE EXCEPTION 'digital_verification_required'
          USING ERRCODE = 'check_violation';
      ELSIF TG_OP = 'UPDATE'
        AND OLD.status::text IS DISTINCT FROM 'active'
        AND NEW.status::text = 'active' THEN
        RAISE EXCEPTION 'digital_verification_required'
          USING ERRCODE = 'check_violation';
      ELSIF TG_OP = 'UPDATE'
        AND OLD.digital_file_url IS DISTINCT FROM NEW.digital_file_url
        AND NEW.status::text = 'active' THEN
        RAISE EXCEPTION 'digital_verification_required'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.digital_file_url IS DISTINCT FROM NEW.digital_file_url
     AND (
       OLD.digital_verification_state IN ('published', 'approved')
       OR NEW.digital_verification_state IN ('published', 'approved')
     ) THEN
    NEW.digital_verification_state := 'submitted';
    NEW.status := 'pending_review';
    NEW.published_at := NULL;
    NEW.approved_file_digest := NULL;
    NEW.is_active := true;
  END IF;

  jwt_role := coalesce(auth.jwt() ->> 'role', '');
  privileged := jwt_role = 'service_role' OR auth.role() = 'service_role';

  IF NOT privileged THEN
    IF TG_OP = 'INSERT' AND NEW.digital_verification_state NOT IN ('draft', 'submitted') THEN
      NEW.digital_verification_state := 'draft';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.digital_file_url IS NOT DISTINCT FROM NEW.digital_file_url THEN
      NEW.digital_verification_state := OLD.digital_verification_state;
      NEW.approved_file_digest := OLD.approved_file_digest;
    END IF;
    IF NEW.status::text = 'active' AND NEW.digital_verification_state IS DISTINCT FROM 'published' THEN
      NEW.status := 'pending_review';
    END IF;
  END IF;

  IF NEW.status::text = 'active' AND NEW.digital_verification_state IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'digital_verification_required'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_enforce_digital_verification ON public.products;
CREATE TRIGGER products_enforce_digital_verification
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_digital_product_verification();

CREATE OR REPLACE FUNCTION public.apply_digital_product_decision(
  p_product_id uuid,
  p_actor uuid,
  p_to_state text,
  p_reason text,
  p_expected_state text,
  p_internal_notes text,
  p_case_type text,
  p_blocks_delivery boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prod public.products%ROWTYPE;
  vendor_user uuid;
  lic public.product_license_records%ROWTYPE;
  scan_status text;
  scan_digest text;
  scan_bytes boolean;
  open_block boolean;
  next_product_status public.product_status;
BEGIN
  IF coalesce(auth.jwt() ->> 'role', auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'apply_digital_product_decision is restricted to service_role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reason_required');
  END IF;

  SELECT * INTO prod FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF prod.digital_verification_state IS DISTINCT FROM p_expected_state THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflict', 'state', prod.digital_verification_state);
  END IF;

  IF NOT public.digital_verification_can_transition(prod.digital_verification_state, p_to_state) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition');
  END IF;

  SELECT user_id INTO vendor_user FROM public.vendors WHERE id = prod.vendor_id;
  IF vendor_user = p_actor AND p_to_state IN ('approved', 'published') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_approval');
  END IF;

  SELECT * INTO lic
  FROM public.product_license_records
  WHERE product_id = p_product_id AND superseded_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT status, file_digest, COALESCE((metadata->>'bytesInspected')::boolean, false)
  INTO scan_status, scan_digest, scan_bytes
  FROM public.product_security_scans
  WHERE product_id = p_product_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.product_enforcement_cases
    WHERE product_id = p_product_id
      AND status IN ('open', 'takedown_pending')
      AND blocks_publication = true
  ) INTO open_block;

  IF p_to_state = 'published' THEN
    IF prod.digital_verification_state IS DISTINCT FROM 'approved' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'human_approval_required');
    END IF;
    IF lic.id IS NULL OR lic.status IS DISTINCT FROM 'accepted' OR lic.revoked_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'license_not_accepted');
    END IF;
    IF lic.expires_at IS NOT NULL AND lic.expires_at <= now() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'license_expired');
    END IF;
    IF lic.permits_marketplace IS NOT TRUE THEN
      RETURN jsonb_build_object('ok', false, 'error', 'rights_incomplete');
    END IF;
    IF open_block THEN
      RETURN jsonb_build_object('ok', false, 'error', 'enforcement_block');
    END IF;
    IF prod.fulfillment_mode = 'affiliate_redirect' OR prod.acquisition_model = 'affiliate_only_product' THEN
      IF prod.affiliate_destination_url IS NULL OR prod.digital_file_url IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'affiliate_fulfillment');
      END IF;
      IF lic.permits_digital_delivery IS TRUE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'affiliate_delivery_rights');
      END IF;
      IF scan_status IS DISTINCT FROM 'not_applicable' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'scan_not_applicable');
      END IF;
    ELSE
      IF lic.permits_commercial_sale IS NOT TRUE OR lic.permits_digital_delivery IS NOT TRUE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'delivery_rights');
      END IF;
      IF prod.digital_file_url IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'file_required');
      END IF;
      IF scan_status IS DISTINCT FROM 'passed'
         OR scan_bytes IS NOT TRUE
         OR prod.file_digest IS NULL
         OR scan_digest IS DISTINCT FROM prod.file_digest THEN
        RETURN jsonb_build_object('ok', false, 'error', 'scan_not_passed');
      END IF;
    END IF;
  END IF;

  next_product_status := CASE
    WHEN p_to_state = 'published' THEN 'active'::public.product_status
    WHEN p_to_state IN ('suspended', 'quarantined', 'takedown_pending', 'expired') THEN 'paused'::public.product_status
    WHEN p_to_state = 'removed' THEN 'archived'::public.product_status
    WHEN p_to_state = 'rejected' THEN 'rejected'::public.product_status
    WHEN p_to_state = 'draft' THEN 'draft'::public.product_status
    ELSE 'pending_review'::public.product_status
  END;

  UPDATE public.products
  SET
    digital_verification_state = p_to_state,
    status = next_product_status,
    is_active = p_to_state NOT IN ('removed', 'rejected'),
    published_at = CASE
      WHEN p_to_state = 'published' THEN COALESCE(published_at, now())
      WHEN p_to_state IN ('suspended', 'quarantined', 'takedown_pending', 'removed', 'expired', 'rejected') THEN NULL
      ELSE published_at
    END,
    approved_file_digest = CASE
      WHEN p_to_state = 'published' THEN file_digest
      WHEN p_to_state IN ('submitted', 'needs_changes', 'rejected', 'expired') THEN NULL
      ELSE approved_file_digest
    END,
    review_notes = left(trim(p_reason), 2000),
    updated_at = now()
  WHERE id = p_product_id;

  INSERT INTO public.product_review_decisions (
    product_id, actor_id, action, from_state, to_state, reason, internal_notes, policy_version
  ) VALUES (
    p_product_id, p_actor, p_to_state, prod.digital_verification_state, p_to_state,
    left(trim(p_reason), 2000), NULLIF(left(COALESCE(p_internal_notes, ''), 4000), ''), '2026-10-22'
  );

  INSERT INTO public.product_verification_events (
    product_id, actor_id, action, from_state, to_state, outcome, metadata
  ) VALUES (
    p_product_id, p_actor, 'review_decision', prod.digital_verification_state, p_to_state, 'recorded',
    jsonb_build_object('policyVersion', '2026-10-22')
  );

  IF p_to_state IN ('takedown_pending', 'quarantined', 'suspended', 'removed') AND p_case_type IS NOT NULL THEN
    INSERT INTO public.product_enforcement_cases (
      product_id, vendor_id, case_type, status, blocks_publication, blocks_delivery, summary, opened_by
    ) VALUES (
      p_product_id,
      prod.vendor_id,
      p_case_type,
      CASE WHEN p_to_state = 'takedown_pending' THEN 'takedown_pending' ELSE 'open' END,
      true,
      COALESCE(p_blocks_delivery, p_to_state IN ('quarantined', 'takedown_pending', 'removed')),
      left(trim(p_reason), 2000),
      p_actor
    );
  END IF;

  IF p_to_state = 'under_review' AND prod.digital_verification_state IN ('suspended', 'takedown_pending', 'removed', 'quarantined') THEN
    UPDATE public.product_enforcement_cases
    SET status = 'resolved', resolved_at = now(), resolved_by = p_actor, resolution = left(trim(p_reason), 2000)
    WHERE product_id = p_product_id AND status IN ('open', 'takedown_pending');
  END IF;

  RETURN jsonb_build_object('ok', true, 'state', p_to_state);
END;
$$;

ALTER FUNCTION public.apply_digital_product_decision(uuid, uuid, text, text, text, text, text, boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.apply_digital_product_decision(uuid, uuid, text, text, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_digital_product_decision(uuid, uuid, text, text, text, text, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.apply_digital_product_decision(uuid, uuid, text, text, text, text, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_digital_product_decision(uuid, uuid, text, text, text, text, text, boolean) TO service_role;

REVOKE ALL ON TABLE public.product_license_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_license_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_security_scans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_review_decisions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_enforcement_cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_customer_issues FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_verification_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.product_license_records TO service_role;
GRANT ALL ON TABLE public.product_license_evidence TO service_role;
GRANT ALL ON TABLE public.product_security_scans TO service_role;
GRANT ALL ON TABLE public.product_review_decisions TO service_role;
GRANT ALL ON TABLE public.product_enforcement_cases TO service_role;
GRANT ALL ON TABLE public.product_customer_issues TO service_role;
GRANT ALL ON TABLE public.product_verification_events TO service_role;

ALTER TABLE public.product_license_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_license_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_enforcement_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_customer_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_verification_events ENABLE ROW LEVEL SECURITY;
