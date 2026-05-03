-- database/migrations/041_afripay_integration.sql
-- Add AfriPay fields to tracking transactions

-- Note: We already have 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled' in payment_status ENUM.
-- We are just adding new columns to capture AfriPay Webhook metadata.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS afripay_reference TEXT,
ADD COLUMN IF NOT EXISTS afripay_transaction_id TEXT;
