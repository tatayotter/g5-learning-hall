-- Offline Training Map: walking, scroll questions and trash with no connection
-- (docs/offline-mode-plan.md). The phone grades each scroll from the answer key it already
-- downloads for main quests (get_answer_key), shows the curio EXP straight away and queues
-- what happened; on reconnect each entry comes here once. Wild curios, trainers and bots stay
-- online-only. Additive only: one widened CHECK and one new function.
--
-- sync_offline_map(): one queued map entry, keyed by the phone's entry id like the other
-- offline syncs (20261006070000_offline_play.sql). An entry is any of:
-- - a scroll answer: re-graded here (the phone's verdict is never trusted) and recorded in
--   player_question_attempts like grade_content_question; when correct, the same writes the
--   online map makes (components/monster/TrainingMap.tsx handleScrollAnswer): +10 EXP on the
--   chosen curio as a delta, the day's training-map checklist credit, the wild-encounter pity
--   counter, and the question marked done for the Arena;
-- - trash picked up or traded at the recycler: the trash counters and the gold, clamped;
-- - the last tile the player stood on.

alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline'));

create or replace function public.sync_offline_map(
  p_user_id text,
  p_entry_id uuid,
  p_monster_row_id uuid,
  p_question_id uuid,
  p_selected text,
  p_trash_collected integer,
  p_trash_gold integer,
  p_map_x integer,
  p_map_y integer,
  p_played_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_idem text := 'offline_map:' || p_entry_id::text;
  v_prev jsonb;
  v_played timestamptz;
  v_day date;
  v_answer text;
  v_correct boolean := null;
  v_exp int := 0;
  v_level int := null;
  -- A region holds a handful of trash at a time and the recycler pays 1 gold per bundle
  -- (lib/trashConfig.ts), so one entry never legitimately carries more than this.
  v_collected int := least(greatest(coalesce(p_trash_collected, 0), 0), 50);
  v_gold int := least(greatest(coalesce(p_trash_gold, 0), 0), 50);
  v_out jsonb;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_entry_id is null then
    raise exception 'entry id required';
  end if;

  perform pg_advisory_xact_lock(hashtext('sync_offline_map:' || p_user_id));

  select payload into v_prev from public.player_events
  where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true);
  end if;

  -- Same claimed-time rule as sync_offline_main_quest.
  v_played := case
    when p_played_at is not null
      and p_played_at <= now() + interval '5 minutes'
      and p_played_at >= now() - interval '14 days'
    then least(p_played_at, now())
    else now()
  end;
  v_day := (v_played at time zone 'Asia/Manila')::date;

  insert into public.user_battle_state (user_id) values (p_user_id) on conflict (user_id) do nothing;

  if p_question_id is not null then
    select correct_answer into v_answer from public.content_questions where id = p_question_id;
    if not found then
      raise exception 'no such content question: %', p_question_id;
    end if;
    v_correct := p_selected is not null and p_selected = v_answer;

    insert into public.player_question_attempts (user_id, content_question_id, correct)
    values (p_user_id, p_question_id, v_correct)
    on conflict (user_id, content_question_id)
    do update set correct = excluded.correct, answered_at = now();

    if v_correct then
      -- BATTLE_CONSTANTS in lib/monsterConfig.ts: 10 EXP per grass answer, 100 EXP per level,
      -- level cap 100. Only the player's own curio.
      update public.user_monsters
      set monster_exp = monster_exp + 10,
          monster_level = least((monster_exp + 10) / 100 + 1, 100)
      where id = p_monster_row_id and user_id = p_user_id
      returning monster_level into v_level;
      if found then
        v_exp := 10;
      end if;

      update public.user_battle_state
      set last_wild_encounter_win = greatest(coalesce(last_wild_encounter_win, v_day), v_day),
          questions_since_wild_encounter = questions_since_wild_encounter + 1,
          updated_at = now()
      where user_id = p_user_id;

      insert into public.user_completed_questions (user_id, quest_type, question_id)
      values (p_user_id, 'monster_arena', p_question_id)
      on conflict (user_id, quest_type, question_id) do nothing;
    end if;
  end if;

  if v_collected > 0 or v_gold > 0 then
    insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
    update public.player_progress
    set trash_collected_total = trash_collected_total + v_collected,
        trash_gold_earned_total = trash_gold_earned_total + v_gold,
        updated_at = now()
    where user_id = p_user_id;
    if v_gold > 0 then
      perform public.apply_progress_update(p_user_id, p_gold_delta => v_gold);
    end if;
  end if;

  if p_map_x is not null and p_map_y is not null then
    update public.user_battle_state
    set map_x = p_map_x, map_y = p_map_y, updated_at = now()
    where user_id = p_user_id;
  end if;

  v_out := jsonb_build_object(
    'played_on', v_day,
    'claimed_at', p_played_at,
    'question_id', p_question_id,
    'correct', v_correct,
    'exp', v_exp,
    'monster_level', v_level,
    'trash_collected', v_collected,
    'gold', v_gold,
    'offline', true
  );

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'map_offline', v_played, v_out, v_idem);

  return v_out || jsonb_build_object('replayed', false);
end;
$$;

revoke all on function public.sync_offline_map(text, uuid, uuid, uuid, text, integer, integer, integer, integer, timestamptz) from public, anon;
grant execute on function public.sync_offline_map(text, uuid, uuid, uuid, text, integer, integer, integer, integer, timestamptz) to authenticated, service_role;
