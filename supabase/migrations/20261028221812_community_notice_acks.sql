-- One-time community notices (e.g. the financial risk notice): records that a
-- member has seen a notice so it is shown only once per member per community.
CREATE TABLE IF NOT EXISTS public.community_notice_acks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  notice text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id, notice)
);

ALTER TABLE public.community_notice_acks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_notice_acks' AND policyname = 'notice_acks_select_own') THEN
    CREATE POLICY notice_acks_select_own ON public.community_notice_acks
      FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_notice_acks' AND policyname = 'notice_acks_insert_own') THEN
    CREATE POLICY notice_acks_insert_own ON public.community_notice_acks
      FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS community_notice_acks_community_idx ON public.community_notice_acks (community_id);
