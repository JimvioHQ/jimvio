-- ============================================================
-- Migration 058: Add checkout_direct to order_status enum
-- ============================================================

-- Add the new status directly to the ENUM type
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'checkout_direct';
