# Migration review — `20261122213514_remove_exact_duplicate_read_write_policies.sql`

**Status:** Applied to production project `vsfhwfimudpdipdkxbww` on 2026-11-22.

## Change

Removed six exact duplicate permissive policies across community post likes, product views, and short-video clicks/comments/likes/views. Each removed policy had exactly the same role set, command, permissive mode, `USING` and `WITH CHECK` expressions as the retained policy on that table.

## Safety

PostgreSQL permissive RLS policies are combined with OR. Removing one of two identical predicates does not change the effective authorization predicate. The remaining policy per operation retains the same `true` predicate and public access behavior.

## Verification

The duplicate candidates were derived from live `pg_policies` metadata by grouping on schema, table, roles, command, permissive mode, `qual` and `with_check` and selecting only exact groups with count greater than one.
