-- UGC V2 Enterprise & Intelligence Layer
-- Additive only. Preserves all V1 tables and behavior.

-- ─── Team workspaces ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_brand_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner', 'manager', 'reviewer', 'finance', 'viewer')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_brand_members_brand
  ON public.ugc_brand_members(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_ugc_brand_members_user
  ON public.ugc_brand_members(user_id, status);

-- ─── Creator CRM lists ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_crm_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_crm_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.ugc_crm_lists(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_crm_lists_brand ON public.ugc_crm_lists(brand_id);
CREATE INDEX IF NOT EXISTS idx_ugc_crm_list_members_inf ON public.ugc_crm_list_members(influencer_id);

-- Extend favorite creators with CRM fields if missing
ALTER TABLE public.ugc_favorite_creators
  ADD COLUMN IF NOT EXISTS last_campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS performance jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── Contracts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE SET NULL,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'void')),
  expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ugc_contracts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ugc_contracts_brand ON public.ugc_contracts(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_ugc_contracts_campaign ON public.ugc_contracts(campaign_id);

-- ─── Escrow ledger / disputes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_escrow_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  entry_type text NOT NULL
    CHECK (entry_type IN ('fund', 'lock', 'release', 'refund', 'adjust', 'dispute_hold')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  balance_after numeric,
  reference text,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_escrow_ledger_campaign
  ON public.ugc_escrow_ledger(campaign_id, created_at DESC);

ALTER TABLE public.ugc_campaign_escrow
  ADD COLUMN IF NOT EXISTS locked_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS released_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.ugc_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  submission_id uuid REFERENCES public.ugc_submissions(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  against_role text NOT NULL DEFAULT 'brand'
    CHECK (against_role IN ('brand', 'creator', 'platform')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'withdrawn')),
  resolution text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  amount_in_dispute numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.ugc_disputes(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  attachment_url text,
  attachment_name text,
  is_decision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.ugc_disputes(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_disputes_brand ON public.ugc_disputes(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_ugc_disputes_campaign ON public.ugc_disputes(campaign_id);

-- ─── Referrals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  reward_amount numeric NOT NULL DEFAULT 5,
  reward_currency text NOT NULL DEFAULT 'USD',
  uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.ugc_referral_codes(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded', 'rejected')),
  campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE SET NULL,
  reward_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_referral_codes_owner ON public.ugc_referral_codes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_referral_attr_code ON public.ugc_referral_attributions(code_id, status);

-- ─── Campaign quality scores ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_campaign_quality (
  campaign_id uuid PRIMARY KEY REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  trust_score numeric NOT NULL DEFAULT 50,
  quality_score numeric NOT NULL DEFAULT 50,
  spam_risk numeric NOT NULL DEFAULT 10,
  completion_prediction numeric NOT NULL DEFAULT 50,
  funding_reliability numeric NOT NULL DEFAULT 50,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Automations & workflows ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_event text NOT NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.ugc_workflows(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_node text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ugc_automations_brand ON public.ugc_automations(brand_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_ugc_workflows_brand ON public.ugc_workflows(brand_id);

-- ─── Webhooks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.ugc_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'failed')),
  response_code integer,
  attempts integer NOT NULL DEFAULT 0,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ugc_webhook_subs_brand ON public.ugc_webhook_subscriptions(brand_id);
CREATE INDEX IF NOT EXISTS idx_ugc_webhook_deliveries_sub ON public.ugc_webhook_deliveries(subscription_id, created_at DESC);

-- ─── AI copilot sessions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_copilot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('campaign', 'creator')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_copilot_user ON public.ugc_copilot_sessions(user_id, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.ugc_brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_crm_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_crm_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_escrow_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_copilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ugc_is_brand_member(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors v WHERE v.id = p_brand_id AND v.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.ugc_brand_members m
    WHERE m.brand_id = p_brand_id AND m.user_id = auth.uid() AND m.status = 'active'
  );
$$;

DROP POLICY IF EXISTS ugc_brand_members_access ON public.ugc_brand_members;
CREATE POLICY ugc_brand_members_access ON public.ugc_brand_members
  FOR ALL USING (
    public.ugc_is_brand_owner(brand_id) OR user_id = auth.uid()
  ) WITH CHECK (public.ugc_is_brand_owner(brand_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS ugc_crm_lists_access ON public.ugc_crm_lists;
CREATE POLICY ugc_crm_lists_access ON public.ugc_crm_lists
  FOR ALL USING (public.ugc_is_brand_member(brand_id))
  WITH CHECK (public.ugc_is_brand_member(brand_id));

DROP POLICY IF EXISTS ugc_crm_list_members_access ON public.ugc_crm_list_members;
CREATE POLICY ugc_crm_list_members_access ON public.ugc_crm_list_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_crm_lists l
      WHERE l.id = list_id AND public.ugc_is_brand_member(l.brand_id)
    )
  );

DROP POLICY IF EXISTS ugc_contracts_access ON public.ugc_contracts;
CREATE POLICY ugc_contracts_access ON public.ugc_contracts
  FOR ALL USING (
    public.ugc_is_brand_member(brand_id)
    OR influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS ugc_contract_versions_access ON public.ugc_contract_versions;
CREATE POLICY ugc_contract_versions_access ON public.ugc_contract_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_contracts c
      WHERE c.id = contract_id AND (
        public.ugc_is_brand_member(c.brand_id)
        OR c.influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS ugc_escrow_ledger_access ON public.ugc_escrow_ledger;
CREATE POLICY ugc_escrow_ledger_access ON public.ugc_escrow_ledger
  FOR SELECT USING (public.ugc_is_brand_member(brand_id));

DROP POLICY IF EXISTS ugc_disputes_access ON public.ugc_disputes;
CREATE POLICY ugc_disputes_access ON public.ugc_disputes
  FOR ALL USING (
    public.ugc_is_brand_member(brand_id)
    OR opened_by = auth.uid()
    OR influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS ugc_dispute_messages_access ON public.ugc_dispute_messages;
CREATE POLICY ugc_dispute_messages_access ON public.ugc_dispute_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_disputes d WHERE d.id = dispute_id AND (
        public.ugc_is_brand_member(d.brand_id)
        OR d.opened_by = auth.uid()
        OR d.influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS ugc_dispute_evidence_access ON public.ugc_dispute_evidence;
CREATE POLICY ugc_dispute_evidence_access ON public.ugc_dispute_evidence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_disputes d WHERE d.id = dispute_id AND (
        public.ugc_is_brand_member(d.brand_id)
        OR d.opened_by = auth.uid()
        OR d.influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS ugc_referral_codes_own ON public.ugc_referral_codes;
CREATE POLICY ugc_referral_codes_own ON public.ugc_referral_codes
  FOR ALL USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS ugc_referral_attr_access ON public.ugc_referral_attributions;
CREATE POLICY ugc_referral_attr_access ON public.ugc_referral_attributions
  FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS ugc_campaign_quality_read ON public.ugc_campaign_quality;
CREATE POLICY ugc_campaign_quality_read ON public.ugc_campaign_quality
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ugc_automations_access ON public.ugc_automations;
CREATE POLICY ugc_automations_access ON public.ugc_automations
  FOR ALL USING (public.ugc_is_brand_member(brand_id))
  WITH CHECK (public.ugc_is_brand_member(brand_id));

DROP POLICY IF EXISTS ugc_workflows_access ON public.ugc_workflows;
CREATE POLICY ugc_workflows_access ON public.ugc_workflows
  FOR ALL USING (public.ugc_is_brand_member(brand_id))
  WITH CHECK (public.ugc_is_brand_member(brand_id));

DROP POLICY IF EXISTS ugc_workflow_runs_access ON public.ugc_workflow_runs;
CREATE POLICY ugc_workflow_runs_access ON public.ugc_workflow_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflows w
      WHERE w.id = workflow_id AND public.ugc_is_brand_member(w.brand_id)
    )
  );

DROP POLICY IF EXISTS ugc_webhook_subs_access ON public.ugc_webhook_subscriptions;
CREATE POLICY ugc_webhook_subs_access ON public.ugc_webhook_subscriptions
  FOR ALL USING (public.ugc_is_brand_member(brand_id))
  WITH CHECK (public.ugc_is_brand_member(brand_id));

DROP POLICY IF EXISTS ugc_webhook_deliveries_access ON public.ugc_webhook_deliveries;
CREATE POLICY ugc_webhook_deliveries_access ON public.ugc_webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_webhook_subscriptions s
      WHERE s.id = subscription_id AND public.ugc_is_brand_member(s.brand_id)
    )
  );

DROP POLICY IF EXISTS ugc_copilot_own ON public.ugc_copilot_sessions;
CREATE POLICY ugc_copilot_own ON public.ugc_copilot_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
