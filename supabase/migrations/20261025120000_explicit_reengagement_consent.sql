-- Explicit marketing reengagement consent.
--
-- email_reengagement defaults to true in 20260720151649. That default is not
-- a user choice. This column stays NULL until the application records a
-- boolean the user submitted. NULL is not consent, including when the
-- boolean is true. This statement does not update existing rows.
--
-- Reverse, after the application no longer reads the column:
-- alter the default back to true, then drop only this column.
-- Do not rewrite email_reengagement while reversing.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_reengagement_explicit_at timestamptz;

ALTER TABLE public.notification_preferences
  ALTER COLUMN email_reengagement SET DEFAULT false;

COMMENT ON COLUMN public.notification_preferences.email_reengagement_explicit_at IS
  'Timestamp of the user save that set email_reengagement. NULL means the boolean was not explicitly granted.';
