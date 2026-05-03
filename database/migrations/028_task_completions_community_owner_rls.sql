-- Allow community platform owners (communities.owner_id) to read/update task completions
-- for their community, even if their community_memberships.role is not owner/admin/moderator.
-- Staff path still uses membership roles.

DROP POLICY IF EXISTS "task_completions_select_own_or_staff" ON public.task_completions;
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

DROP POLICY IF EXISTS "task_completions_update_reviewer" ON public.task_completions;
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

-- Keep community_tasks.completion_count in sync when members submit (members cannot UPDATE tasks)
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

DROP TRIGGER IF EXISTS tr_task_completions_bump_count ON public.task_completions;
CREATE TRIGGER tr_task_completions_bump_count
  AFTER INSERT ON public.task_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_community_task_completion_count();
