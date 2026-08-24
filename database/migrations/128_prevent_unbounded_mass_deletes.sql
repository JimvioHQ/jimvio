-- Prevent Table Editor / Data API "delete all rows" wipes on core tables.
-- Applied to production as prevent_unbounded_mass_deletes (20260824071056).
-- Canonical copy: supabase/migrations/20260824071056_prevent_unbounded_mass_deletes.sql
--
-- Evidence: pg_stat_statements shows unconstrained PostgREST DELETEs of the form
--   WHERE (NOT col1 IS NULL OR NOT col2 IS NULL OR ...)
-- executed 3 times against communities, products, orders, spaces, rooms, posts,
-- memberships, and related tables around 2026-08-11 14:58 UTC.
--
-- This trigger does NOT restore deleted data.
-- It refuses statement-level deletes above a small per-table limit unless
--   SET LOCAL jimvio.allow_mass_delete = 'on';
-- Foreign-key cascades are allowed (pg_trigger_depth() > 1).
-- Products are intentionally omitted: Shopify orphan cleanup and admin
-- bulk-delete remove many rows by explicit id/source filters.

CREATE OR REPLACE FUNCTION public.deny_unbounded_mass_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n bigint;
  allow text;
  max_rows integer;
BEGIN
  allow := current_setting('jimvio.allow_mass_delete', true);
  IF allow IS NOT DISTINCT FROM 'on' THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO n FROM old_table;
  IF n IS NULL OR n = 0 THEN
    RETURN NULL;
  END IF;

  max_rows := CASE TG_TABLE_NAME
    WHEN 'communities' THEN 1
    WHEN 'vendors' THEN 1
    WHEN 'orders' THEN 3
    WHEN 'order_items' THEN 20
    WHEN 'community_posts' THEN 8
    WHEN 'community_post_comments' THEN 20
    WHEN 'community_memberships' THEN 8
    WHEN 'community_messages' THEN 15
    WHEN 'spaces' THEN 8
    WHEN 'rooms' THEN 8
    ELSE 8
  END;

  IF n > max_rows THEN
    RAISE EXCEPTION
      'Refusing to delete % rows from public.% in one statement (limit %). This blocks unconstrained table wipes. For a controlled operation, SET LOCAL jimvio.allow_mass_delete = ''on''.',
      n, TG_TABLE_NAME, max_rows
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.deny_unbounded_mass_delete() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.deny_unbounded_mass_delete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deny_unbounded_mass_delete() TO postgres;
GRANT EXECUTE ON FUNCTION public.deny_unbounded_mass_delete() TO service_role;
GRANT EXECUTE ON FUNCTION public.deny_unbounded_mass_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_unbounded_mass_delete() TO anon;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'communities',
    'community_posts',
    'community_post_comments',
    'community_memberships',
    'community_messages',
    'spaces',
    'rooms',
    'orders',
    'order_items',
    'vendors'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_deny_unbounded_mass_delete ON public.%I',
      t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_deny_unbounded_mass_delete
       AFTER DELETE ON public.%I
       REFERENCING OLD TABLE AS old_table
       FOR EACH STATEMENT
       EXECUTE FUNCTION public.deny_unbounded_mass_delete()',
      t
    );
  END LOOP;
END;
$$;
