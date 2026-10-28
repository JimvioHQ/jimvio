-- Retire all Jimvio-made editorial communities, persona accounts and their
-- content so only real people, real communities and real posts remain
-- public. Uses the admin conventions (archived_at, hidden_at, is_deleted,
-- is_active); no row is deleted. Every previous value is archived in
-- editorial_archive.*_retire_20261028 and can be restored.
-- Real communities (owned by real accounts) and real users' content are
-- not touched.

CREATE TABLE IF NOT EXISTS editorial_archive.communities_retire_20261028 AS
SELECT id, is_active, archived_at, archived_by FROM public.communities
WHERE owner_id IN (SELECT id FROM editorial_archive.persona_ids);

CREATE TABLE IF NOT EXISTS editorial_archive.posts_retire_20261028 AS
SELECT p.id, p.hidden_at FROM public.community_posts p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE (p.author_id IN (SELECT id FROM editorial_archive.persona_ids) OR pr.email ILIKE '%@jimvio.com')
  AND p.hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS editorial_archive.stories_retire_20261028 AS
SELECT id, expires_at FROM public.community_stories
WHERE author_id IN (SELECT id FROM editorial_archive.persona_ids);

CREATE TABLE IF NOT EXISTS editorial_archive.messages_retire_20261028 AS
SELECT id, is_deleted, deleted_at FROM public.community_messages
WHERE sender_id IN (SELECT id FROM editorial_archive.persona_ids)
  AND COALESCE(is_deleted, false) = false;

CREATE TABLE IF NOT EXISTS editorial_archive.events_retire_20261028 AS
SELECT id, is_published FROM public.community_events
WHERE community_id IN (SELECT id FROM editorial_archive.communities_retire_20261028)
   OR created_by IN (SELECT id FROM editorial_archive.persona_ids);

CREATE TABLE IF NOT EXISTS editorial_archive.profiles_retire_20261028 AS
SELECT id, is_active FROM public.profiles
WHERE id IN (SELECT id FROM editorial_archive.persona_ids);

-- Communities: archived and disabled.
UPDATE public.communities c
SET archived_at = COALESCE(c.archived_at, now()),
    is_active = false
WHERE c.id IN (SELECT id FROM editorial_archive.communities_retire_20261028);

-- Posts by personas and internal editorial accounts: hidden.
UPDATE public.community_posts p
SET hidden_at = now()
WHERE p.id IN (SELECT id FROM editorial_archive.posts_retire_20261028)
  AND p.hidden_at IS NULL;

-- Persona stories: expired now.
UPDATE public.community_stories s
SET expires_at = LEAST(COALESCE(s.expires_at, now()), now())
WHERE s.id IN (SELECT id FROM editorial_archive.stories_retire_20261028);

-- Persona chat messages: soft-deleted.
UPDATE public.community_messages m
SET is_deleted = true, deleted_at = COALESCE(m.deleted_at, now())
WHERE m.id IN (SELECT id FROM editorial_archive.messages_retire_20261028);

-- Events in retired communities or created by personas: unpublished.
UPDATE public.community_events e
SET is_published = false
WHERE e.id IN (SELECT id FROM editorial_archive.events_retire_20261028)
  AND e.is_published IS DISTINCT FROM false;

-- Persona accounts: deactivated.
UPDATE public.profiles p
SET is_active = false
WHERE p.id IN (SELECT id FROM editorial_archive.profiles_retire_20261028)
  AND p.is_active IS DISTINCT FROM false;
