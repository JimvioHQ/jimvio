-- Community Chat completion (additive, production-safe)
-- Reply-to persistence, message metadata (link previews, gifs), soft-delete
-- tracking, pin tracking, and search/pagination indexes.
-- Does NOT touch Live Studio tables (see hooks/live/*, app/api/live/*, app/api/c/live/*).

-- ─── community_messages: reply-to snapshot ─────────────────────────────────
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_messages_reply_to_id_fkey'
  ) THEN
    ALTER TABLE public.community_messages
      ADD CONSTRAINT community_messages_reply_to_id_fkey
      FOREIGN KEY (reply_to_id)
      REFERENCES public.community_messages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS reply_to_body TEXT;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS reply_to_sender TEXT;

-- ─── community_messages: structured metadata (link previews, gif source, etc.) ─
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ─── community_messages: soft-delete tracking ──────────────────────────────
-- Preference: soft-delete only. `is_deleted` already exists (migration 029)
-- and is treated as the source of truth for hiding a message everywhere
-- (feed queries, realtime, thread panel). We add who/when for moderation
-- audit trails; the row is never hard-deleted by the API going forward.
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── community_messages: pin tracking ──────────────────────────────────────
-- `is_pinned` already exists (migration 029); add who/when for staff audit.
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- ─── Indexes ────────────────────────────────────────────────────────────────
-- Cursor pagination (before timestamp) on the hot read path.
CREATE INDEX IF NOT EXISTS idx_community_messages_room_created
  ON public.community_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_messages_reply_to
  ON public.community_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_messages_pinned
  ON public.community_messages(room_id, pinned_at DESC)
  WHERE is_pinned = true;

-- Optional body search (trigram — pg_trgm already enabled in migration 00).
CREATE INDEX IF NOT EXISTS idx_community_messages_body_trgm
  ON public.community_messages USING gin (body gin_trgm_ops);
