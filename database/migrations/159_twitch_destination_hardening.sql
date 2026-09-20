-- Harden live_destinations for Twitch production:
-- 1) Allow reconnect_required status (invalid/revoked OAuth tokens)
-- 2) Prevent authenticated clients from reading encrypted_credentials ciphertext via PostgREST

ALTER TABLE public.live_destinations
  DROP CONSTRAINT IF EXISTS live_destinations_status_check;

ALTER TABLE public.live_destinations
  ADD CONSTRAINT live_destinations_status_check
  CHECK (status IN (
    'supported',
    'ready',
    'requires_approval',
    'unsupported',
    'disconnected',
    'error',
    'reconnecting',
    'connected',
    'reconnect_required'
  ));

REVOKE SELECT (encrypted_credentials) ON TABLE public.live_destinations FROM authenticated;
GRANT SELECT (
  id,
  user_id,
  platform,
  display_name,
  status,
  provider_account_id,
  provider_channel_id,
  provider_page_id,
  avatar_url,
  metadata,
  capabilities,
  last_connected_at,
  last_used_at,
  last_error,
  revoked_at,
  created_at,
  updated_at
) ON TABLE public.live_destinations TO authenticated;
