-- A live 'gauntlet' event (Topic Mastery Gauntlet) substitutes the normal
-- Mon-Fri quest board entirely for the week it runs (see
-- components/dashboard/board/BoardMapView.tsx's "mainQuestPackageData is
-- irrelevant this week" comment) — but content_questions_public can still
-- hold that week's regular subject content even though the board never
-- shows it while the event is live (break weeks aren't guaranteed to skip
-- authoring). claim_daily_checklist_bonus's quest_done check didn't know
-- about gauntlet events at all, so it kept requiring the regular subjects
-- to be mastered every day of a break week — permanently blocking the
-- daily bonus for any kid who (correctly) played the gauntlet instead of a
-- Main Quest that was never reachable from the board in the first place.
--
-- Mirrors the same swap components/DailyChecklist.tsx's client-side
-- checklist now makes: today's regular-subject requirement is replaced by
-- today's gauntlet chunk (mastery_gauntlet_sessions) — or the event's
-- overall claim, once every day is done — whenever a gauntlet event is
-- active on claim day.
create or replace function public.claim_daily_checklist_bonus(p_user_id text, p_today date, p_day_name text, p_grade integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
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

  select content_week_id into v_content_week_id
  from public.content_questions_public
  where grade = p_grade and week_starting_date = v_week
  limit 1;

  if v_content_week_id is not null then
    select journal_logs, mastered_quizzes into v_journal_logs, v_mastered_quizzes
    from public.player_weekly_journal
    where user_id = p_user_id and content_week_id = v_content_week_id;
  end if;

  journal_done := coalesce(v_journal_logs, '{}'::jsonb) ? p_today::text;

  -- Is a Topic Mastery Gauntlet live today? If so it substitutes the
  -- regular per-subject quest requirement below.
  select id into v_gauntlet_event_id
  from public.custom_events
  where status = 'active'
    and content_source = 'gauntlet'
    and start_date <= p_today
    and end_date >= p_today
  order by start_date desc
  limit 1;

  if v_gauntlet_event_id is not null then
    select exists (
      select 1 from public.mastery_gauntlet_sessions
      where user_id = p_user_id and event_id = v_gauntlet_event_id and day = p_day_name
    ) into v_gauntlet_day_done;

    quest_done := coalesce(v_gauntlet_day_done, false)
      or exists (
        select 1 from public.user_event_claims
        where user_id = p_user_id and event_id = v_gauntlet_event_id
      );
  else
    -- "no subjects scheduled today" (weekend, or admin hasn't authored this
    -- week yet) counts as done, same as the old package_data-keys check did.
    quest_done := not exists (
      select 1 from (
        select distinct subject from public.content_questions_public
        where content_week_id = v_content_week_id and weekday = p_day_name
      ) subj
      where not (coalesce(v_mastered_quizzes, '[]'::jsonb) @> to_jsonb(array[p_day_name || '_' || subj.subject]))
    );
  end if;

  select last_wild_encounter_win, guild_last_played into bs
  from public.user_battle_state
  where user_id = p_user_id;

  battle_done := (bs.last_wild_encounter_win = p_today);

  guild_done := (bs.guild_last_played ->> 'lorekeeper' = p_today::text)
    and (bs.guild_last_played ->> 'spellcaster' = p_today::text)
    and (bs.guild_last_played ->> 'number_realm' = p_today::text)
    and (bs.guild_last_played ->> 'logic_labyrinth' = p_today::text)
    and (bs.guild_last_played ->> 'lexicon_arena' = p_today::text);

  if not (journal_done and quest_done and battle_done and guild_done) then
    return jsonb_build_object('granted', false);
  end if;

  select claim_date, streak_day into v_prev_date, v_prev_streak
  from public.daily_checklist_claims
  where app_user_id = p_user_id
  order by claim_date desc
  limit 1;

  if v_prev_date = p_today - 1 then
    v_streak := v_prev_streak + 1;
  else
    v_streak := 1;
  end if;
  v_gold := public.daily_checklist_gold_for_streak(v_streak);

  insert into public.daily_checklist_claims (app_user_id, claim_date, streak_day, gold_awarded)
  values (p_user_id, p_today, v_streak, v_gold)
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
$function$;
