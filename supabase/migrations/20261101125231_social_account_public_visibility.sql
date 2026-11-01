-- Social account visibility is opt-in. Existing accounts stay private until
-- their owners explicitly enable public display on their profile.
ALTER TABLE public.jip_social_accounts
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.jip_social_accounts.is_public IS
  'Owner-controlled opt-in for displaying this social account on the public Jimvio profile. Defaults to private.';
