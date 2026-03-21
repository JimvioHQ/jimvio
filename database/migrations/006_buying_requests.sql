-- Buying leads: buyers post requests, suppliers can send offers
CREATE TABLE IF NOT EXISTS public.buying_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  category text,
  quantity_needed numeric NOT NULL DEFAULT 1,
  budget_min numeric,
  budget_max numeric,
  delivery_country text,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buying_lead_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_request_id uuid NOT NULL REFERENCES public.buying_requests(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  message text,
  offered_price numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buying_requests_buyer ON public.buying_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buying_requests_status ON public.buying_requests(status);
CREATE INDEX IF NOT EXISTS idx_buying_lead_offers_request ON public.buying_lead_offers(buying_request_id);

ALTER TABLE public.buying_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_lead_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own buying requests" ON public.buying_requests
FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can view offers on their requests" ON public.buying_lead_offers
FOR SELECT USING (
  buying_request_id IN (SELECT id FROM public.buying_requests WHERE buyer_id = auth.uid())
);
CREATE POLICY "Vendors can insert offers" ON public.buying_lead_offers
FOR INSERT WITH CHECK (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendors can update own offers" ON public.buying_lead_offers
FOR UPDATE USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
