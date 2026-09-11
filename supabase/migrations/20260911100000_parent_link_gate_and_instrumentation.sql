-- Parent-link funnel fixes (see docs/parent-child-linking-design.md).
--
-- Live data showed the linking feature, while fully built, was almost never
-- used: 160 of 162 unclaimed children never even attempted a link, and the
-- 2 attempts that did happen both failed to complete. This migration:
--
-- 1. Extends the invite token expiry from 30 minutes to 24 hours (the one
--    attempt that WAS opened, per `parent_link_requests.attempts`, never
--    got confirmed in time).
-- 2. Adds `my_pending_link_request()` so the in-app banner can show real
--    status ("waiting on parent@email.com, expires in Xh") and offer a
--    resend instead of a blank form every time.
-- 3. Actually enforces the leaderboard/PvP gate the design doc always
--    intended but never wired up: a self-registered, unlinked child cannot
--    start or accept a live PvP battle. (Leaderboard *viewing* is gated in
--    the client — see components/Dashboard.tsx — since it's a read-only
--    aggregate over data that's already broadly selectable under RLS.)
-- 4. Logs `analytics_events` rows for the invite-sent and link-confirmed
--    steps, matching the existing demo-login instrumentation pattern, so
--    the funnel is visible without ad hoc SQL next time.

-- (1) Longer token lifetime -------------------------------------------------

alter table public.parent_link_requests
  alter column expires_at set default (now() + interval '24 hours');

-- (2) Let the child's client see their own pending invite ------------------

create or replace function public.my_pending_link_request()
returns table (parent_email text, status text, created_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
  select r.parent_email, r.status, r.created_at, r.expires_at
  from public.parent_link_requests r
  join public.user_identity_map m on m.app_user_id = r.child_id
  where m.auth_uid = auth.uid()
  order by r.created_at desc
  limit 1;
$function$;

-- (3) Hard gate: unlinked children cannot participate in live PvP ----------

create or replace function public.enforce_pvp_requires_linked_parent()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_blocked_id text;
begin
  select c.id into v_blocked_id
  from public.children c
  where c.id in (new.challenger_id, new.opponent_id)
    and c.parent_id is null
  limit 1;

  if v_blocked_id is not null then
    raise exception 'link a parent to unlock PvP battles' using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_pvp_requires_linked_parent on public.live_battles;
create trigger trg_pvp_requires_linked_parent
  before insert on public.live_battles
  for each row execute function public.enforce_pvp_requires_linked_parent();

-- (4) Funnel instrumentation -------------------------------------------------

create or replace function public.request_parent_link(p_parent_email text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_child_id text;
  v_email text := lower(trim(p_parent_email));
  v_count_child int;
  v_count_email int;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'no authenticated session' using errcode = 'P0001';
  end if;

  select app_user_id into v_child_id from public.user_identity_map where auth_uid = auth.uid();

  if v_child_id is null or not exists (select 1 from public.children where id = v_child_id) then
    raise exception 'not a child account' using errcode = 'P0001';
  end if;

  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  if exists (select 1 from public.children where id = v_child_id and parent_id is not null) then
    raise exception 'account already linked' using errcode = 'P0001';
  end if;

  select count(*) into v_count_child from public.parent_link_requests
    where child_id = v_child_id and created_at > now() - interval '24 hours';

  select count(*) into v_count_email from public.parent_link_requests
    where parent_email = v_email and created_at > now() - interval '24 hours';

  if v_count_child >= 3 or v_count_email >= 3 then
    raise exception 'rate limit exceeded, try again later' using errcode = 'P0001';
  end if;

  update public.parent_link_requests
    set status = 'revoked'
    where child_id = v_child_id and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.parent_link_requests (child_id, parent_email, token_hash)
  values (v_child_id, v_email, encode(extensions.digest(v_token, 'sha256'), 'hex'));

  insert into public.analytics_events (user_id, event_name, properties)
  values (v_child_id, 'parent_link_requested', jsonb_build_object('parent_email', v_email));

  return v_token;
end;
$function$;

create or replace function public.confirm_parent_link(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_req public.parent_link_requests%rowtype;
  v_auth_email text;
  v_auth_email_confirmed timestamptz;
  v_full_name text;
  v_week_start date;
  v_gold_awarded boolean := false;
  v_current_count int;
  v_max int;
begin
  if auth.uid() is null then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  select email, email_confirmed_at into v_auth_email, v_auth_email_confirmed
  from auth.users where id = auth.uid();

  if v_auth_email is null or v_auth_email_confirmed is null then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  select * into v_req
  from public.parent_link_requests
  where token_hash = v_hash and status = 'pending' and expires_at > now()
  for update;

  if not found then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  if lower(v_auth_email) <> v_req.parent_email then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.children where id = v_req.child_id and parent_id is not null) then
    update public.parent_link_requests set status = 'revoked' where id = v_req.id;
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  select count(*) into v_current_count from public.children c
  where c.parent_id = auth.uid() and c.is_active = true;

  v_max := public.max_children_for_parent(auth.uid());
  if v_current_count >= v_max then
    raise exception 'child account limit reached (% of %) - subscribe or add a child slot to link more children', v_current_count, v_max;
  end if;

  select coalesce(raw_user_meta_data->>'full_name', 'Parent') into v_full_name
  from auth.users where id = auth.uid();

  insert into public.parents (id, full_name, status)
  values (auth.uid(), v_full_name, 'approved')
  on conflict (id) do update set status = 'approved';

  update public.children set parent_id = auth.uid() where id = v_req.child_id;

  update public.parent_link_requests set status = 'completed', completed_at = now() where id = v_req.id;

  v_week_start := current_date - (extract(dow from current_date))::int;
  begin
    perform public.apply_character_deltas(v_req.child_id, v_week_start, 0, 100);
    v_gold_awarded := true;
  exception when others then
    v_gold_awarded := false;
  end;

  insert into public.analytics_events (user_id, event_name, properties)
  values (v_req.child_id, 'parent_link_confirmed', jsonb_build_object('gold_awarded', v_gold_awarded));

  return jsonb_build_object('child_id', v_req.child_id, 'gold_awarded', v_gold_awarded);
end;
$function$;

grant execute on function public.my_pending_link_request() to authenticated;

-- (5) Lightweight outreach list: approved parents with zero linked children.
-- Not every approved parent necessarily has a self-registered, unlinked
-- child waiting somewhere, but this is a cheap starting point for a manual
-- or reengagement-sync-driven nudge campaign.
create or replace view public.v_parents_without_linked_children as
select p.id as parent_id, p.full_name, p.phone, p.created_at
from public.parents p
where p.status = 'approved'
  and not exists (select 1 from public.children c where c.parent_id = p.id);
