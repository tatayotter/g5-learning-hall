-- Push notification audit fixes (2026-10-02).
--
-- 1. push_notification_queue gets per-row delivery hints + outcome columns:
--    - ttl_seconds: passed to web-push as TTL. Without it web-push defaults to
--      4 weeks, so a phone that was offline at 7pm could get "before the day
--      ends" the next morning. push-queue-dispatch also drops rows that sat
--      in the queue longer than their TTL instead of sending them late.
--    - tag: passed to the service worker's showNotification() so a repeat of
--      the same kind replaces the previous one instead of stacking.
--    - skipped_reason / delivered_count: sent_at used to be set both for real
--      deliveries and for "owner has no subscription", so the two were
--      indistinguishable (~97% of rows were the latter).
-- 2. Trade-offer push showed the initiator's raw app user id (a login
--    username) — now their first name, same source search_players already
--    shows in the trade UI.
-- 3. Emoji dropped from push titles (no-emoji UI rule).
-- 4. Daily prune of finished queue rows — nothing ever deleted them.

alter table public.push_notification_queue
  add column if not exists ttl_seconds int not null default 43200,
  add column if not exists tag text,
  add column if not exists skipped_reason text,
  add column if not exists delivered_count int not null default 0;

-- Backfill: every row so far marked sent with no subscription behind it
-- was a skip, not a delivery. Best-effort (subscriptions may have changed
-- since), only used for historical reporting.
update public.push_notification_queue q
set skipped_reason = 'no_subscription'
where q.sent_at is not null
  and q.skipped_reason is null
  and q.delivered_count = 0
  and not exists (
    select 1 from public.push_subscriptions s
    where s.owner_kind = q.owner_kind and s.owner_id = q.owner_id
  );

-- ─── Trade requests: notify the recipient ──────────────────────────────────
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
  v_initiator_name text;
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

  -- First name only: this lands on a lock screen.
  select nullif(split_part(trim(n.full_name), ' ', 1), '') into v_initiator_name
  from (
    select full_name from public.children where id = p_initiator_id
    union all
    select full_name from public.classmates where id = p_initiator_id
  ) n
  limit 1;

  insert into public.push_notification_queue (owner_kind, owner_id, title, body, url, ttl_seconds, tag)
  values (
    'app_user',
    p_recipient_id,
    'New trade offer',
    format('%s wants to trade curios with you.', coalesce(v_initiator_name, 'A classmate')),
    '/?tab=monster&view=trade',
    43200,
    'trade'
  );

  return v_trade_id;
end;
$function$;

-- ─── Referral level-5 payout: notify the referrer ──────────────────────────
create or replace function public.trigger_referrer_reward_on_level_5()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
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

  insert into public.push_notification_queue (owner_kind, owner_id, title, body, url, ttl_seconds, tag)
  values (
    'app_user',
    v_row.referrer_child_id,
    'Referral reward!',
    format(
      'Your friend %s reached Level 5! You earned 1 Growth Pill + 300 Gold!',
      coalesce(v_registrant, 'your friend')
    ),
    '/?tab=profile',
    86400,
    'referral'
  );

  update public.referral_rewards
  set referrer_reward_credited = true
  where id = v_row.id;

  return new;
end;
$function$;

-- ─── Daily prune ───────────────────────────────────────────────────────────
-- Plain SQL, no Edge Function. cron.schedule() with an existing name updates
-- that job in place, so re-running this is safe.
select cron.schedule(
  'push-queue-prune-daily',
  '0 4 * * *',
  $cmd$
  delete from public.push_notification_queue
  where created_at < now() - interval '14 days'
    and (sent_at is not null or attempts >= 5);
  $cmd$
);
