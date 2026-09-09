-- Expand business verification fee payment methods
ALTER TABLE public.business_verification_fee_payments
  DROP CONSTRAINT IF EXISTS business_verification_fee_payments_method_check;

ALTER TABLE public.business_verification_fee_payments
  ADD CONSTRAINT business_verification_fee_payments_method_check
  CHECK (method IN ('wallet', 'flutterwave', 'mobile_money', 'nowpayments', 'binancepay'));
