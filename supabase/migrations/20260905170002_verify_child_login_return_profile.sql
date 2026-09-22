-- Bug: an unclaimed (self-registered, parent_id IS NULL) child account can
-- never log back in once its first browser session ends. children_public
-- (the view backing lib/userSession.ts's loadChildren(), which is the ONLY
-- thing that puts a child into the SplashScreen roster) requires
-- is_parent_approved(parent_id), which is never true for parent_id IS NULL
-- -- by design, since an unclaimed child has no parent yet. So the child
-- never appears as a clickable roster row again, and SplashScreen has no
-- separate username/PIN entry form to fall back on -- registerChildUser()
-- only makes the fresh signup usable for the CURRENT in-memory session.
--
-- verify_child_login already correctly allows parent_id IS NULL logins (see
-- docs/parent-child-linking-design.md), so the DB-side auth check was never
-- the problem. It just doesn't return enough of the profile (only
-- full_name/grade) for the client to build a full USERS entry for an
-- account that isn't already in the roster -- avatar/gender/school_name are
-- needed too. This migration extends the return shape so the frontend
-- (components/SplashScreen.tsx's new "returning player" username+PIN login,
-- lib/userSession.ts's new loginReturningChild()) can inject a complete
-- profile without depending on children_public at all.
--
-- CREATE OR REPLACE cannot change a function's return type, so this drops
-- and recreates explicitly (same lesson as docs/parent-child-linking-design.md's
-- overload-trap note) -- confirmed via pg_proc that only the new signature
-- remains afterward.
drop function if exists public.verify_child_login(text, text);

create function public.verify_child_login(p_id text, p_pin text)
returns table(full_name text, grade text, avatar text, gender text, school_name text)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_recent_failures int;
  v_full_name text;
  v_grade text;
  v_avatar text;
  v_gender text;
  v_school_name text;
begin
  select count(*) into v_recent_failures
  from public.child_login_failures
  where child_id = p_id and created_at > now() - interval '15 minutes';

  if v_recent_failures >= 3 then
    raise exception 'account temporarily locked, try again later' using errcode = 'P0001';
  end if;

  select c.full_name, c.grade, c.avatar, c.gender, c.school_name
    into v_full_name, v_grade, v_avatar, v_gender, v_school_name
  from public.children c
  left join public.parents p on p.id = c.parent_id
  where c.id = p_id
    and c.is_active = true
    and (c.parent_id is null or p.status = 'approved')
    and c.pin_hash = extensions.crypt(p_pin, c.pin_hash);

  if not found then
    insert into public.child_login_failures (child_id) values (p_id);
    return;
  end if;

  return query select v_full_name, v_grade, v_avatar, v_gender, v_school_name;
end;
$function$;
