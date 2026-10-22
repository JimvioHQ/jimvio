-- Course quiz answer-key privacy, wallet course debit RPC, seller physical RLS.
-- Additive and idempotent. Does not rewrite products, orders, wallets, or CJ rows.
-- Does not replace increment_wallet_balance.

-- ── 1. Quizzes: students cannot SELECT answer keys or write their own scores ──

REVOKE ALL ON TABLE public.course_quizzes FROM anon;
REVOKE ALL ON TABLE public.course_quizzes FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_quizzes FROM authenticated;
GRANT SELECT ON TABLE public.course_quizzes TO authenticated;
GRANT ALL ON TABLE public.course_quizzes TO service_role;
GRANT ALL ON TABLE public.course_quizzes TO postgres;

DROP POLICY IF EXISTS course_quizzes_select ON public.course_quizzes;
CREATE POLICY course_quizzes_select ON public.course_quizzes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.community_courses c
    JOIN public.communities com ON com.id = c.community_id
    WHERE c.id = course_quizzes.course_id
      AND (
        c.creator_id = auth.uid()
        OR com.owner_id = auth.uid()
      )
  )
);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_quiz_attempts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_quiz_attempts FROM authenticated;
REVOKE ALL ON TABLE public.course_quiz_attempts FROM PUBLIC;
GRANT SELECT ON TABLE public.course_quiz_attempts TO authenticated;
GRANT ALL ON TABLE public.course_quiz_attempts TO service_role;
GRANT ALL ON TABLE public.course_quiz_attempts TO postgres;

-- ── 2. Wallet debit/credit that does not touch total_earned ──────────────────

CREATE OR REPLACE FUNCTION public.debit_wallet_if_sufficient(p_wallet_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
  new_balance numeric;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'debit_wallet_if_sufficient is restricted to service_role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_wallet_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  UPDATE public.wallets
  SET available_balance = available_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id
    AND available_balance >= p_amount
  RETURNING available_balance INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_wallet_balance';
  END IF;
  RETURN new_balance;
END;
$$;

ALTER FUNCTION public.debit_wallet_if_sufficient(uuid, numeric) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.debit_wallet_if_sufficient(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.debit_wallet_if_sufficient(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.debit_wallet_if_sufficient(uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet_if_sufficient(uuid, numeric) TO postgres;
GRANT EXECUTE ON FUNCTION public.debit_wallet_if_sufficient(uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.credit_wallet_available(p_wallet_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text;
  new_balance numeric;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', auth.role(), '');
  IF jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'credit_wallet_available is restricted to service_role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_wallet_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;

  UPDATE public.wallets
  SET available_balance = available_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id
  RETURNING available_balance INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;
  RETURN new_balance;
END;
$$;

ALTER FUNCTION public.credit_wallet_available(uuid, numeric) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.credit_wallet_available(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_available(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.credit_wallet_available(uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_available(uuid, numeric) TO postgres;
GRANT EXECUTE ON FUNCTION public.credit_wallet_available(uuid, numeric) TO service_role;

CREATE TABLE IF NOT EXISTS public.course_purchase_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  provider text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  transaction_id uuid NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  wallet_debited boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_purchase_attempts_status_chk
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE UNIQUE INDEX IF NOT EXISTS course_purchase_attempts_open_uidx
  ON public.course_purchase_attempts (user_id, course_id, provider)
  WHERE status IN ('pending', 'completed');

ALTER TABLE public.course_purchase_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.course_purchase_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.course_purchase_attempts FROM anon;
REVOKE ALL ON TABLE public.course_purchase_attempts FROM authenticated;
GRANT ALL ON TABLE public.course_purchase_attempts TO postgres;
GRANT ALL ON TABLE public.course_purchase_attempts TO service_role;

-- ── 3. Vendor-owned product writes: unverified cannot insert/update physical ─
-- Service role (CJ catalog ingestion) bypasses RLS. Do not restrict source flags.

CREATE OR REPLACE FUNCTION public.vendor_may_write_product(p_vendor_id uuid, p_product_type product_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = p_vendor_id
      AND v.user_id = auth.uid()
      AND COALESCE(v.is_active, true)
      AND v.verification_status IS DISTINCT FROM 'suspended'::verification_status
      AND (
        p_product_type IS DISTINCT FROM 'physical'::product_type
        OR v.verification_status = 'verified'::verification_status
      )
  );
$$;

REVOKE ALL ON FUNCTION public.vendor_may_write_product(uuid, product_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_may_write_product(uuid, product_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_may_write_product(uuid, product_type) TO service_role;

DROP POLICY IF EXISTS products_insert ON public.products;
CREATE POLICY products_insert ON public.products
FOR INSERT TO authenticated
WITH CHECK (public.vendor_may_write_product(vendor_id, product_type));

DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update ON public.products
FOR UPDATE TO authenticated
USING (auth.uid() = (SELECT vendors.user_id FROM vendors WHERE vendors.id = products.vendor_id))
WITH CHECK (public.vendor_may_write_product(vendor_id, product_type));
