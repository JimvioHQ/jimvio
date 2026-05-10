CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_wallet_id uuid, p_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.wallets 
  SET available_balance = available_balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;
END;
$$;
