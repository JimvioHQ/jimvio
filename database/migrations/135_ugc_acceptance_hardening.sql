-- UGC acceptance: author-only note deletes + webhook delivery idempotency.
-- Additive. Does not change money tables or per-view payout uniqueness.

DROP POLICY IF EXISTS ugc_campaign_notes_delete ON public.ugc_campaign_notes;
CREATE POLICY ugc_campaign_notes_delete ON public.ugc_campaign_notes
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS ugc_webhook_deliveries_idempotency_key_uidx
  ON public.ugc_webhook_deliveries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
