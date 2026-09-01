-- user_event_claims didn't record WHICH monster got granted — fine while
-- reward_monster_id was always fixed (the claims row's existence implied the
-- monster), but 'random_starter' rewards (20260902100000) break that: on a
-- later visit, the persistent "you already claimed this" display has no way
-- to know which curio a student actually got without this. claim_event_reward
-- now writes it in the same insert as the claim ledger row.

alter table public.user_event_claims
  add column granted_monster_id text;

create or replace function public.claim_event_reward(p_event_id uuid, p_user_id text, p_grade_level integer)
returns text
language plpgsql
set search_path to 'public'
as $$
declare
  ev record;
  total_quests int;
  mastered_quests int;
  days_done int;
  inserted int;
  granted_monster_id text;
  starters text[] := array['shadrak', 'torrenth', 'voltmane', 'fernix', 'solarch', 'pyravex'];
begin
  select reward_monster_id, status, content_source, gauntlet_term into ev
  from public.custom_events
  where id = p_event_id;

  if not found or ev.status not in ('active', 'scheduled') then
    return null;
  end if;

  if ev.content_source = 'gauntlet' then
    select count(distinct day) into days_done
    from public.mastery_gauntlet_sessions
    where event_id = p_event_id and user_id = p_user_id and grade = p_grade_level;
    if days_done < 5 then
      return null;
    end if;
  else
    select count(*) into total_quests
    from public.event_quests
    where event_id = p_event_id
      and grade_level = p_grade_level;

    if total_quests = 0 then
      return null;
    end if;

    select count(*) into mastered_quests
    from public.user_event_progress uep
    join public.event_quests eq on eq.id = uep.event_quest_id
    where eq.event_id = p_event_id
      and eq.grade_level = p_grade_level
      and uep.user_id = p_user_id
      and uep.is_mastered = true;

    if mastered_quests < total_quests then
      return null;
    end if;
  end if;

  granted_monster_id := ev.reward_monster_id;
  if granted_monster_id = 'random_starter' then
    granted_monster_id := starters[1 + floor(random() * array_length(starters, 1))::int];
  end if;

  insert into public.user_event_claims (event_id, user_id, granted_monster_id)
  values (p_event_id, p_user_id, granted_monster_id)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return null;
  end if;

  insert into public.user_caught_monsters (user_id, monster_id)
  values (p_user_id, granted_monster_id);

  return granted_monster_id;
end;
$$;
