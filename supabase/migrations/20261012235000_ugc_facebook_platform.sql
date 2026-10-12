-- Facebook is a supported UGC publishing platform. Existing "x" values stay valid
-- for historical submissions. New campaign setup no longer offers X.
ALTER TYPE public.ugc_platform ADD VALUE IF NOT EXISTS 'facebook';
