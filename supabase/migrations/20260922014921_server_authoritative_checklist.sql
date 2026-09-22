-- Daily checklist bonus: the server decides "today", the weekday, the grade, and now checks
-- guild_sessions instead of the legacy JSON.
--
-- claim_daily_checklist_bonus used to take p_today, p_day_name and p_grade from the client.
-- All three feed the bonus decision, so a client could send a mismatched date/weekday or a
-- grade with no content that week. app_today() is the single server-side source of "today"
-- (Manila, same day guild_sessions.played_on already uses), and the weekday is derived from
-- it. The grade comes from the player's own player_weekly_journal row for the current content
-- week — the same row the function already reads for journal_done — so no separate grade
-- input is needed at all.
--
-- Expand/contract: the OLD 4-argument signature is kept as a thin wrapper that ignores its
-- date/weekday/grade arguments and calls the new 1-argument function underneath, so the
-- currently deployed client (which still calls the 4-arg form) is automatically protected by
-- this fix and keeps working unchanged. The wrapper is dropped in a later migration once that
-- client is no longer in the field.

create or replace function public.app_today()
returns date
language sql
stable
set search_path to 'public'
as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;

revoke all on function public.app_today() from public, anon;
grant execute on function public.app_today() to authenticated, service_role;

-- ── new server-authoritative claim ───────────────────────────────────────────

create function public.claim_daily_checklist_bonus(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_today date := public.app_today();
  v_day_name text := trim(to_char(public.app_today(), 'Day'));
  v_week date := public.current_week_start();
  v_content_week_id uuid;
  v_journal_logs jsonb;
  v_mastered_quizzes jsonb;
  bs record;
  journal_done boolean;
  quest_done boolean;
  battle_done boolean;
  guild_done boolean;
  inserted int;
  v_prev_date date;
  v_prev_streak int;
  v_streak int;
  v_gold int;
  v_gauntlet_event_id uuid;
  v_gauntlet_day_done boolean;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  -- The player's own journal row for the current content week both tells us the grade (via
  -- its content_week_id) and whether today's journal entry is done — the same row the old
  -- function read separately via an explicit p_grade lookup.
  select j.content_week_id, j.journal_logs, j.mastered_quizzes
    into v_content_week_id, v_journal_logs, v_mastered_quizzes
  from public.player_weekly_journal j
  where j.user_id = p_user_id
    and j.content_week_id in (
      select distinct content_week_id from public.content_questions_public
      where week_starting_date = v_week
    )
  order by j.updated_at desc
  limit 1;

  journal_done := coalesce(v_journal_logs, '{}'::jsonb) ? v_today::text;

  -- Is a Topic Mastery Gauntlet live today? If so it substitutes the
  -- regular per-subject quest requirement below.
  select id into v_gauntlet_event_id
  from public.custom_events
  where status = 'active'
    and content_source = 'gauntlet'
    and start_date <= v_today
    and end_date >= v_today
  order by start_date desc
  limit 1;

  if v_gauntlet_event_id is not null then
    select exists (
      select 1 from public.mastery_gauntlet_sessions
      where user_id = p_user_id and event_id = v_gauntlet_event_id and day = v_day_name
    ) into v_gauntlet_day_done;

    quest_done := coalesce(v_gauntlet_day_done, false)
      or exists (
        select 1 from public.user_event_claims
        where user_id = p_user_id and event_id = v_gauntlet_event_id
      );
  else
    -- "no subjects scheduled today" (weekend, or admin hasn't authored this
    -- week yet, or no journal row this week yet) counts as done, same as before —
    -- but journal_done being false (no journal row this week yet -> false) is what
    -- actually blocks a premature claim in that case, exactly as it did before.
    quest_done := not exists (
      select 1 from (
        select distinct subject from public.content_questions_public
        where content_week_id = v_content_week_id and weekday = v_day_name
      ) subj
      where not (coalesce(v_mastered_quizzes, '[]'::jsonb) @> to_jsonb(array[v_day_name || '_' || subj.subject]))
    );
  end if;

  select last_wild_encounter_win into bs
  from public.user_battle_state
  where user_id = p_user_id;

  battle_done := (bs.last_wild_encounter_win = v_today);

  -- All five guilds played today, from guild_sessions (was: user_battle_state.guild_last_played).
  select count(distinct guild_key) = 5 into guild_done
  from public.guild_sessions
  where user_id = p_user_id and played_on = v_today;

  if not (journal_done and quest_done and battle_done and coalesce(guild_done, false)) then
    return jsonb_build_object('granted', false);
  end if;

  select claim_date, streak_day into v_prev_date, v_prev_streak
  from public.daily_checklist_claims
  where app_user_id = p_user_id
  order by claim_date desc
  limit 1;

  if v_prev_date = v_today - 1 then
    v_streak := v_prev_streak + 1;
  else
    v_streak := 1;
  end if;
  v_gold := public.daily_checklist_gold_for_streak(v_streak);

  insert into public.daily_checklist_claims (app_user_id, claim_date, streak_day, gold_awarded)
  values (p_user_id, v_today, v_streak, v_gold)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('granted', false);
  end if;

  insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
  update public.player_progress
  set gold = gold + v_gold, updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('granted', true, 'streak', v_streak, 'gold', v_gold);
end;
$$;

revoke all on function public.claim_daily_checklist_bonus(text) from public, anon;
grant execute on function public.claim_daily_checklist_bonus(text) to authenticated, service_role;

-- ── compatibility wrapper: same 4-arg signature the deployed client calls today ──
-- create or replace on the EXISTING signature (no DROP needed — argument types unchanged).

create or replace function public.claim_daily_checklist_bonus(p_user_id text, p_today date, p_day_name text, p_grade integer)
returns jsonb
language sql
security definer
set search_path to 'public'
as $$
  -- p_today / p_day_name / p_grade are intentionally ignored — see header comment.
  select public.claim_daily_checklist_bonus(p_user_id);
$$;

revoke all on function public.claim_daily_checklist_bonus(text, date, text, integer) from public, anon;
grant execute on function public.claim_daily_checklist_bonus(text, date, text, integer) to authenticated, service_role;

-- ── streak preview: same signature, now ignores p_today too ──────────────────
-- So the always-visible streak preview can never disagree with what claiming would actually do.

create or replace function public.get_daily_checklist_streak(p_user_id text, p_today date)
returns jsonb
language plpgsql
set search_path to 'public'
as $$
declare
  v_today date := public.app_today();
  v_date date;
  v_streak int;
  v_claimed_today boolean := false;
  v_current_streak int := 0;
  v_next_streak int := 1;
begin
  select claim_date, streak_day into v_date, v_streak
  from public.daily_checklist_claims
  where app_user_id = p_user_id
  order by claim_date desc
  limit 1;

  if v_date is not null then
    if v_date = v_today then
      v_claimed_today := true;
      v_current_streak := v_streak;
      v_next_streak := v_streak;
    elsif v_date = v_today - 1 then
      v_current_streak := v_streak;
      v_next_streak := v_streak + 1;
    end if;
  end if;

  return jsonb_build_object(
    'claimedToday', v_claimed_today,
    'currentStreak', v_current_streak,
    'nextStreak', v_next_streak,
    'todayGold', case when v_claimed_today then public.daily_checklist_gold_for_streak(v_current_streak) else null end,
    'nextGold', public.daily_checklist_gold_for_streak(v_next_streak)
  );
end;
$$;
