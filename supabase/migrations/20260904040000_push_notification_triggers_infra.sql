-- Generic outbox for "notify someone (possibly not me, possibly not online
-- right now)" pushes. Server-side code (triggers, RPCs, cron-detection
-- functions) inserts rows here; a separate polling dispatcher Edge Function
-- (push-queue-dispatch, run every minute via pg_cron) drains them using the
-- service role, so no client ever needs permission to push anyone but
-- themselves (see send-push's RLS-scoped design) — this table is the one
-- place that's allowed to fan out to other users, and only trusted
-- server-side code can write to it (RLS below denies every client role;
-- only the service role, which bypasses RLS entirely, can touch it).
create table if not exists public.push_notification_queue (
  id uuid primary key default gen_random_uuid(),
  owner_kind text not null check (owner_kind in ('app_user', 'parent')),
  owner_id text not null,
  title text not null,
  body text not null,
  url text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0
);

create index if not exists push_notification_queue_pending_idx
  on public.push_notification_queue (created_at)
  where sent_at is null;

alter table public.push_notification_queue enable row level security;
-- Deliberately no policies — every client role (anon, authenticated) is
-- denied by default under RLS. Only the service role (used exclusively by
-- the push-queue-dispatch Edge Function) can read/write, since it bypasses
-- RLS entirely rather than needing an explicit policy.

-- Idle Curio Training Mission completion needs a cron job to detect (there's
-- no client action at the moment a mission's timer actually elapses — the
-- player might be offline for hours), so it needs its own "have we already
-- queued a push for this one" flag, same idea as children's
-- push_gold_bonus_*_awarded_at guards.
alter table public.curio_missions
  add column if not exists notified_at timestamptz;

-- ─── Trade requests: notify the recipient ──────────────────────────────────
-- _create_trade_internal is the single choke point both create_trade_request
-- (fresh offer) and counter_trade_request (counter-offer) call through, so
-- patching it here covers both entry points at once.
create or replace function public._create_trade_internal(p_initiator_id text, p_recipient_id text, p_my_monster_ids uuid[], p_their_monster_ids uuid[], p_my_gold integer, p_their_gold integer, p_thread_id uuid, p_parent_trade_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_trade_id uuid;
  v_total_items int;
  v_owned_count int;
begin
  if p_initiator_id = p_recipient_id then
    raise exception 'cannot trade with yourself';
  end if;
  if p_initiator_id like 'demo\_%' escape '\' or p_recipient_id like 'demo\_%' escape '\' then
    raise exception 'demo accounts cannot trade';
  end if;

  if public.account_created_at(p_initiator_id) is null or public.account_created_at(p_initiator_id) > now() - interval '48 hours' then
    raise exception 'your account is too new to trade';
  end if;
  if public.account_created_at(p_recipient_id) is null or public.account_created_at(p_recipient_id) > now() - interval '48 hours' then
    raise exception 'recipient account is too new to trade';
  end if;

  if coalesce(p_my_gold, 0) < 0 or coalesce(p_their_gold, 0) < 0 then
    raise exception 'gold amounts cannot be negative';
  end if;

  v_total_items := coalesce(array_length(p_my_monster_ids, 1), 0) + coalesce(array_length(p_their_monster_ids, 1), 0);
  if v_total_items < 1 then
    raise exception 'a trade must include at least one curio';
  end if;

  if array_length(p_my_monster_ids, 1) > 0 then
    select count(*) into v_owned_count from public.user_monsters
      where id = any(p_my_monster_ids) and user_id = p_initiator_id;
    if v_owned_count <> array_length(p_my_monster_ids, 1) then
      raise exception 'you do not own one or more of the offered curios';
    end if;
  end if;

  if array_length(p_their_monster_ids, 1) > 0 then
    select count(*) into v_owned_count from public.user_monsters
      where id = any(p_their_monster_ids) and user_id = p_recipient_id;
    if v_owned_count <> array_length(p_their_monster_ids, 1) then
      raise exception 'recipient does not own one or more of the requested curios';
    end if;
  end if;

  insert into public.trades (initiator_id, recipient_id, initiator_gold, recipient_gold, thread_id, parent_trade_id)
  values (p_initiator_id, p_recipient_id, coalesce(p_my_gold, 0), coalesce(p_their_gold, 0), p_thread_id, p_parent_trade_id)
  returning id into v_trade_id;

  if array_length(p_my_monster_ids, 1) > 0 then
    insert into public.trade_items (trade_id, side, user_monster_id)
    select v_trade_id, 'initiator', unnest(p_my_monster_ids);
  end if;

  if array_length(p_their_monster_ids, 1) > 0 then
    insert into public.trade_items (trade_id, side, user_monster_id)
    select v_trade_id, 'recipient', unnest(p_their_monster_ids);
  end if;

  insert into public.push_notification_queue (owner_kind, owner_id, title, body, url)
  values (
    'app_user',
    p_recipient_id,
    'New Trade Offer!',
    format('%s wants to trade curios with you.', p_initiator_id),
    '/play'
  );

  return v_trade_id;
end;
$function$;

-- ─── Referral level-5 payout: notify the referrer ──────────────────────────
create or replace function public.trigger_referrer_reward_on_level_5()
 returns trigger
 language plpgsql
 security definer
as $function$
declare
  v_row          referral_rewards%rowtype;
  v_registrant   text;
begin
  if not (new.level >= 5 and old.level < 5) then
    return new;
  end if;

  select * into v_row
  from public.referral_rewards
  where registrant_child_id = new.user_id
    and not referrer_reward_credited
  for update skip locked;

  if not found then return new; end if;

  if exists (
    select 1 from public.children
    where id = v_row.referrer_child_id and username like 'demo_%'
  ) then return new; end if;

  perform public.upsert_inventory(v_row.referrer_child_id, 'growth_pill', 1);

  insert into public.player_progress (user_id, gold)
  values (v_row.referrer_child_id, 300)
  on conflict (user_id) do update
    set gold = public.player_progress.gold + 300;

  select username into v_registrant
  from public.children where id = v_row.registrant_child_id;

  insert into public.player_notifications (user_id, title, body, icon)
  values (
    v_row.referrer_child_id,
    'Referral Reward!',
    format(
      'Your friend %s reached Level 5! You earned 1 Growth Pill + 300 Gold!',
      coalesce(v_registrant, 'your friend')
    ),
    '🏆'
  );

  insert into public.push_notification_queue (owner_kind, owner_id, title, body, url)
  values (
    'app_user',
    v_row.referrer_child_id,
    'Referral Reward! 🏆',
    format(
      'Your friend %s reached Level 5! You earned 1 Growth Pill + 300 Gold!',
      coalesce(v_registrant, 'your friend')
    ),
    '/play'
  );

  update public.referral_rewards
  set referrer_reward_credited = true
  where id = v_row.id;

  return new;
end;
$function$;
