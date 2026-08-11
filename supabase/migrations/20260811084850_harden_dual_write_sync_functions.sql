-- Security advisor findings on the Phase 3 dual-write trigger, fixed immediately:
-- 1. resolve_user_grade had a mutable search_path (missing SET search_path).
-- 2. sync_weekly_packages_to_progress, a SECURITY DEFINER trigger function, was directly
--    callable via PostgREST by anon/authenticated (/rest/v1/rpc/sync_weekly_packages_to_progress).
--    Trigger functions don't need direct EXECUTE grants to fire as part of a DML statement --
--    revoking them closes that unintended API surface without affecting the trigger itself.

CREATE OR REPLACE FUNCTION public.resolve_user_grade(p_user_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT grade FROM public.grade_content_owners WHERE user_id = p_user_id),
    (SELECT NULLIF(regexp_replace(c.grade, '\D', '', 'g'), '')::int FROM public.children c WHERE c.id = p_user_id),
    (SELECT NULLIF(regexp_replace(cm.grade, '\D', '', 'g'), '')::int FROM public.classmates cm WHERE cm.id = p_user_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.sync_weekly_packages_to_progress() FROM PUBLIC, anon, authenticated;
