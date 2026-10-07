-- Offline trainer battles (docs/offline-mode-plan.md). With no connection a kid can battle any
-- Arena trainer their level allows. The battle plays on the phone: questions come from the rest
-- of the term's main quest content, graded from the answer key the phone downloads with it
-- (get_answer_key), items come off the phone's copy of the inventory, and the curio EXP shows
-- straight away. On reconnect each battle comes here
-- once, keyed by the phone's entry id like the other offline syncs
-- (20261006070000_offline_play.sql, 20261006090000_offline_map.sql). Additive only: one widened
-- CHECK and one new function.
--
-- The battle itself (HP, damage, turn order) runs only on the phone, so it can't be replayed
-- here. What this checks instead:
-- - the trainer is one of the Arena trainers (NPC_TRAINERS in lib/monsterConfig.ts) and the
--   player meets its level;
-- - every item used comes off the real inventory; one the player no longer has means the
--   claimed win doesn't count (the items they did have are still used up);
-- - every answer is re-graded; a win needs at least as many correct answers as the trainer has
--   curios (each needs one landed hit, and a skill with no correct answer misses), and at least
--   half of the answers right;
-- - the curio EXP is the trainer's own reward, never the phone's number, on the player's own
--   curio, as a delta.
-- A claimed win that fails these is recorded as a loss.
--
-- The writes match the online path (components/MonsterGuild.tsx handleBattleEnd): the trainer
-- added to defeated_trainers (once), the curio EXP, a monster_battle_log row, the
-- monster_battles_won counter (and Tatay's own counters), and each question marked done for the
-- Arena. Achievements are checked by the client's save after the sync, as for the other
-- offline syncs.

alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline'));

create or replace function public.sync_offline_trainer_battle(
  p_user_id text,
  p_entry_id uuid,
  p_trainer_id text,
  p_monster_row_id uuid,
  p_answers jsonb,
  p_items jsonb,
  p_won boolean,
  p_played_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_idem text := 'offline_trainer:' || p_entry_id::text;
  v_prev jsonb;
  v_played timestamptz;
  v_day date;
  v_level_req int;
  v_reward_exp int;
  v_curios int;
  v_player_level int;
  v_allowed boolean;
  v_answer jsonb;
  v_item text;
  v_items_ok boolean := true;
  v_qid uuid;
  v_selected text;
  v_key text;
  v_correct boolean;
  v_asked int := 0;
  v_right int := 0;
  v_won boolean := false;
  v_exp int := 0;
  v_monster_level int := null;
  v_out jsonb;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_entry_id is null then
    raise exception 'entry id required';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'answers must be an array';
  end if;
  -- A long battle asks a few dozen questions at most.
  if jsonb_array_length(p_answers) > 60 then
    raise exception 'too many answers';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be an array';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'too many items';
  end if;

  perform pg_advisory_xact_lock(hashtext('sync_offline_trainer_battle:' || p_user_id));

  select payload into v_prev from public.player_events
  where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true);
  end if;

  -- NPC_TRAINERS in lib/monsterConfig.ts: id, player level needed, reward EXP, curios.
  select t.level_req, t.reward_exp, t.curios into v_level_req, v_reward_exp, v_curios
  from (values
    ('forest_scout', 1, 50, 3),
    ('tide_watcher', 5, 75, 3),
    ('ember_acolyte', 7, 100, 3),
    ('storm_caller', 10, 125, 3),
    ('shadow_stalker', 13, 150, 3),
    ('light_bearer', 16, 175, 3),
    ('elemental_knight', 20, 200, 3),
    ('grand_master', 25, 300, 3),
    ('tatay', 0, 0, 3)
  ) as t(id, level_req, reward_exp, curios)
  where t.id = p_trainer_id;
  if not found then
    raise exception 'not an arena trainer: %', p_trainer_id;
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

  select level into v_player_level from public.player_progress where user_id = p_user_id;
  v_allowed := coalesce(v_player_level, 1) >= v_level_req;

  -- Same atomic decrement as consume_inventory_item.
  for v_item in select * from jsonb_array_elements_text(p_items) loop
    update public.player_inventory
    set quantity = quantity - 1, updated_at = now()
    where app_user_id = p_user_id and item_key = v_item and quantity > 0;
    if not found then
      v_items_ok := false;
    end if;
  end loop;

  for v_answer in select * from jsonb_array_elements(p_answers) loop
    v_qid := nullif(v_answer ->> 'question_id', '')::uuid;
    v_selected := v_answer ->> 'selected';
    select correct_answer into v_key from public.content_questions where id = v_qid;
    if not found then
      raise exception 'no such content question: %', v_qid;
    end if;
    v_correct := v_selected is not null and v_selected = v_key;
    v_asked := v_asked + 1;
    if v_correct then
      v_right := v_right + 1;
    end if;

    insert into public.player_question_attempts (user_id, content_question_id, correct)
    values (p_user_id, v_qid, v_correct)
    on conflict (user_id, content_question_id)
    do update set correct = excluded.correct, answered_at = now();

    insert into public.user_completed_questions (user_id, quest_type, question_id)
    values (p_user_id, 'monster_arena', v_qid)
    on conflict (user_id, quest_type, question_id) do nothing;
  end loop;

  v_won := coalesce(p_won, false) and v_allowed and v_items_ok
    and v_right >= v_curios and v_right * 2 >= v_asked;

  insert into public.user_battle_state (user_id) values (p_user_id) on conflict (user_id) do nothing;

  if v_won then
    if v_reward_exp > 0 then
      -- 100 EXP per level, level cap 100 (BATTLE_CONSTANTS in lib/monsterConfig.ts).
      update public.user_monsters
      set monster_exp = monster_exp + v_reward_exp,
          monster_level = least((monster_exp + v_reward_exp) / 100 + 1, 100)
      where id = p_monster_row_id and user_id = p_user_id
      returning monster_level into v_monster_level;
      if found then
        v_exp := v_reward_exp;
      end if;
    end if;

    update public.user_battle_state
    set defeated_trainers = case
          when p_trainer_id = any(coalesce(defeated_trainers, '{}')) then defeated_trainers
          else array_append(coalesce(defeated_trainers, '{}'), p_trainer_id)
        end,
        updated_at = now()
    where user_id = p_user_id;

    perform public.apply_progress_update(
      p_user_id,
      p_monster_battles_won_delta => 1,
      p_tatay_battles_won_delta => case when p_trainer_id = 'tatay' then 1 else 0 end
    );
  elsif p_trainer_id = 'tatay' then
    perform public.apply_progress_update(p_user_id, p_tatay_battles_lost_delta => 1);
  end if;

  insert into public.monster_battle_log (user_id, opponent, result, monster_exp_earned, created_at)
  values (p_user_id, p_trainer_id, case when v_won then 'win' else 'loss' end, v_exp, v_played);

  v_out := jsonb_build_object(
    'played_on', v_day,
    'claimed_at', p_played_at,
    'trainer_id', p_trainer_id,
    'claimed_win', coalesce(p_won, false),
    'won', v_won,
    'allowed', v_allowed,
    'items', jsonb_array_length(p_items),
    'items_ok', v_items_ok,
    'answered', v_asked,
    'correct', v_right,
    'exp', v_exp,
    'monster_level', v_monster_level,
    'offline', true
  );

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'trainer_offline', v_played, v_out, v_idem);

  return v_out || jsonb_build_object('replayed', false);
end;
$$;

revoke all on function public.sync_offline_trainer_battle(text, uuid, text, uuid, jsonb, jsonb, boolean, timestamptz) from public, anon;
grant execute on function public.sync_offline_trainer_battle(text, uuid, text, uuid, jsonb, jsonb, boolean, timestamptz) to authenticated, service_role;
