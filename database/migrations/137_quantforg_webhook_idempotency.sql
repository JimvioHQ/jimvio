-- QuantForg webhook idempotency: one Space message per event_id.
-- Safe additive index — no data loss, preserves existing rows.

CREATE UNIQUE INDEX IF NOT EXISTS community_messages_quantforg_event_id_uidx
  ON public.community_messages ((metadata->>'event_id'))
  WHERE (metadata->>'source') = 'quantforg'
    AND (metadata->>'event_id') IS NOT NULL
    AND (metadata->>'event_id') <> '';

COMMENT ON INDEX public.community_messages_quantforg_event_id_uidx IS
  'Ensures QuantForg webhook retries cannot duplicate Space messages for the same event_id.';
