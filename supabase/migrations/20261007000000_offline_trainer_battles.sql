-- Offline trainer battles (docs/offline-mode-plan.md). With no connection a kid can battle any
-- Arena trainer their level allows. The battle plays on the phone: questions come from the rest
-- of the term's main quest content, graded from the answer key the phone downloads with it
-- (get_answer_key), items come off the phone's copy of the inventory, and the curio EXP shows
-- straight away. On reconnect each battle comes here
-- once, keyed by the phone's entry id like the other offline syncs
-- (20261006070000_offline_play.sql, 20261006090000_offline_map.sql).
--
-- The battle itself (HP, damage, turn order) runs only on the phone. Rather than replay it, the
-- phone sends a hidden turn-by-turn log with it (lib/battleLog.ts), and this checks that the log
-- adds up. What this checks:
-- - the trainer is one of the Arena trainers (NPC_TRAINERS in lib/monsterConfig.ts) and the
--   player meets its level;
-- - every item used comes off the real inventory; one the player no longer has means the
--   claimed win doesn't count (the items they did have are still used up);
-- - every answer is re-graded; a win needs at least as many correct answers as the trainer has
--   curios (each needs one landed hit, and a skill with no correct answer misses), and at least
--   half of the answers right;
-- - the log: every attack's questions are answers sent with the battle (each answer used once), an
--   attack only does damage when one of them is right, no hit is bigger than the attacking curio
--   could do at its level, each trainer curio's HP starts at its full HP and goes down by exactly
--   the damage logged, every trainer curio ends at 0, and the items logged are the items sent;
-- - the curio EXP is the trainer's own reward, never the phone's number, on the player's own
--   curio, as a delta.
-- A claimed win that fails these is recorded as a loss. The log is kept in
-- offline_battle_logs, with the first problem found, for a look later (player_events payloads are
-- capped at 2 kB, too small for a long battle's log).
--
-- The writes match the online path (components/MonsterGuild.tsx handleBattleEnd): the trainer
-- added to defeated_trainers (once), the curio EXP, a monster_battle_log row, the
-- monster_battles_won counter (and Tatay's own counters), and each question marked done for the
-- Arena. Achievements are checked by the client's save after the sync, as for the other
-- offline syncs. Additive only: one widened CHECK, one new table and one new function.

alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline'));

-- The hidden battle logs. Written only by sync_offline_trainer_battle (security definer); no
-- client reads or writes it.
create table if not exists public.offline_battle_logs (
  id bigint generated always as identity primary key,
  user_id text not null,
  entry_id uuid not null unique,
  trainer_id text not null,
  claimed_win boolean not null,
  won boolean not null,
  problem text,
  log jsonb not null,
  played_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists offline_battle_logs_user_idx on public.offline_battle_logs (user_id, played_at desc);
alter table public.offline_battle_logs enable row level security;
revoke all on public.offline_battle_logs from anon, authenticated;

create or replace function public.sync_offline_trainer_battle(
  p_user_id text,
  p_entry_id uuid,
  p_trainer_id text,
  p_monster_row_id uuid,
  p_answers jsonb,
  p_items jsonb,
  p_log jsonb,
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
  v_npc_max_hp int[];
  v_graded jsonb := '{}'::jsonb;
  v_used_questions jsonb := '{}'::jsonb;
  v_log_problem text := null;
  v_npc_hp int[];
  v_ev jsonb;
  v_idx int;
  v_dmg int;
  v_before int;
  v_after int;
  v_q text;
  v_q_right int;
  v_q_use int;
  v_attacker_level int;
  v_max_hit numeric;
  v_log_items text[] := '{}';
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
  if p_log is null or jsonb_typeof(p_log) <> 'array' then
    raise exception 'log must be an array';
  end if;
  if jsonb_array_length(p_log) > 1000 then
    raise exception 'log too long';
  end if;

  perform pg_advisory_xact_lock(hashtext('sync_offline_trainer_battle:' || p_user_id));

  select payload into v_prev from public.player_events
  where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true);
  end if;

  -- NPC_TRAINERS in lib/monsterConfig.ts: id, player level needed, reward EXP, and each curio's
  -- full HP in team order (getScaledStats(...).hp). A curio's HP here must never be above the
  -- game's, or real wins over it stop counting; update this when trainer teams or HP change.
  select t.level_req, t.reward_exp, t.hp into v_level_req, v_reward_exp, v_npc_max_hp
  from (values
    ('forest_scout', 1, 50, array[130, 116, 124]),
    ('tide_watcher', 5, 75, array[140, 178, 156]),
    ('ember_acolyte', 7, 100, array[164, 138, 180]),
    ('storm_caller', 10, 125, array[150, 157, 163]),
    ('shadow_stalker', 13, 150, array[170, 176, 182]),
    ('light_bearer', 16, 175, array[236, 293, 252]),
    ('elemental_knight', 20, 200, array[208, 322, 221]),
    ('grand_master', 25, 300, array[350, 246, 259]),
    ('tatay', 0, 0, array[1249, 1249, 1249])
  ) as t(id, level_req, reward_exp, hp)
  where t.id = p_trainer_id;
  if not found then
    raise exception 'not an arena trainer: %', p_trainer_id;
  end if;
  v_curios := cardinality(v_npc_max_hp);
  v_npc_hp := array_fill(null::int, array[v_curios]);

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
    -- The same question can come up more than once in a battle; each answer is kept in order.
    v_graded := v_graded || jsonb_build_object(v_qid::text,
      coalesce(v_graded -> v_qid::text, '[]'::jsonb) || to_jsonb(v_correct));
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

  -- The log (lib/battleLog.ts). Only the trainer's side is checked: the player's curio HP isn't
  -- needed to tell whether the trainer's curios were knocked out.
  for v_ev in select * from jsonb_array_elements(p_log) loop
    exit when v_log_problem is not null;
    case v_ev ->> 't'
    when 'attack', 'burn' then
      if v_ev ->> 't' = 'burn' and v_ev ->> 'side' is distinct from 'npc' then
        continue;
      end if;
      begin
        v_idx := (v_ev ->> 'npc')::int;
        v_dmg := (v_ev ->> 'damage')::int;
        v_before := (v_ev ->> 'hpBefore')::int;
        v_after := (v_ev ->> 'hpAfter')::int;
      exception when others then
        v_log_problem := 'unreadable log entry';
        continue;
      end;
      if v_idx is null or v_idx < 0 or v_idx >= v_curios or v_dmg is null or v_dmg < 0
        or v_before is null or v_after is null then
        v_log_problem := 'unreadable log entry';
      elsif v_npc_hp[v_idx + 1] is null and v_before < v_npc_max_hp[v_idx + 1] then
        v_log_problem := format('trainer curio %s started below its full HP', v_idx);
      elsif v_npc_hp[v_idx + 1] is not null and v_before <> v_npc_hp[v_idx + 1] then
        v_log_problem := format('trainer curio %s HP doesn''t follow on', v_idx);
      elsif v_after <> greatest(0, v_before - v_dmg) then
        v_log_problem := format('trainer curio %s HP doesn''t match the damage', v_idx);
      elsif v_ev ->> 't' = 'burn' and v_dmg > 5 then
        -- BURN_DAMAGE_PER_TURN in lib/monsterConfig.ts.
        v_log_problem := 'burn too big';
      end if;

      if v_log_problem is null and v_ev ->> 't' = 'attack' then
        v_q_right := 0;
        for v_q in select * from jsonb_array_elements_text(coalesce(v_ev -> 'questions', '[]'::jsonb)) loop
          -- Each answer powers one attack: the n-th attack asking a question uses its n-th answer.
          v_q_use := coalesce((v_used_questions ->> v_q)::int, 0);
          if not (v_graded ? v_q) then
            v_log_problem := 'attack question wasn''t answered';
          elsif v_q_use >= jsonb_array_length(v_graded -> v_q) then
            v_log_problem := 'one answer used for two attacks';
          else
            v_used_questions := v_used_questions || jsonb_build_object(v_q, v_q_use + 1);
            if (v_graded -> v_q ->> v_q_use)::boolean then
              v_q_right := v_q_right + 1;
            end if;
          end if;
        end loop;
        if v_log_problem is null and v_dmg > 0 and v_q_right = 0 then
          v_log_problem := 'damage with no correct answer';
        end if;
        if v_log_problem is null then
          select monster_level into v_attacker_level from public.user_monsters
          where id = case when v_ev ->> 'curio' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
                          then (v_ev ->> 'curio')::uuid end
            and user_id = p_user_id;
          if not found then
            v_log_problem := 'attack by a curio that isn''t the player''s';
          else
            -- The most any curio could hit for at this level (lib/monsterConfig.ts): highest
            -- species base attack (26) x level growth (8% a level) x best quality (1.4) x
            -- strongest skill (2.25) x element advantage (1.5) x blessed (2) x Attack Scroll (1.5),
            -- with 2x more for stacked attack-up skills. Defense only lowers it.
            v_max_hit := 26 * (1 + (v_attacker_level - 1) * 0.08) * 1.4 * 2.25 * 1.5 * 2 * 1.5 * 2;
            if v_dmg > v_max_hit then
              v_log_problem := 'hit too big for the curio''s level';
            end if;
          end if;
        end if;
      end if;
      if v_log_problem is null then
        v_npc_hp[v_idx + 1] := v_after;
      end if;
    when 'item' then
      v_log_items := v_log_items || (v_ev ->> 'key');
    else
      null;
    end case;
  end loop;

  if v_log_problem is null and coalesce(p_won, false) then
    for v_idx in 1..v_curios loop
      if v_npc_hp[v_idx] is distinct from 0 then
        v_log_problem := format('trainer curio %s wasn''t knocked out', v_idx - 1);
        exit;
      end if;
    end loop;
  end if;
  if v_log_problem is null and (
    select coalesce(array_agg(k order by k), '{}') from unnest(v_log_items) k
  ) is distinct from (
    select coalesce(array_agg(k order by k), '{}') from jsonb_array_elements_text(p_items) k
  ) then
    v_log_problem := 'items don''t match the log';
  end if;

  v_won := coalesce(p_won, false) and v_allowed and v_items_ok and v_log_problem is null
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
    'log_problem', v_log_problem,
    'answered', v_asked,
    'correct', v_right,
    'exp', v_exp,
    'monster_level', v_monster_level,
    'offline', true
  );

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'trainer_offline', v_played, v_out, v_idem);

  insert into public.offline_battle_logs (user_id, entry_id, trainer_id, claimed_win, won, problem, log, played_at)
  values (p_user_id, p_entry_id, p_trainer_id, coalesce(p_won, false), v_won, v_log_problem, p_log, v_played);

  return v_out || jsonb_build_object('replayed', false);
end;
$$;

revoke all on function public.sync_offline_trainer_battle(text, uuid, text, uuid, jsonb, jsonb, jsonb, boolean, timestamptz) from public, anon;
grant execute on function public.sync_offline_trainer_battle(text, uuid, text, uuid, jsonb, jsonb, jsonb, boolean, timestamptz) to authenticated, service_role;
