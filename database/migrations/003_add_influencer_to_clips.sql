-- ============================================================
-- JIMVIO — Add Influencer Attribution to Viral Clips
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vsfhwfimudpdipdkxbww/sql/new
-- ============================================================

-- 1. Add influencer_id column
ALTER TABLE public.viral_clips 
ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL;

-- 2. Make vendor_id nullable (clips can now be owned by either vendor or influencer)
ALTER TABLE public.viral_clips 
ALTER COLUMN vendor_id DROP NOT NULL;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_viral_clips_influencer_id ON public.viral_clips(influencer_id);

-- 4. Update RLS policies to allow influencers to manage their own clips
CREATE POLICY "Influencers can manage own clips" ON public.viral_clips 
FOR ALL USING (
  influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
);

-- 5. Update existing policy for vendors to be more explicit
-- (Usually already exists, but ensure it works with the change)
DROP POLICY IF EXISTS "Vendors can manage own clips" ON public.viral_clips;
CREATE POLICY "Vendors can manage own clips" ON public.viral_clips 
FOR ALL USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

RAISE NOTICE 'Migration 003 completed: influencer_id added to viral_clips';
