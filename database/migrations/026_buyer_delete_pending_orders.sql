-- Allow buyers to delete their own pending cart orders (e.g. last item removed).
-- Without this, order_items delete succeeds but the empty order row remains.

CREATE POLICY "Buyers can delete own pending orders"
ON public.orders
FOR DELETE
USING (auth.uid() = buyer_id AND status = 'pending');
