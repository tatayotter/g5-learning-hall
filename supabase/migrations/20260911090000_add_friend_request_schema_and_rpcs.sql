-- Friends system: a friend_requests row is the full lifecycle of one
-- relationship between two players — pending on creation, then flipped to
-- accepted/declined/cancelled. Same single-table-with-status shape as
-- `trades` (see create_trade_request / respond_to_trade), not a separate
-- "requests" + "friendships" pair — there's nothing a second table would
-- capture that status doesn't already.
--
-- Auth boundary matches trades exactly: current_app_user_id() (children +
-- classmates + family all resolve through user_identity_map, see that
-- function's definition) is the only party check, RLS only grants SELECT to
-- the two parties, and every write goes through a SECURITY DEFINER RPC
-- below — there are no direct INSERT/UPDATE/DELETE policies on the table,
-- so a client can never forge a request as someone else or self-accept its
-- own outgoing request the way an RLS-only INSERT policy could be tricked
-- into (see docs/rpc-identity-hardening.md for why this project treats that
-- boundary carefully).

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  recipient_id text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_not_self check (requester_id <> recipient_id)
);

create index friend_requests_requester_idx on public.friend_requests (requester_id);
create index friend_requests_recipient_idx on public.friend_requests (recipient_id);

-- At most one *active* (pending or accepted) relationship per unordered
-- pair — stops a second pending request going out while one direction is
-- already outstanding, and stops re-friending someone you're already
-- friends with. A pair can freely get a new row once their old one is
-- declined/cancelled (those don't match this partial index).
create unique index friend_requests_active_pair_uidx
  on public.friend_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('pending', 'accepted');

alter table public.friend_requests enable row level security;

create policy "friend_requests: parties read" on public.friend_requests
  for select
  using (current_app_user_id() = requester_id or current_app_user_id() = recipient_id);

-- send_friend_request: creates a pending request, or — if the target
-- already sent *us* a pending request — accepts theirs instead of creating
-- a crossing second row (mutual "add friend" clicks resolve to instant
-- friends, same as most social apps).
create or replace function public.send_friend_request(p_recipient_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me text := public.current_app_user_id();
  v_existing_id uuid;
  v_existing_status text;
  v_existing_requester text;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_recipient_id = v_me then
    raise exception 'cannot friend yourself';
  end if;

  select id, status, requester_id into v_existing_id, v_existing_status, v_existing_requester
  from public.friend_requests
  where status in ('pending', 'accepted')
    and ((requester_id = v_me and recipient_id = p_recipient_id)
      or (requester_id = p_recipient_id and recipient_id = v_me))
  limit 1;

  if v_existing_id is not null then
    if v_existing_status = 'accepted' then
      raise exception 'already friends';
    elsif v_existing_requester = v_me then
      raise exception 'friend request already pending';
    else
      update public.friend_requests
        set status = 'accepted', responded_at = now()
        where id = v_existing_id;
      return v_existing_id;
    end if;
  end if;

  insert into public.friend_requests (requester_id, recipient_id)
  values (v_me, p_recipient_id)
  returning id into v_existing_id;
  return v_existing_id;
end;
$$;

-- respond_to_friend_request: only the recipient of a still-pending request
-- may accept or decline it.
create or replace function public.respond_to_friend_request(p_request_id uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me text := public.current_app_user_id();
  v_updated int;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  update public.friend_requests
    set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
    where id = p_request_id and recipient_id = v_me and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- cancel_friend_request: only the requester may withdraw their own
-- still-pending outgoing request.
create or replace function public.cancel_friend_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me text := public.current_app_user_id();
  v_updated int;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  update public.friend_requests
    set status = 'cancelled', responded_at = now()
    where id = p_request_id and requester_id = v_me and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- remove_friend: either party can end an already-accepted friendship.
-- Reuses 'cancelled' rather than a separate 'removed' status — nothing
-- downstream distinguishes "never went through" from "unfriended later",
-- and collapsing them keeps the status check constraint from growing.
create or replace function public.remove_friend(p_friend_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me text := public.current_app_user_id();
  v_updated int;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  update public.friend_requests
    set status = 'cancelled', responded_at = now()
    where status = 'accepted'
      and ((requester_id = v_me and recipient_id = p_friend_id)
        or (requester_id = p_friend_id and recipient_id = v_me));

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
