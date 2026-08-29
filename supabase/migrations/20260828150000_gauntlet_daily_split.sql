-- Topic Mastery Gauntlet: split into 5 daily portions instead of one
-- whole-week session.
--
-- Original intent (clarified after the first pass shipped as a single
-- bonus event card): the Gauntlet should SUBSTITUTE the normal Mon-Fri
-- quest board during a break week, not sit alongside it. That means
-- completion needs to be tracked per weekday, not once per event.
--
-- mastery_gauntlet_sessions was created today, unused by any real gauntlet
-- event yet (none has been scheduled), so it's altered in place rather than
-- layering a second tracking table.

alter table public.mastery_gauntlet_sessions
  add column day text;

alter table public.mastery_gauntlet_sessions
  drop constraint mastery_gauntlet_sessions_user_id_event_id_key;

-- Backfill safety: any pre-existing whole-event rows (there shouldn't be
-- any yet) would collide with the new per-day uniqueness once `day` is
-- required, so the NOT NULL is added after the constraint swap.
update public.mastery_gauntlet_sessions set day = 'Monday' where day is null;
alter table public.mastery_gauntlet_sessions alter column day set not null;

alter table public.mastery_gauntlet_sessions
  add constraint mastery_gauntlet_sessions_user_event_day_key unique (user_id, event_id, day);

-- claim_event_reward: gauntlet branch now requires all 5 weekdays done,
-- not just any one session row.
create or replace function public.claim_event_reward(p_event_id uuid, p_user_id text, p_grade_level integer)
returns boolean
language plpgsql
set search_path to 'public'
as $$
declare
  ev record;
  total_quests int;
  mastered_quests int;
  days_done int;
  inserted int;
begin
  select reward_monster_id, status, content_source, gauntlet_term into ev
  from public.custom_events
  where id = p_event_id;

  if not found or ev.status not in ('active', 'scheduled') then
    return false;
  end if;

  if ev.content_source = 'gauntlet' then
    select count(distinct day) into days_done
    from public.mastery_gauntlet_sessions
    where event_id = p_event_id and user_id = p_user_id and grade = p_grade_level;
    if days_done < 5 then
      return false;
    end if;
  else
    select count(*) into total_quests
    from public.event_quests
    where event_id = p_event_id
      and grade_level = p_grade_level;

    if total_quests = 0 then
      return false;
    end if;

    select count(*) into mastered_quests
    from public.user_event_progress uep
    join public.event_quests eq on eq.id = uep.event_quest_id
    where eq.event_id = p_event_id
      and eq.grade_level = p_grade_level
      and uep.user_id = p_user_id
      and uep.is_mastered = true;

    if mastered_quests < total_quests then
      return false;
    end if;
  end if;

  insert into public.user_event_claims (event_id, user_id)
  values (p_event_id, p_user_id)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return false;
  end if;

  insert into public.user_caught_monsters (user_id, monster_id)
  values (p_user_id, ev.reward_monster_id);

  return true;
end;
$$;
