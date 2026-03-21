-- Fix missing RLS policies for orders and order_items
-- This ensures that buyers can update their own orders and manage their own order items.

-- ORDERS table missing UPDATE policy
CREATE POLICY "Buyers can update own orders" ON public.orders
FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- ORDER_ITEMS table missing INSERT, UPDATE, DELETE policies
CREATE POLICY "Buyers can insert own order items" ON public.order_items
FOR INSERT
WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);

CREATE POLICY "Buyers can update own order items" ON public.order_items
FOR UPDATE
USING (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
)
WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);

CREATE POLICY "Buyers can delete own order items" ON public.order_items
FOR DELETE
USING (
  order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);
