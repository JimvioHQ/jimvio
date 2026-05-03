-- database/migrations/036_order_totals_and_rls.sql

-- 1. Function to update order totals based on its items
CREATE OR REPLACE FUNCTION public.update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders
    SET 
        subtotal = (SELECT COALESCE(SUM(total_price), 0) FROM public.order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)),
        total_amount = (SELECT COALESCE(SUM(total_price), 0) FROM public.order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Triggers for order_items (handles INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS tr_update_order_totals ON public.order_items;
CREATE TRIGGER tr_update_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.update_order_totals();

-- 3. Fix RLS for order_items: Allow buyers to delete items if the order belongs to them and is pending
DROP POLICY IF EXISTS "Buyers can delete own order items" ON public.order_items;
CREATE POLICY "Buyers can delete own order items"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
    AND buyer_id = auth.uid()
    AND status = 'pending'
  )
);
