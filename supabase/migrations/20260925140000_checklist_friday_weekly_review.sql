-- Fix: nobody could claim the daily checklist bonus on a Friday (the "finished every to-do but
-- the reward won't claim" bug).
--
-- claim_daily_checklist_bonus decided "is today's Main Quest done?" by requiring a
-- `<weekday>_<subject>` entry in mastered_quizzes for every distinct subject content_questions_public
-- holds for that weekday. That is right Monday-Thursday. On Friday it is not: since the Aug 23
-- content format, Friday repeats every Mon-Thu subject under its own subject key, but the app's
-- Main Quest board never shows those. It collapses Friday into ONE auto-built "Weekly Review"
-- quest (lib/weeklyReview.ts buildWeeklyReviewDay, wired in via Dashboard's mainQuestPackageData),
-- so the only Friday key a student can ever earn is `Friday_Weekly Review`. The server was asking for
-- 7-9 keys nobody can produce, so every Friday claim came back granted=false while the client's
-- checklist (which uses the collapsed shape) correctly showed every to-do ticked and the Claim
-- button lit.
--
-- The pre-Aug-23 content stored Friday as a single "Weekly Review" subject, which is why Fridays
-- claimed fine back then (and on 2026-09-18, a term-break week with no content at all). The first
-- normal Friday since the format change is what exposed it.
--
-- Fix: pull the non-gauntlet quest check into daily_checklist_quest_done() and make Friday mean
-- "the Weekly Review is mastered", mirroring the client exactly — including its "nothing to review
-- when there is no Mon-Thu content yet" case, which the client treats as "no quest scheduled today".
-- Extracted as its own function (rather than edited in place) because the weekday is otherwise
-- derived from the clock inside the claim RPC, which would make the Friday branch untestable on
-- any other day of the week.
--
-- Same signature and grants for claim_daily_checklist_bonus(text) (CREATE OR REPLACE, no overload
-- created); the 4-arg compatibility wrapper still just delegates to it, so nothing else changes.

create or replace function public.daily_checklist_quest_done(
  p_content_week_id uuid,
  p_day_name text,
  p_mastered_quizzes jsonb
)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select case
    when p_day_name = 'Friday' then
      -- Friday is one combined Weekly Review quest, built client-side from Mon-Thu. With no
      -- Mon-Thu content there is nothing to review (client: "No quest scheduled today").
      not exists (
        select 1 from public.content_questions_public
        where content_week_id = p_content_week_id
          and weekday in ('Monday', 'Tuesday', 'Wednesday', 'Thursday')
      )
      or coalesce(p_mastered_quizzes, '[]'::jsonb) @> to_jsonb(array['Friday_Weekly Review'])
    else
      -- "no subjects scheduled today" (weekend, or admin hasn't authored this week yet, or no
      -- journal row this week yet) counts as done — the journal requirement is what blocks a
      -- premature claim in that case.
      not exists (
        select 1 from (
          select distinct subject from public.content_questions_public
          where content_week_id = p_content_week_id and weekday = p_day_name
        ) subj
        where not (coalesce(p_mastered_quizzes, '[]'::jsonb) @> to_jsonb(array[p_day_name || '_' || subj.subject]))
      )
  end;
$$;

-- Internal helper: only the SECURITY DEFINER claim function below needs to call it.
revoke all on function public.daily_checklist_quest_done(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.daily_checklist_quest_done(uuid, text, jsonb) to service_role;

create or replace function public.claim_daily_checklist_bonus(p_user_id text)
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
    quest_done := public.daily_checklist_quest_done(v_content_week_id, v_day_name, v_mastered_quizzes);
  end if;

  select last_wild_encounter_win into bs
  from public.user_battle_state
  where user_id = p_user_id;

  battle_done := (bs.last_wild_encounter_win = v_today);

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
