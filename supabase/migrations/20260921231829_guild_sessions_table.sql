-- guild_sessions: one row per (user, guild, day) so guild activity is queryable
-- the same way mastery_gauntlet_sessions / monster_battle_log are.
--
-- Until now a guild session was only a date inside the JSON blob
-- user_battle_state.guild_last_played ({"spellcaster": "2026-09-22"}): one date
-- per guild, overwritten on every play, so no history, no scores, and no clean
-- way to count "active in the last 7 days".
--
-- Phase 1 (this migration): dual-write. mark_guild_session_today keeps updating
-- the JSON (the daily checklist and claim_daily_checklist_bonus still read it)
-- AND now records/accumulates a guild_sessions row. Existing JSON dates are
-- backfilled as one row each (real per-day history only exists from now on).
-- Phase 2 (later, separate migration): move the checklist + bonus RPC to read
-- guild_sessions, then drop guild_last_played.

-- ── Table ─────────────────────────────────────────────────────────────────────

create table public.guild_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  guild_key text not null
    check (guild_key in ('lorekeeper', 'spellcaster', 'number_realm', 'logic_labyrinth', 'lexicon_arena')),
  played_on date not null,
  -- A guild can be played more than once a day; the row accumulates.
  sessions_played integer not null default 1 check (sessions_played >= 0),
  questions_answered integer not null default 0 check (questions_answered >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  first_completed_at timestamptz not null default now(),
  last_completed_at timestamptz not null default now(),
  unique (user_id, guild_key, played_on),
  check (correct_count <= questions_answered)
);

create index guild_sessions_played_on_idx on public.guild_sessions (played_on);
create index guild_sessions_user_played_on_idx on public.guild_sessions (user_id, played_on desc);

alter table public.guild_sessions enable row level security;

-- Read-own only. There is deliberately NO client insert/update policy: scores are
-- written exclusively through mark_guild_session_today (SECURITY DEFINER, identity
-- checked below), so a client can't forge or inflate them via direct table writes.
create policy "guild_sessions: read own" on public.guild_sessions
  for select using (current_app_user_id() = user_id);

-- ── RPC ───────────────────────────────────────────────────────────────────────

-- Adding parameters with CREATE OR REPLACE would create a second overload and
-- make the old 3-arg call ambiguous, so drop the old signature first.
drop function if exists public.mark_guild_session_today(text, text, date);

create or replace function public.mark_guild_session_today(
  p_user_id text,
  p_guild_key text,
  p_today date,
  p_questions_answered integer default 0,
  p_correct_count integer default 0
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  affected int;
  v_answered int := greatest(coalesce(p_questions_answered, 0), 0);
  v_correct int := least(greatest(coalesce(p_correct_count, 0), 0), v_answered);
begin
  -- Same identity gate as the rest of the p_user_id RPCs
  -- (docs/rpc-identity-hardening.md).
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;

  if p_guild_key not in ('lorekeeper', 'spellcaster', 'number_realm', 'logic_labyrinth', 'lexicon_arena') then
    raise exception 'unknown guild key: %', p_guild_key;
  end if;

  -- Legacy write: the daily checklist and claim_daily_checklist_bonus still read this.
  update public.user_battle_state
  set guild_last_played = jsonb_set(coalesce(guild_last_played, '{}'::jsonb), array[p_guild_key], to_jsonb(p_today::text))
  where user_id = p_user_id;
  get diagnostics affected = row_count;

  if affected = 0 then
    insert into public.user_battle_state (user_id, guild_last_played)
    values (p_user_id, jsonb_build_object(p_guild_key, p_today::text));
  end if;

  -- New write: per-day row, accumulating on replays. The day is derived on the
  -- server (Manila) rather than trusting the device clock in p_today; p_today is
  -- only used for the legacy JSON above so the checklist keeps matching the client.
  insert into public.guild_sessions (user_id, guild_key, played_on, questions_answered, correct_count)
  values (p_user_id, p_guild_key, (now() at time zone 'Asia/Manila')::date, v_answered, v_correct)
  on conflict (user_id, guild_key, played_on) do update
  set sessions_played = guild_sessions.sessions_played + 1,
      questions_answered = guild_sessions.questions_answered + excluded.questions_answered,
      correct_count = guild_sessions.correct_count + excluded.correct_count,
      last_completed_at = now();

  -- Per-play event (append-only), so individual sessions stay queryable.
  -- player_events is created in the next migration; it must exist before this
  -- function is first called, so apply the two migrations together.
  perform public.record_player_event(
    p_user_id, 'guild_session', null,
    jsonb_build_object('guild_key', p_guild_key, 'questions_answered', v_answered, 'correct_count', v_correct),
    null
  );
end;
$$;

-- New functions default to EXECUTE for PUBLIC (including anon); lock it to logged-in users.
revoke all on function public.mark_guild_session_today(text, text, date, integer, integer) from public, anon;
grant execute on function public.mark_guild_session_today(text, text, date, integer, integer) to authenticated, service_role;

-- ── Backfill ──────────────────────────────────────────────────────────────────
-- One row per existing (user, guild) "last played" date. Scores unknown -> 0.

insert into public.guild_sessions (user_id, guild_key, played_on, first_completed_at, last_completed_at)
select s.user_id, e.key, e.value::date, e.value::date::timestamptz, e.value::date::timestamptz
from public.user_battle_state s,
     lateral jsonb_each_text(coalesce(s.guild_last_played, '{}'::jsonb)) as e(key, value)
where e.key in ('lorekeeper', 'spellcaster', 'number_realm', 'logic_labyrinth', 'lexicon_arena')
  and e.value ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (user_id, guild_key, played_on) do nothing;
