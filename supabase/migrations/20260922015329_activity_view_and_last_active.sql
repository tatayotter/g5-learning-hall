-- Parent panel "last active": replace user_last_login with real activity.
--
-- ChildProgressPanel currently shows "last played {user_last_login.last_login}" — but
-- last_login only updates on a fresh login. A child with a saved session who keeps playing
-- without ever re-logging-in shows as stale, while a child who logs in and does nothing shows
-- as "active". player_activity already exists (from player_events_and_activity_view) but was
-- missing several real activity sources, so it under-reported engagement too:
--   * individual main-quest question answers (player_question_attempts)
--   * MTAP answers and mixed-trainer runs
--   * journal entries and daily checklist claims
-- These are added here so "last active" reflects real play, not just completed sessions.
--
-- get_child_last_active(p_child_id): lets a parent read their own child's most recent
-- activity. guild_sessions/player_events/player_activity are all read-own RLS (child-only), so
-- a parent can't read them directly — this is a parent-ownership-checked SECURITY DEFINER RPC,
-- the same pattern get_child_streak already uses.

create or replace view public.player_activity
with (security_invoker = true) as
select user_id, occurred_at, source from (
  select user_id, completed_at as occurred_at, 'quest_complete'::text as source from public.user_completed_questions
  union all
  select user_id, answered_at, 'main_quest_answer' from public.player_question_attempts
  union all
  select user_id, created_at, 'mtap_answer' from public.mtap_question_attempts
  union all
  select user_id, created_at, 'mtap_trainer' from public.mtap_mixed_trainer_completions
  union all
  select user_id, created_at, 'journal' from public.journal_entries
  union all
  select app_user_id, claimed_at, 'checklist_claim' from public.daily_checklist_claims
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
where user_id is not null and occurred_at is not null and user_id not like 'demo\_%';

create or replace function public.get_child_last_active(p_child_id text)
returns table(last_active timestamptz, active_source text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select a.occurred_at, a.source
  from public.player_activity a
  where a.user_id = p_child_id
    and exists (
      select 1 from public.children c
      where c.id = p_child_id and c.parent_id = auth.uid()
    )
  order by a.occurred_at desc
  limit 1;
$$;

revoke all on function public.get_child_last_active(text) from public, anon;
grant execute on function public.get_child_last_active(text) to authenticated, service_role;
