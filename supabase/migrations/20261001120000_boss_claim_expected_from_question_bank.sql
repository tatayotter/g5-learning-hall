-- Term Boss gauntlet claim: derive "how many shadows must be defeated" from the
-- question bank instead of a hardcoded per-grade count.
--
-- The old body only knew Grade 5 (9 shadows) and Grade 2 (7), so Grades 3/4/6
-- could never claim, and a subject with no lessons in a given term (e.g.
-- Grade 6 has no EPP (ICT) lessons in Term 2) would have made the claim
-- unreachable even once those grades were added. The client builds its shadow
-- roster the same way (lib/bossPersonas.ts getPersonasForGrade with the term's
-- pool counts): one shadow per subject that has published questions for that
-- grade + term. Only defeats of those subjects count toward the target.

create or replace function public.claim_boss_gauntlet_reward(p_user_id text, p_grade int, p_term int)
returns boolean
language plpgsql
set search_path to 'public'
as $$
declare
  cfg record;
  expected_count int;
  defeated_count int;
  inserted int;
begin
  select reward_monster_id into cfg from public.boss_gauntlet_rewards
  where grade = p_grade and term = p_term;
  if not found then
    return false;
  end if;

  select count(distinct subject) into expected_count from public.draft_questions
  where grade = p_grade and term = p_term and status = 'published';
  if expected_count = 0 then
    return false;
  end if;

  select count(*) into defeated_count from public.boss_persona_defeats d
  where d.user_id = p_user_id and d.grade = p_grade and d.term = p_term
    and exists (
      select 1 from public.draft_questions q
      where q.grade = p_grade and q.term = p_term and q.status = 'published'
        and q.subject = d.subject
    );
  if defeated_count < expected_count then
    return false;
  end if;

  insert into public.boss_gauntlet_claims (user_id, grade, term)
  values (p_user_id, p_grade, p_term)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return false;
  end if;

  insert into public.user_caught_monsters (user_id, monster_id) values (p_user_id, cfg.reward_monster_id);
  return true;
end;
$$;
