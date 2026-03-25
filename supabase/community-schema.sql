-- ════════════════════════════════════════════════════════════════
-- JIMVIO PRO COMMUNITY SYSTEM — Full Schema
-- Run AFTER supabase/drop-old-community.sql
-- ════════════════════════════════════════════════════════════════
--
-- MEDIA (Cloudinary): Store Cloudinary URLs or public_ids in text/jsonb.
--   • Avatars, covers, thumbnails: HTTPS secure_url or public_id as text
--   • Post images / message attachments: JSON arrays of { url, public_id?, resource_type? }
--   • Video: video_url (HLS/mp4 URL from Cloudinary or external)
-- Upload signing stays in app (e.g. folder jimvio/community); this schema only persists references.
--
-- Depends on existing: public.profiles (and auth.users)
-- Does not alter: wallets, payouts, transactions, user_roles (referenced in comments only)
-- ════════════════════════════════════════════════════════════════

-- ── 1. COMMUNITIES ───────────────────────────────────────────────
-- Top-level workspace. Created by a creator.
CREATE TABLE public.communities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,
  tagline             text,
  description         text,
  long_description    text,
  avatar_url          text,
  cover_image         text,
  category            text,
  tags                text[],
  -- Access control
  is_private          boolean DEFAULT false,
  -- Pricing
  is_free             boolean DEFAULT true,
  monthly_price       numeric DEFAULT 0,
  yearly_price        numeric DEFAULT 0,
  lifetime_price      numeric DEFAULT 0,
  currency            text DEFAULT 'USD',
  trial_days          integer DEFAULT 0,
  -- Stats
  member_count        integer DEFAULT 0,
  space_count         integer DEFAULT 0,
  post_count          integer DEFAULT 0,
  -- Status
  is_featured         boolean DEFAULT false,
  is_active           boolean DEFAULT true,
  -- Jimvio commission on community subscriptions
  platform_commission_rate numeric DEFAULT 15,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── 2. SPACES ─────────────────────────────────────────────────────
-- Main categories inside a community (e.g. Learning, Discussions)
CREATE TABLE public.spaces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  description     text,
  icon            text,
  color           text,
  sort_order      integer DEFAULT 0,
  -- Access level
  access_type     text DEFAULT 'free'
                  CHECK (access_type IN ('free', 'paid', 'premium')),
  -- Pricing override (if different from community price)
  price           numeric,
  currency        text DEFAULT 'USD',
  -- Stats
  room_count      integer DEFAULT 0,
  member_count    integer DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(community_id, slug)
);

-- ── 3. ROOMS ──────────────────────────────────────────────────────
-- Purpose-specific containers inside spaces
CREATE TABLE public.rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  description     text,
  icon            text,
  sort_order      integer DEFAULT 0,
  -- Room type determines what content goes inside
  room_type       text NOT NULL DEFAULT 'chat'
                  CHECK (room_type IN (
                    'chat',
                    'course',
                    'posts',
                    'resources',
                    'tasks'
                  )),
  -- Access
  access_type     text DEFAULT 'inherit'
                  CHECK (access_type IN ('inherit', 'free', 'paid', 'premium')),
  is_locked       boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(space_id, slug)
);

-- ── 4. COMMUNITY MEMBERSHIPS ──────────────────────────────────────
-- Tracks who has access to what
CREATE TABLE public.community_memberships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id        uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role                text DEFAULT 'member'
                      CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  -- Subscription
  plan_type           text DEFAULT 'free'
                      CHECK (plan_type IN ('free', 'monthly', 'yearly', 'lifetime')),
  status              text DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'cancelled', 'banned')),
  subscribed_at       timestamptz DEFAULT now(),
  expires_at          timestamptz,
  cancelled_at        timestamptz,
  -- Payment reference
  payment_reference   text,
  payment_provider    text,
  amount_paid         numeric DEFAULT 0,
  -- Space access overrides (space IDs with special access)
  space_access        uuid[] DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- ── 5. POSTS ──────────────────────────────────────────────────────
CREATE TABLE public.community_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  space_id        uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text,
  body            text NOT NULL,
  post_type       text DEFAULT 'discussion'
                  CHECK (post_type IN ('discussion', 'announcement', 'resource', 'question', 'poll')),
  -- Media (Cloudinary URLs / metadata in JSON)
  images          jsonb DEFAULT '[]',
  attachments     jsonb DEFAULT '[]',
  video_url       text,
  -- Engagement
  like_count      integer DEFAULT 0,
  comment_count   integer DEFAULT 0,
  view_count      integer DEFAULT 0,
  -- Flags
  is_pinned       boolean DEFAULT false,
  is_exclusive    boolean DEFAULT false,
  is_published    boolean DEFAULT true,
  published_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 6. POST COMMENTS ──────────────────────────────────────────────
CREATE TABLE public.community_post_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  body        text NOT NULL,
  like_count  integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── 7. POST LIKES ─────────────────────────────────────────────────
CREATE TABLE public.community_post_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ── 8. SAVED POSTS ────────────────────────────────────────────────
CREATE TABLE public.community_saved_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- ── 9. CHAT MESSAGES ──────────────────────────────────────────────
CREATE TABLE public.community_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            text DEFAULT '',
  message_type    text DEFAULT 'text'
                  CHECK (message_type IN ('text', 'image', 'file', 'system')),
  -- Threading
  thread_id       uuid REFERENCES public.community_messages(id) ON DELETE SET NULL,
  reply_count     integer DEFAULT 0,
  -- Media (Cloudinary)
  attachments     jsonb DEFAULT '[]',
  -- Reactions
  reactions       jsonb DEFAULT '{}',
  -- Flags
  is_pinned       boolean DEFAULT false,
  is_edited       boolean DEFAULT false,
  edited_at       timestamptz,
  is_deleted      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- ── 10. COURSES ───────────────────────────────────────────────────
CREATE TABLE public.community_courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  creator_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  thumbnail_url   text,
  total_modules   integer DEFAULT 0,
  total_lessons   integer DEFAULT 0,
  total_duration  integer DEFAULT 0,
  difficulty      text DEFAULT 'beginner'
                  CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_published    boolean DEFAULT false,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 11. COURSE MODULES ────────────────────────────────────────────
CREATE TABLE public.course_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  sort_order  integer DEFAULT 0,
  is_free     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ── 12. COURSE LESSONS ────────────────────────────────────────────
CREATE TABLE public.course_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text,
  video_url       text,
  duration        integer DEFAULT 0,
  sort_order      integer DEFAULT 0,
  is_free         boolean DEFAULT false,
  attachments     jsonb DEFAULT '[]',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 13. LESSON PROGRESS ───────────────────────────────────────────
CREATE TABLE public.lesson_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  is_completed    boolean DEFAULT false,
  completed_at    timestamptz,
  watch_time      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ── 14. TASKS ─────────────────────────────────────────────────────
CREATE TABLE public.community_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  creator_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  task_type       text DEFAULT 'daily'
                  CHECK (task_type IN ('daily', 'weekly', 'challenge', 'milestone')),
  difficulty      text DEFAULT 'easy'
                  CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points          integer DEFAULT 10,
  is_recurring    boolean DEFAULT false,
  recurrence_days integer DEFAULT 1,
  due_date        timestamptz,
  completion_count integer DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- ── 15. TASK COMPLETIONS ──────────────────────────────────────────
CREATE TABLE public.task_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.community_tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_text  text,
  proof_url   text,
  status      text DEFAULT 'submitted'
              CHECK (status IN ('submitted', 'approved', 'rejected')),
  points_earned integer DEFAULT 0,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- ── 16. MEMBER POINTS & LEADERBOARD ──────────────────────────────
CREATE TABLE public.member_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  total_points    integer DEFAULT 0,
  level           integer DEFAULT 1,
  streak_days     integer DEFAULT 0,
  last_active_at  timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, community_id)
);

-- ── 17. COMMUNITY PAYMENTS ────────────────────────────────────────
CREATE TABLE public.community_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id        uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  membership_id       uuid NOT NULL REFERENCES public.community_memberships(id) ON DELETE RESTRICT,
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount              numeric NOT NULL,
  currency            text DEFAULT 'USD',
  plan_type           text NOT NULL,
  payment_provider    text,
  payment_reference   text,
  platform_commission numeric DEFAULT 0,
  creator_earnings    numeric DEFAULT 0,
  status              text DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at          timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════

CREATE INDEX idx_communities_owner       ON public.communities(owner_id);
CREATE INDEX idx_communities_slug        ON public.communities(slug);
CREATE INDEX idx_spaces_community        ON public.spaces(community_id);
CREATE INDEX idx_rooms_space             ON public.rooms(space_id);
CREATE INDEX idx_rooms_community         ON public.rooms(community_id);
CREATE INDEX idx_rooms_room_type         ON public.rooms(room_type);
CREATE INDEX idx_memberships_user        ON public.community_memberships(user_id);
CREATE INDEX idx_memberships_community   ON public.community_memberships(community_id);
CREATE INDEX idx_memberships_status      ON public.community_memberships(status);
CREATE INDEX idx_posts_room              ON public.community_posts(room_id);
CREATE INDEX idx_posts_community         ON public.community_posts(community_id);
CREATE INDEX idx_posts_author            ON public.community_posts(author_id);
CREATE INDEX idx_post_comments_post      ON public.community_post_comments(post_id);
CREATE INDEX idx_post_likes_post         ON public.community_post_likes(post_id);
CREATE INDEX idx_saved_posts_user        ON public.community_saved_posts(user_id);
CREATE INDEX idx_messages_room           ON public.community_messages(room_id);
CREATE INDEX idx_messages_community      ON public.community_messages(community_id);
CREATE INDEX idx_messages_thread         ON public.community_messages(thread_id);
CREATE INDEX idx_messages_created        ON public.community_messages(created_at);
CREATE INDEX idx_courses_room            ON public.community_courses(room_id);
CREATE INDEX idx_modules_course          ON public.course_modules(course_id);
CREATE INDEX idx_lessons_module          ON public.course_lessons(module_id);
CREATE INDEX idx_lessons_course          ON public.course_lessons(course_id);
CREATE INDEX idx_progress_user           ON public.lesson_progress(user_id);
CREATE INDEX idx_progress_lesson         ON public.lesson_progress(lesson_id);
CREATE INDEX idx_tasks_room              ON public.community_tasks(room_id);
CREATE INDEX idx_completions_task        ON public.task_completions(task_id);
CREATE INDEX idx_completions_user        ON public.task_completions(user_id);
CREATE INDEX idx_points_community        ON public.member_points(community_id);
CREATE INDEX idx_points_user             ON public.member_points(user_id);
CREATE INDEX idx_payments_community      ON public.community_payments(community_id);
CREATE INDEX idx_payments_user           ON public.community_payments(user_id);

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.communities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_saved_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_points          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_payments     ENABLE ROW LEVEL SECURITY;

-- Helper: active membership in a community
-- Policies use EXISTS (...) subqueries inline

-- COMMUNITIES
CREATE POLICY "communities_select_public"
  ON public.communities FOR SELECT
  USING (is_active = true);

CREATE POLICY "communities_insert_owner"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "communities_update_owner"
  ON public.communities FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "communities_delete_owner"
  ON public.communities FOR DELETE
  USING (auth.uid() = owner_id);

-- SPACES (visible if parent community active; manage by owner/admin)
CREATE POLICY "spaces_select_member_or_public"
  ON public.spaces FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = spaces.community_id AND c.is_active = true
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.communities co
        WHERE co.id = spaces.community_id AND co.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.community_memberships m
        WHERE m.community_id = spaces.community_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.communities c2
        WHERE c2.id = spaces.community_id AND c2.is_active = true AND c2.is_private = false
      )
    )
  );

CREATE POLICY "spaces_manage_staff"
  ON public.spaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = spaces.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = spaces.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "spaces_manage_community_owner"
  ON public.spaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = spaces.community_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = spaces.community_id AND c.owner_id = auth.uid()
    )
  );

-- ROOMS
CREATE POLICY "rooms_select_members"
  ON public.rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = rooms.community_id AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = rooms.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "rooms_manage_staff"
  ON public.rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = rooms.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = rooms.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

CREATE POLICY "rooms_manage_community_owner"
  ON public.rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = rooms.community_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = rooms.community_id AND c.owner_id = auth.uid()
    )
  );

-- MEMBERSHIPS (do not subquery community_memberships here — causes infinite RLS recursion)
CREATE POLICY "memberships_select_own_or_staff"
  ON public.community_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "memberships_insert_self"
  ON public.community_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "memberships_update_own_or_staff"
  ON public.community_memberships FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_id = auth.uid()
    )
  );

-- POSTS
CREATE POLICY "posts_select_members"
  ON public.community_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "posts_insert_members"
  ON public.community_posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "posts_update_author_or_staff"
  ON public.community_posts FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

CREATE POLICY "posts_delete_author_or_staff"
  ON public.community_posts FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_posts.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

-- POST COMMENTS
CREATE POLICY "post_comments_select_members"
  ON public.community_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.community_memberships m ON m.community_id = p.community_id
      WHERE p.id = community_post_comments.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "post_comments_insert_members"
  ON public.community_post_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.community_memberships m ON m.community_id = p.community_id
      WHERE p.id = community_post_comments.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "post_comments_update_author"
  ON public.community_post_comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "post_comments_delete_author_or_staff"
  ON public.community_post_comments FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.community_memberships m ON m.community_id = p.community_id
      WHERE p.id = community_post_comments.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

-- POST LIKES
CREATE POLICY "post_likes_select_members"
  ON public.community_post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.community_memberships m ON m.community_id = p.community_id
      WHERE p.id = community_post_likes.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "post_likes_insert_members"
  ON public.community_post_likes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.community_memberships m ON m.community_id = p.community_id
      WHERE p.id = community_post_likes.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "post_likes_delete_own"
  ON public.community_post_likes FOR DELETE
  USING (user_id = auth.uid());

-- SAVED POSTS
CREATE POLICY "saved_posts_own"
  ON public.community_saved_posts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- MESSAGES
CREATE POLICY "messages_select_members"
  ON public.community_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_messages.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "messages_insert_members"
  ON public.community_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_messages.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "messages_update_sender"
  ON public.community_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- COURSES / MODULES / LESSONS
CREATE POLICY "courses_select_members"
  ON public.community_courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_courses.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "courses_manage_staff"
  ON public.community_courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_courses.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_courses.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

CREATE POLICY "course_modules_select_members"
  ON public.course_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_courses cc
      JOIN public.community_memberships m ON m.community_id = cc.community_id
      WHERE cc.id = course_modules.course_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "course_modules_manage_staff"
  ON public.course_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_courses cc
      JOIN public.community_memberships m ON m.community_id = cc.community_id
      WHERE cc.id = course_modules.course_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_courses cc
      JOIN public.community_memberships m ON m.community_id = cc.community_id
      WHERE cc.id = course_modules.course_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

CREATE POLICY "course_lessons_select_members"
  ON public.course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_courses cc
      JOIN public.community_memberships m ON m.community_id = cc.community_id
      WHERE cc.id = course_lessons.course_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "course_lessons_manage_staff"
  ON public.course_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_courses cc
      JOIN public.community_memberships m ON m.community_id = cc.community_id
      WHERE cc.id = course_lessons.course_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_courses cc
      JOIN public.community_memberships m ON m.community_id = cc.community_id
      WHERE cc.id = course_lessons.course_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

-- LESSON PROGRESS (own rows)
CREATE POLICY "lesson_progress_own"
  ON public.lesson_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- TASKS
CREATE POLICY "tasks_select_members"
  ON public.community_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_tasks.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "tasks_manage_staff"
  ON public.community_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_tasks.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_tasks.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

-- TASK COMPLETIONS
CREATE POLICY "task_completions_select_own_or_staff"
  ON public.task_completions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_tasks t
      JOIN public.community_memberships m ON m.community_id = t.community_id
      WHERE t.id = task_completions.task_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.community_tasks t
      JOIN public.communities c ON c.id = t.community_id
      WHERE t.id = task_completions.task_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "task_completions_insert_own"
  ON public.task_completions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_tasks t
      JOIN public.community_memberships m ON m.community_id = t.community_id
      WHERE t.id = task_completions.task_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "task_completions_update_reviewer"
  ON public.task_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_tasks t
      JOIN public.community_memberships m ON m.community_id = t.community_id
      WHERE t.id = task_completions.task_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.community_tasks t
      JOIN public.communities c ON c.id = t.community_id
      WHERE t.id = task_completions.task_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.bump_community_task_completion_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_tasks
  SET completion_count = COALESCE(completion_count, 0) + 1
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_task_completions_bump_count
  AFTER INSERT ON public.task_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_community_task_completion_count();

-- MEMBER POINTS
CREATE POLICY "member_points_select_members"
  ON public.member_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = member_points.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "member_points_update_own"
  ON public.member_points FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "member_points_insert_own"
  ON public.member_points FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- PAYMENTS
CREATE POLICY "community_payments_select_own_or_owner"
  ON public.community_payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_payments.community_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "community_payments_insert_service"
  ON public.community_payments FOR INSERT
  WITH CHECK (user_id = auth.uid());
