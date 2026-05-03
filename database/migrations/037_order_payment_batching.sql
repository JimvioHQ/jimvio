-- database/migrations/037_order_payment_batching.sql
-- 1. Add payment_batch_id to the orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_batch_id UUID;

-- 2. Index for faster lookups when multiple orders are in a single payment
CREATE INDEX IF NOT EXISTS idx_orders_payment_batch_id ON public.orders(payment_batch_id);

-- 3. Comment for clarity
COMMENT ON COLUMN public.orders.payment_batch_id IS 'UUID grouping multiple vendor orders for a single aggregate payment transaction.';
