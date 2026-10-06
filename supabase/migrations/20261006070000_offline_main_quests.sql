-- Offline main quests: the first slice of the offline-mode plan
-- (docs/offline-mode-plan.md). A kid on the installed app can take this week's main quests
-- with no connection: the phone grades instantly from a downloaded answer key, queues the
-- answers, and on reconnect the server re-grades them and applies the reward exactly once.
-- Additive only: one new table, one widened CHECK, three new functions.
--
-- 1. feature_flags + my_feature_flags(): the hidden rollout switch (off / allowlist /
--    everyone). 'offline_main_quests' starts 'off'; turn it on for chosen kids first with
--      update feature_flags set mode = 'allowlist', allowlist = '{<child id>,<child id>}'
--      where key = 'offline_main_quests';
-- 2. get_answer_key(): {question_id: correct_answer} for the given content weeks. Login
--    required, flag-gated, capped at 20 weeks. Never served from the public, shared-cache
--    /api/content route.
-- 3. sync_offline_main_quest(): re-grades one queued quiz through grade_content_quiz (the
--    phone's score is never trusted), then applies the same journal and reward bookkeeping the
--    online path does (components/dashboard/board/ActiveQuestView.tsx + useWeeklyData's
--    updateStatsAndJournal), all in one transaction keyed by the phone's entry id, recorded
--    as a player_events row. A retry of the same id returns the stored result and pays nothing.

-- ── Feature flags ─────────────────────────────────────────────────────────────

create table if not exists public.feature_flags (
  key text primary key,
  mode text not null default 'off' check (mode in ('off', 'allowlist', 'everyone')),
  allowlist text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- No policies: clients only ever see their own enabled keys, through my_feature_flags().
alter table public.feature_flags enable row level security;

insert into public.feature_flags (key) values ('offline_main_quests') on conflict (key) do nothing;

create or replace function public.feature_enabled_for(p_user_id text, p_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.feature_flags
    where key = p_key
      and (mode = 'everyone' or (mode = 'allowlist' and p_user_id = any(allowlist)))
  );
$$;

revoke all on function public.feature_enabled_for(text, text) from public, anon, authenticated;
grant execute on function public.feature_enabled_for(text, text) to service_role;

create or replace function public.my_feature_flags(p_user_id text)
returns text[]
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  return coalesce(
    (select array_agg(key order by key) from public.feature_flags
     where public.feature_enabled_for(p_user_id, key)),
    '{}'::text[]
  );
end;
$$;

revoke all on function public.my_feature_flags(text) from public, anon;
grant execute on function public.my_feature_flags(text) to authenticated, service_role;

-- ── Answer key ────────────────────────────────────────────────────────────────

create or replace function public.get_answer_key(p_user_id text, p_content_week_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if not public.feature_enabled_for(p_user_id, 'offline_main_quests') then
    raise exception 'offline main quests are not enabled for this account';
  end if;
  if coalesce(cardinality(p_content_week_ids), 0) > 20 then
    raise exception 'too many weeks requested (max 20)';
  end if;

  return coalesce((
    select jsonb_object_agg(cq.id, cq.correct_answer)
    from public.content_questions cq
    join public.content_quizzes quiz on quiz.id = cq.content_quiz_id
    join public.content_days day on day.id = quiz.content_day_id
    where day.content_week_id = any(p_content_week_ids)
      and cq.correct_answer is not null
  ), '{}'::jsonb);
end;
$$;

revoke all on function public.get_answer_key(text, uuid[]) from public, anon;
grant execute on function public.get_answer_key(text, uuid[]) to authenticated, service_role;

-- ── Sync ──────────────────────────────────────────────────────────────────────

-- The event that makes a sync idempotent (and shows up in player_activity on the day it was
-- played, not the day it synced).
alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline'));

create or replace function public.sync_offline_main_quest(
  p_user_id text,
  p_entry_id uuid,
  p_content_week_id uuid,
  p_weekday text,
  p_subject text,
  p_answers jsonb,
  p_played_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_idem text := 'offline_main_quest:' || p_entry_id::text;
  v_prev jsonb;
  v_week date;
  v_played timestamptz;
  v_day date;
  v_grade jsonb;
  v_quest text := p_weekday || '_' || p_subject;
  v_locked boolean;
  v_perfect boolean;
  v_journal public.player_weekly_journal;
  v_already_mastered boolean := false;
  v_attempt int := null;
  v_mult int;
  v_xp int := 0;
  v_gold int := 0;
  v_out jsonb;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_entry_id is null then
    raise exception 'entry id required';
  end if;

  -- One sync at a time per player, so a double-sent entry can't be graded twice.
  perform pg_advisory_xact_lock(hashtext('sync_offline_main_quest:' || p_user_id));

  select payload into v_prev from public.player_events
  where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true);
  end if;

  select week_starting_date into v_week from public.content_weeks where id = p_content_week_id;
  if not found then
    raise exception 'unknown content week';
  end if;

  -- The phone's claimed play time decides which day's 2-attempt limit the quiz counts
  -- against, so a few days played offline don't all land on the sync day. Accepted only if
  -- it's within the last 14 days and not in the future (5 minutes of clock skew allowed);
  -- otherwise the quiz still counts, at server time.
  v_played := case
    when p_played_at is not null
      and p_played_at <= now() + interval '5 minutes'
      and p_played_at >= now() - interval '14 days'
    then least(p_played_at, now())
    else now()
  end;
  v_day := (v_played at time zone 'Asia/Manila')::date;

  v_grade := public.grade_content_quiz(p_user_id, p_answers, v_week, p_weekday, p_subject, v_day);
  v_locked := coalesce((v_grade ->> 'locked')::boolean, false);
  v_perfect := coalesce((v_grade ->> 'is_perfect')::boolean, false);

  -- Same bookkeeping as the online submit: the attempt counter for reward scaling, and on a
  -- perfect score the mastery, counters and xp/gold. A quest mastered meanwhile (another
  -- device, or an earlier entry) is graded and recorded but pays nothing again.
  if not v_locked then
    insert into public.player_weekly_journal (user_id, content_week_id)
    values (p_user_id, p_content_week_id)
    on conflict (user_id, content_week_id) do nothing;

    select * into v_journal from public.player_weekly_journal
    where user_id = p_user_id and content_week_id = p_content_week_id
    for update;

    v_already_mastered := coalesce(v_journal.mastered_quizzes, '[]'::jsonb) ? v_quest;

    if not v_already_mastered then
      v_attempt := coalesce((v_journal.quiz_attempts ->> v_quest)::int, 0) + 1;

      if v_perfect then
        -- lib/quizReward.ts calculateReward: 200 xp / 50 gold, minus 10% per extra attempt,
        -- floored at 50%. In tenths so it stays exact integer math.
        v_mult := greatest(10 - (v_attempt - 1), 5);
        v_xp := 20 * v_mult;
        v_gold := 5 * v_mult;

        update public.player_weekly_journal set
          quiz_attempts = coalesce(quiz_attempts, '{}'::jsonb) || jsonb_build_object(v_quest, v_attempt),
          mastered_quizzes = coalesce(mastered_quizzes, '[]'::jsonb) || to_jsonb(v_quest),
          mastery_count = coalesce(mastery_count, 0) + 1,
          perfect_quizzes = perfect_quizzes + 1,
          updated_at = now()
        where user_id = p_user_id and content_week_id = p_content_week_id;

        perform public.apply_progress_update(
          p_user_id,
          p_xp_delta => v_xp,
          p_gold_delta => v_gold,
          p_perfect_quizzes_delta => 1,
          p_mastery_delta => 1
        );
      else
        update public.player_weekly_journal set
          quiz_attempts = coalesce(quiz_attempts, '{}'::jsonb) || jsonb_build_object(v_quest, v_attempt),
          updated_at = now()
        where user_id = p_user_id and content_week_id = p_content_week_id;
      end if;
    end if;
  end if;

  v_out := jsonb_build_object(
    'quest', v_quest,
    'played_on', v_day,
    'claimed_at', p_played_at,
    'locked', v_locked,
    'correct_count', coalesce((v_grade ->> 'correct_count')::int, 0),
    'total', coalesce((v_grade ->> 'total')::int, 0),
    'is_perfect', v_perfect,
    'attempts_used_today', (v_grade ->> 'attempts_used_today')::int,
    'attempt', v_attempt,
    'already_mastered', v_already_mastered,
    'xp', v_xp,
    'gold', v_gold
  );

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'main_quest_offline', v_played, v_out, v_idem);

  return v_out || jsonb_build_object('replayed', false);
end;
$$;

revoke all on function public.sync_offline_main_quest(text, uuid, uuid, text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.sync_offline_main_quest(text, uuid, uuid, text, text, jsonb, timestamptz) to authenticated, service_role;
