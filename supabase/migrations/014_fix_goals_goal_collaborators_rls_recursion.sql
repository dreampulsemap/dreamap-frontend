-- Break circular RLS dependency between goals and goal_collaborators.
-- goals_select_visible checks goal_collaborators, and goal_collaborators's
-- policies checked goals directly, causing "infinite recursion detected in
-- policy for relation goals".
-- Fix: goal_collaborators policies use a SECURITY DEFINER helper that
-- bypasses RLS on goals, so evaluating it no longer re-triggers goals' policies.

CREATE OR REPLACE FUNCTION public.is_goal_owner(p_goal_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.goals WHERE id = p_goal_id AND user_id = p_user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_goal_owner(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_goal_owner(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_goal_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_goal_owner(uuid, uuid) TO service_role;

ALTER POLICY goal_collaborators_select ON public.goal_collaborators
  USING (
    (user_id = auth.uid())
    OR (invited_by = auth.uid())
    OR public.is_goal_owner(goal_id, auth.uid())
  );

ALTER POLICY goal_collaborators_insert ON public.goal_collaborators
  WITH CHECK (
    (invited_by = auth.uid())
    AND public.is_goal_owner(goal_id, auth.uid())
  );

ALTER POLICY goal_collaborators_delete ON public.goal_collaborators
  USING (
    (user_id = auth.uid())
    OR (invited_by = auth.uid())
    OR public.is_goal_owner(goal_id, auth.uid())
  );
