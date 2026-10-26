-- Public newsletter list. Consent is recorded only when a person submits
-- their address and later opens the confirmation link. This statement
-- creates an empty table. It does not copy or rewrite existing rows.
--
-- Reverse: drop this table only after the application no longer reads it.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  consent_text text NOT NULL,
  consent_requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  confirm_token_hash text,
  unsubscribe_token_hash text,
  source text NOT NULL DEFAULT 'footer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_normalized_key UNIQUE (email_normalized)
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON public.newsletter_subscribers (status);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.newsletter_subscribers IS
  'Footer newsletter recipients. Tokens are stored as hashes. Service role access only.';
