-- Allow users to request payouts (e.g. affiliate withdrawals)
DROP POLICY IF EXISTS "Users can insert own payouts" ON public.payouts;
CREATE POLICY "Users can insert own payouts"
  ON public.payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
