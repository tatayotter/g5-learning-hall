-- player_events: the single append-only activity log new features write to, plus
-- player_activity: one view over every existing progress source so "who was active
-- when" is one query instead of a hand-written union per question.
--
-- Phase 2 of the guild-sessions work (see 20260922100000). Existing tables
-- (user_completed_questions, monster_battle_log, mastery_gauntlet_sessions,
-- live_battles, boss_persona_defeats, guild_sessions) are NOT touched or migrated;
-- the view reads them as they are. New features add an event type here instead of
-- a new table.

-- ── Table ─────────────────────────────────────────────────────────────────────

create table public.player_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null
    check (event_type in ('guild_session')),   -- extend with each new feature's event type
  occurred_at timestamptz not null default now(),
  grade integer,
  -- Feature-specific facts. Anything filtered/aggregated routinely should become a real column.
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 2048),
  -- Optional client/server-supplied key so retries and double-taps don't double count.
  idempotency_key text
);

create unique index player_events_idempotency_idx
  on public.player_events (user_id, idempotency_key) where idempotency_key is not null;
create index player_events_user_time_idx on public.player_events (user_id, occurred_at desc);
create index player_events_time_idx on public.player_events (occurred_at);
create index player_events_type_time_idx on public.player_events (event_type, occurred_at);

alter table public.player_events enable row level security;

-- Read-own only; all writes go through record_player_event below.
create policy "player_events: read own" on public.player_events
  for select using (current_app_user_id() = user_id);

-- ── Write RPC ─────────────────────────────────────────────────────────────────

create or replace function public.record_player_event(
  p_user_id text,
  p_event_type text,
  p_grade integer,
  p_payload jsonb,
  p_idempotency_key text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Identity gate. Also allows the definer-to-definer call from other RPCs
  -- (auth context is unchanged inside them, so current_app_user_id() still matches).
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;

  insert into public.player_events (user_id, event_type, grade, payload, idempotency_key)
  values (p_user_id, p_event_type, p_grade, coalesce(p_payload, '{}'::jsonb), p_idempotency_key)
  on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing;
end;
$$;

revoke all on function public.record_player_event(text, text, integer, jsonb, text) from public, anon;
grant execute on function public.record_player_event(text, text, integer, jsonb, text) to authenticated, service_role;

-- ── Unified activity view ─────────────────────────────────────────────────────
-- One row per recorded activity. Demo accounts are excluded here, once.
-- security_invoker so a student querying it only sees their own rows (RLS on the
-- underlying tables applies); admin/service-role queries see everyone.
-- guild plays come from guild_sessions (which has the pre-migration backfill),
-- so player_events guild_session rows are excluded to avoid double counting.
--   Active users, last 7 days:
--   select count(distinct user_id) from player_activity where occurred_at >= now() - interval '7 days';

create or replace view public.player_activity
with (security_invoker = true) as
select user_id, occurred_at, source from (
  select user_id, completed_at as occurred_at, 'quest_complete'::text as source from public.user_completed_questions
  union all
  select user_id, created_at, 'battle' from public.monster_battle_log
  union all
  select user_id, completed_at, 'gauntlet' from public.mastery_gauntlet_sessions
  union all
  select user_id, defeated_at, 'boss_defeat' from public.boss_persona_defeats
  union all
  select challenger_id, coalesce(ended_at, started_at), 'live_battle' from public.live_battles
    where coalesce(ended_at, started_at) is not null
  union all
  select opponent_id, coalesce(ended_at, started_at), 'live_battle' from public.live_battles
    where coalesce(ended_at, started_at) is not null
  union all
  select user_id, last_completed_at, 'guild_session' from public.guild_sessions
  union all
  select user_id, occurred_at, event_type from public.player_events where event_type <> 'guild_session'
) a
where user_id is not null and user_id not like 'demo\_%';
