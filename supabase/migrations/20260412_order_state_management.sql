-- =============================================================================
-- Migration: Order State Management & Escrow Security
-- Created: 2026-04-12
-- Purpose: Add status history tracking and ensure wallet fields for pending distribution.
-- =============================================================================

-- 0. Update order_status Enum (Required for final transition)
-- Note: ALTER TYPE ... ADD VALUE cannot be executed in a transaction block (DO) in some PG environments.
-- If this fails because 'completed' already exists, it is safe to ignore.
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';

-- 1. Create Order Status History for perfect traceability
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id), -- Who made the change
  previous_status  TEXT,
  new_status       TEXT NOT NULL,
  notes            TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for performance on detail pages
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- 2. Ensure Wallet has pending_balance
-- (Additive change to support escrow flow)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='pending_balance') THEN
    ALTER TABLE public.wallets ADD COLUMN pending_balance DECIMAL(14,2) DEFAULT 0;
  END IF;
END $$;

-- 3. RLS for History (Viewable by buyers/vendors related to order)
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history of orders they are involved in
DROP POLICY IF EXISTS "Users can view history of their own orders" ON public.order_status_history;
CREATE POLICY "Users can view history of their own orders"
  ON public.order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_status_history.order_id 
      AND (orders.buyer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.order_items 
        WHERE order_items.order_id = orders.id 
        AND EXISTS (
          SELECT 1 FROM public.vendors 
          WHERE vendors.id = order_items.vendor_id 
          AND vendors.user_id = auth.uid()
        )
      ))
    )
  );
