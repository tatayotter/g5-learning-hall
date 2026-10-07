-- Offline trainer battles (docs/offline-mode-plan.md). With no connection a kid can battle any
-- Arena trainer their level allows. The battle plays on the phone: questions come from the rest
-- of the term's main quest content, graded from the (hashed) answer key the phone downloads with
-- it, items come off the phone's copy of the inventory, and the curio EXP shows straight away. On
-- reconnect each battle comes here once, keyed by the phone's entry id like the other offline
-- syncs (20261006070000_offline_play.sql, 20261006090000_offline_map.sql).
--
-- The battle itself runs only on the phone. Rather than replay it, the phone sends a hidden
-- turn-by-turn log with it (lib/battleLog.ts), and check_offline_battle_log checks the log adds
-- up against the game's own numbers: battle_* tables loaded from lib/monsterConfig.ts by
-- scripts/battle-stats.mjs (never typed by hand; CI fails if they drift from the game). What is
-- checked:
-- - the trainer is an Arena trainer and the player meets its level;
-- - every answer is re-graded; a win needs at least as many correct answers as the trainer has
--   curios and at least half right;
-- - every item used comes off the real inventory; one the player no longer has voids the win;
-- - the log, trainer side: each answer powers at most one attack, an attack only does damage
--   when one of its answers is right, no hit is bigger than the attacking curio could do (its
--   species, level, quality and skill, with every boost stacked), each trainer curio starts at
--   its full HP and goes down by exactly the damage logged (and burns of at most the burn
--   damage), and every trainer curio ends at 0;
-- - the log, player side: the trainer takes its turn every round (paralysis aside, which needs a
--   perfect hit to cause), its hits are at least what the weakest possible version of them
--   would do, each of the player's curios starts at most at its full HP and only goes up through
--   logged heals, rests and items, a knocked-out curio doesn't attack, and the items logged are
--   the items sent;
-- - the curio EXP is the trainer's own reward, never the phone's number, on the player's own
--   curio, as a delta.
-- A claimed win that fails these is recorded as a loss. Each log is kept in offline_battle_logs
-- with the first problem found (player_events payloads are capped at 2 kB).
--
-- The writes match the online path (components/MonsterGuild.tsx handleBattleEnd): the trainer
-- added to defeated_trainers (once), the curio EXP, a monster_battle_log row, the
-- monster_battles_won counter (and Tatay's own counters), and each question marked done for the
-- Arena. Achievements are checked by the client's save after the sync, as for the other offline
-- syncs. Additive apart from get_answer_key now returning hashed answers.

-- ── Hashed answer key ─────────────────────────────────────────────────────────
-- The phone now downloads the rest of the term's answers, not just this week's, so the key no
-- longer carries them in plain text: each entry is md5('lh-key:' || question id || ':' || answer).
-- The phone grades by hashing the chosen option the same way (lib/md5.ts, lib/offlineQuests.ts)
-- and finds the right option to show by hashing each one. Not secret (there are only a few
-- options to try), but no longer readable at a glance. Same signature, checks and grants as
-- 20261006070000_offline_play.sql.
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
  if not public.feature_enabled_for(p_user_id, 'offline_play') then
    raise exception 'offline play is not enabled for this account';
  end if;
  if coalesce(cardinality(p_content_week_ids), 0) > 20 then
    raise exception 'too many weeks requested (max 20)';
  end if;

  return coalesce((
    select jsonb_object_agg(cq.id, md5('lh-key:' || cq.id::text || ':' || cq.correct_answer))
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

-- ── Offline trainer battles ───────────────────────────────────────────────────

alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline'));

-- The game's battle numbers (scripts/battle-stats.mjs). Read only by the functions below.
create table if not exists public.battle_stat_constants (key text primary key, value numeric not null);
create table if not exists public.battle_qualities (quality text primary key, multiplier numeric not null);
-- Highest base stats across a species' forms (guild levels, graduations): upper bounds only.
create table if not exists public.battle_species (
  monster_id text primary key,
  base_hp int not null,
  base_attack int not null,
  base_defense int not null
);
create table if not exists public.battle_skills (skill_id text primary key, damage_multiplier numeric not null);
create table if not exists public.battle_trainers (trainer_id text primary key, level_req int not null, reward_exp int not null);
-- Each trainer curio exactly as the battle screen builds it, in team order (slot 0 first).
create table if not exists public.battle_trainer_curios (
  trainer_id text not null references public.battle_trainers (trainer_id) on delete cascade,
  slot int not null,
  hp int not null,
  attack int not null,
  defense int not null,
  skill_multiplier numeric not null,
  primary key (trainer_id, slot)
);
alter table public.battle_stat_constants enable row level security;
alter table public.battle_qualities enable row level security;
alter table public.battle_species enable row level security;
alter table public.battle_skills enable row level security;
alter table public.battle_trainers enable row level security;
alter table public.battle_trainer_curios enable row level security;
revoke all on public.battle_stat_constants, public.battle_qualities, public.battle_species,
  public.battle_skills, public.battle_trainers, public.battle_trainer_curios from anon, authenticated;

-- Replaces every battle_* table with the set scripts/battle-stats.mjs computed (its JSON shape).
create or replace function public.load_battle_stats(p_stats jsonb)
returns void
language plpgsql
set search_path to 'public'
as $$
begin
  delete from public.battle_trainer_curios;
  delete from public.battle_trainers;
  delete from public.battle_skills;
  delete from public.battle_species;
  delete from public.battle_qualities;
  delete from public.battle_stat_constants;

  insert into public.battle_stat_constants (key, value) values
    ('stat_growth', (p_stats ->> 'stat_growth')::numeric),
    ('burn_damage', (p_stats ->> 'burn_damage')::numeric);
  insert into public.battle_qualities (quality, multiplier)
  select key, value::numeric from jsonb_each_text(p_stats -> 'qualities');
  insert into public.battle_species (monster_id, base_hp, base_attack, base_defense)
  select key, (value ->> 'hp')::int, (value ->> 'attack')::int, (value ->> 'defense')::int
  from jsonb_each(p_stats -> 'species');
  insert into public.battle_skills (skill_id, damage_multiplier)
  select key, value::numeric from jsonb_each_text(p_stats -> 'skills');
  insert into public.battle_trainers (trainer_id, level_req, reward_exp)
  select key, (value ->> 'level_req')::int, (value ->> 'reward_exp')::int
  from jsonb_each(p_stats -> 'trainers');
  insert into public.battle_trainer_curios (trainer_id, slot, hp, attack, defense, skill_multiplier)
  select t.key, c.ord - 1, (c.value ->> 'hp')::int, (c.value ->> 'attack')::int, (c.value ->> 'defense')::int,
         (c.value ->> 'skill_multiplier')::numeric
  from jsonb_each(p_stats -> 'trainers') t
  cross join lateral jsonb_array_elements(t.value -> 'curios') with ordinality as c(value, ord);
end;
$$;

-- The battle_* tables in load_battle_stats' JSON shape, for scripts/battle-stats.mjs --check.
create or replace function public.battle_stats_snapshot()
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  select jsonb_build_object(
    'stat_growth', (select value from public.battle_stat_constants where key = 'stat_growth'),
    'burn_damage', (select value from public.battle_stat_constants where key = 'burn_damage'),
    'qualities', (select coalesce(jsonb_object_agg(quality, multiplier), '{}') from public.battle_qualities),
    'species', (select coalesce(jsonb_object_agg(monster_id, jsonb_build_object(
        'hp', base_hp, 'attack', base_attack, 'defense', base_defense)), '{}') from public.battle_species),
    'skills', (select coalesce(jsonb_object_agg(skill_id, damage_multiplier), '{}') from public.battle_skills),
    'trainers', (select coalesce(jsonb_object_agg(t.trainer_id, jsonb_build_object(
        'level_req', t.level_req, 'reward_exp', t.reward_exp,
        'curios', (select coalesce(jsonb_agg(jsonb_build_object(
            'hp', c.hp, 'attack', c.attack, 'defense', c.defense, 'skill_multiplier', c.skill_multiplier)
          order by c.slot), '[]') from public.battle_trainer_curios c where c.trainer_id = t.trainer_id))), '{}')
      from public.battle_trainers t)
  );
$$;

revoke all on function public.load_battle_stats(jsonb) from public, anon, authenticated;
revoke all on function public.battle_stats_snapshot() from public, anon, authenticated;

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

-- Checks an offline battle's log (lib/battleLog.ts) adds up; the first problem found, or null.
-- `p_graded` is {question id: [correct?, ...]} in answer order, as sync_offline_trainer_battle
-- re-graded them. The bounds lean generous (every boost stacked, every penalty at its worst) so
-- a real battle never fails them.
create or replace function public.check_offline_battle_log(
  p_user_id text,
  p_trainer_id text,
  p_log jsonb,
  p_graded jsonb,
  p_items jsonb,
  p_claimed_win boolean
)
returns text
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_growth numeric := (select value from public.battle_stat_constants where key = 'stat_growth');
  v_burn int := (select value from public.battle_stat_constants where key = 'burn_damage')::int;
  v_npc record;
  v_npc_count int;
  v_npc_hp int[];
  v_player jsonb := '{}'::jsonb;  -- curio id -> {hp, max_hp, attack, defense}
  v_used jsonb := '{}'::jsonb;    -- question id -> answers used so far
  v_ev jsonb;
  v_t text;
  v_idx int;
  v_dmg int;
  v_before int;
  v_after int;
  v_curio text;
  v_c jsonb;
  v_q text;
  v_use int;
  v_right int;
  v_asked int;
  v_mult numeric;
  v_attacks int := 0;
  v_perfect int := 0;
  v_player_turns int := 0;
  v_npc_actions int := 0;
  v_skips int := 0;
  v_items text[] := '{}';
begin
  select count(*) into v_npc_count from public.battle_trainer_curios where trainer_id = p_trainer_id;
  if v_npc_count = 0 or v_growth is null then
    return 'no battle stats for this trainer';
  end if;
  v_npc_hp := array_fill(null::int, array[v_npc_count]);

  for v_ev in select * from jsonb_array_elements(p_log) loop
    v_t := v_ev ->> 't';
    begin
      v_idx := (v_ev ->> 'npc')::int;
      v_dmg := (v_ev ->> 'damage')::int;
      v_before := (v_ev ->> 'hpBefore')::int;
      v_after := (v_ev ->> 'hpAfter')::int;
    exception when others then
      return 'unreadable log entry';
    end;
    if v_dmg < 0 then
      return 'unreadable log entry';
    end if;

    -- The player's curio this entry is about: its full HP, attack and defense at its level now
    -- (never below the level it battled at).
    v_curio := v_ev ->> 'curio';
    v_c := null;
    if v_t in ('attack', 'npc_hit', 'heal', 'rest', 'switch') or (v_t = 'burn' and v_ev ->> 'side' = 'player')
      or (v_t = 'item' and v_ev ? 'hpBefore') then
      if not (v_player ? coalesce(v_curio, '')) then
        select jsonb_build_object(
          'hp', null,
          'max_hp', round(s.base_hp * (1 + (um.monster_level - 1) * v_growth) * coalesce(q.multiplier, 1.4)),
          'attack', round(s.base_attack * (1 + (um.monster_level - 1) * v_growth) * coalesce(q.multiplier, 1.4)),
          'defense', round(s.base_defense * (1 + (um.monster_level - 1) * v_growth)))
        into v_c
        from public.user_monsters um
        join public.battle_species s on s.monster_id = um.monster_id
        left join public.battle_qualities q on q.quality = coalesce(um.quality, 'normal')
        where um.user_id = p_user_id
          and um.id = case when v_curio ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then v_curio::uuid end;
        if v_c is null then
          return 'a curio in the log isn''t the player''s';
        end if;
        v_player := v_player || jsonb_build_object(v_curio, v_c);
      end if;
      v_c := v_player -> v_curio;
    end if;

    -- HP chains: a trainer curio starts at its full HP, a player's curio at most at its full HP,
    -- and each entry picks up where the last one about that curio left off.
    if v_t = 'attack' or (v_t = 'burn' and v_ev ->> 'side' = 'npc') then
      if v_idx is null or v_idx < 0 or v_idx >= v_npc_count or v_before is null or v_after is null or v_dmg is null then
        return 'unreadable log entry';
      end if;
      select * into v_npc from public.battle_trainer_curios where trainer_id = p_trainer_id and slot = v_idx;
      if v_npc_hp[v_idx + 1] is null and v_before < v_npc.hp then
        return format('trainer curio %s started below its full HP', v_idx);
      elsif v_npc_hp[v_idx + 1] is not null and v_before <> v_npc_hp[v_idx + 1] then
        return format('trainer curio %s HP doesn''t follow on', v_idx);
      elsif v_after <> greatest(0, v_before - v_dmg) then
        return format('trainer curio %s HP doesn''t match the damage', v_idx);
      end if;
      v_npc_hp[v_idx + 1] := v_after;
    elsif v_c is not null and v_before is not null then
      if v_after is null then
        return 'unreadable log entry';
      elsif v_c ->> 'hp' is null and v_before > (v_c ->> 'max_hp')::int then
        return 'a player curio started above its full HP';
      elsif v_c ->> 'hp' is not null and v_before <> (v_c ->> 'hp')::int then
        return 'a player curio''s HP doesn''t follow on';
      elsif v_after > (v_c ->> 'max_hp')::int then
        return 'a player curio went above its full HP';
      end if;
    end if;

    case v_t
    when 'attack' then
      if (v_c ->> 'hp')::int = 0 then
        return 'a knocked-out curio attacked';
      end if;
      -- Each answer powers one attack: the n-th attack asking a question uses its n-th answer.
      v_right := 0;
      v_asked := 0;
      for v_q in select * from jsonb_array_elements_text(coalesce(v_ev -> 'questions', '[]'::jsonb)) loop
        v_use := coalesce((v_used ->> v_q)::int, 0);
        if not (p_graded ? v_q) then
          return 'attack question wasn''t answered';
        elsif v_use >= jsonb_array_length(p_graded -> v_q) then
          return 'one answer used for two attacks';
        end if;
        v_used := v_used || jsonb_build_object(v_q, v_use + 1);
        v_asked := v_asked + 1;
        if (p_graded -> v_q ->> v_use)::boolean then
          v_right := v_right + 1;
        end if;
      end loop;
      if v_dmg > 0 and v_right = 0 then
        return 'damage with no correct answer';
      end if;
      if v_asked > 0 and v_right = v_asked then
        v_perfect := v_perfect + 1;
      end if;
      select damage_multiplier into v_mult from public.battle_skills where skill_id = v_ev ->> 'skill';
      if not found then
        return 'unknown skill';
      end if;
      -- calculateDamage (lib/monsterConfig.ts) with every boost at once: element advantage 1.5,
      -- blessed 2, Attack Scroll 1.5, attack-up skills (the battle-long +0.4 one stacking on
      -- every earlier attack, plus up to +0.6 from the shorter ones), and the target's defense
      -- cut to a quarter by defense-down skills.
      if v_dmg > ceil((v_c ->> 'attack')::numeric * v_mult * 1.5 * 2 * 1.5 * (1.6 + 0.4 * v_attacks)
                      * 100 / (100 + v_npc.defense * 0.25)) then
        return 'hit too big for the curio';
      end if;
      v_attacks := v_attacks + 1;
      v_player_turns := v_player_turns + 1;
    when 'npc_hit' then
      if v_idx is null or v_idx < 0 or v_idx >= v_npc_count or v_dmg is null or v_before is null then
        return 'unreadable log entry';
      end if;
      if v_after <> greatest(0, v_before - v_dmg) then
        return 'a player curio''s HP doesn''t match the damage';
      end if;
      select * into v_npc from public.battle_trainer_curios where trainer_id = p_trainer_id and slot = v_idx;
      -- The weakest the trainer's hit can be: partial-answer damage (it answers 2 of 3), no
      -- element bonus, attack cut to a quarter by attack-down skills, the curio's defense raised
      -- by every defense-up skill (the battle-long +0.35 stacking), cursed and shielded.
      if v_dmg < floor(v_npc.attack * v_npc.skill_multiplier * 0.5 * 0.25 * 0.5 * 0.5
                       * 100 / (100 + (v_c ->> 'defense')::numeric * (1.6 + 0.35 * v_attacks))) - 1 then
        return 'trainer hit too small';
      end if;
      v_npc_actions := v_npc_actions + 1;
    when 'npc_skip' then
      v_npc_actions := v_npc_actions + 1;
      v_skips := v_skips + 1;
    when 'burn' then
      if v_dmg is null or v_dmg > v_burn then
        return 'burn too big';
      end if;
    when 'heal', 'rest' then
      if v_after < v_before then
        return 'a heal lowered HP';
      end if;
      if v_t = 'rest' then
        v_player_turns := v_player_turns + 1;
      end if;
    when 'item' then
      v_items := v_items || (v_ev ->> 'key');
      v_player_turns := v_player_turns + 1;
      if v_before is not null and v_after < v_before then
        return 'an item lowered HP';
      end if;
    when 'switch' then
      if (v_c ->> 'hp')::int = 0 then
        return 'switched to a knocked-out curio';
      end if;
      v_player_turns := v_player_turns + 1;
    else
      null;
    end case;

    if v_c is not null and v_after is not null and v_t <> 'attack' then
      v_player := jsonb_set(v_player, array[v_curio, 'hp'], to_jsonb(v_after));
    end if;
  end loop;

  if p_claimed_win then
    for v_idx in 1..v_npc_count loop
      if v_npc_hp[v_idx] is distinct from 0 then
        return format('trainer curio %s wasn''t knocked out', v_idx - 1);
      end if;
    end loop;
    -- The trainer acts every round; only the round that ends the battle can end before it does.
    if v_npc_actions < v_player_turns - 1 then
      return 'the trainer missed turns';
    end if;
    -- A paralyzed trainer curio skips a turn; paralysis comes only from a perfect hit.
    if v_skips > v_perfect then
      return 'too many skipped trainer turns';
    end if;
  end if;
  if (select coalesce(array_agg(k order by k), '{}') from unnest(v_items) k)
     is distinct from (select coalesce(array_agg(k order by k), '{}') from jsonb_array_elements_text(p_items) k) then
    return 'items don''t match the log';
  end if;
  return null;
end;
$$;

revoke all on function public.check_offline_battle_log(text, text, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;

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
  v_graded jsonb := '{}'::jsonb;
  v_log_problem text;
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

  select t.level_req, t.reward_exp, (select count(*) from public.battle_trainer_curios c where c.trainer_id = t.trainer_id)
  into v_level_req, v_reward_exp, v_curios
  from public.battle_trainers t
  where t.trainer_id = p_trainer_id;
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

  -- Same atomic decrement as consume_inventory_item. An item that's already gone (most often
  -- used up by the same player on another device before this one synced) just isn't taken
  -- again; the battle still counts, so a kid playing on two devices doesn't lose a fair win.
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
    -- The same question can come up more than once in a battle; each answer is kept in order.
    v_graded := v_graded || jsonb_build_object(v_qid::text,
      coalesce(v_graded -> v_qid::text, '[]'::jsonb) || to_jsonb(v_correct));

    insert into public.player_question_attempts (user_id, content_question_id, correct)
    values (p_user_id, v_qid, v_correct)
    on conflict (user_id, content_question_id)
    do update set correct = excluded.correct, answered_at = now();

    insert into public.user_completed_questions (user_id, quest_type, question_id)
    values (p_user_id, 'monster_arena', v_qid)
    on conflict (user_id, quest_type, question_id) do nothing;
  end loop;

  v_log_problem := public.check_offline_battle_log(p_user_id, p_trainer_id, p_log, v_graded, p_items, coalesce(p_won, false));

  v_won := coalesce(p_won, false) and v_allowed and v_log_problem is null
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
