-- Remove the manual admin-approval gate on parent registration. It doesn't
-- scale (a human has to review every signup by hand) and the app already
-- has a strictly faster, equally-trusted path that skips it entirely: a
-- child self-registers and invites a parent by email, and
-- confirm_parent_link() approves that parent the moment they confirm —
-- no admin involved. This migration just makes the direct /register path
-- behave the same way: approved on signup, not stuck in a review queue.
--
-- admin_config.admin_email is still special-cased (unchanged) and
-- approve_parent/reject_parent/ApprovalsSection remain in place for manual
-- moderation of individual accounts (e.g. banning a bad actor via
-- reject_parent), they're just no longer required for every signup.

alter table public.parents alter column status set default 'approved';

create or replace function public.handle_new_parent_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_opt_in boolean;
begin
  if new.is_anonymous then
    return new;
  end if;

  if new.email = (select admin_email from public.admin_config where id = true) then
    return new;
  end if;

  v_opt_in := coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false);

  insert into public.parents (id, full_name, phone, status, approved_at, marketing_opt_in, marketing_opt_in_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    'approved',
    now(),
    v_opt_in,
    case when v_opt_in then now() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
