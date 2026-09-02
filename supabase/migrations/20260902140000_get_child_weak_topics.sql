-- Premium parent-dashboard perk: per-subject weak-topic report, built from the
-- same player_question_attempts log the Topic Mastery Gauntlet already uses
-- (see lib/masteryGauntletEngine.ts fetchGauntletMistakes) — no new tracking
-- table needed, just an aggregation join against content_questions for the
-- subject label. Same auth pattern as get_child_journal/get_child_streak:
-- parent-of-child + active-subscription gate, both enforced server-side (not
-- just hidden client-side) since this is SECURITY DEFINER over a read-own table.
create or replace function public.get_child_weak_topics(p_child_id text)
returns table(subject text, wrong_count integer, total_count integer, wrong_pct numeric)
language sql
security definer
set search_path to 'public'
as $$
  select
    cq.subject,
    count(*) filter (where pqa.correct = false)::integer as wrong_count,
    count(*)::integer as total_count,
    round(100.0 * count(*) filter (where pqa.correct = false) / count(*), 1) as wrong_pct
  from public.player_question_attempts pqa
  join public.content_questions_public cq on cq.id = pqa.content_question_id
  where pqa.user_id = p_child_id
    and exists (
      select 1 from public.children c
      where c.id = p_child_id and c.parent_id = auth.uid()
    )
    and exists (
      select 1 from public.subscriptions s
      where s.parent_id = auth.uid() and s.status = 'active'
    )
  group by cq.subject
  having count(*) >= 3
  order by wrong_pct desc, wrong_count desc;
$$;
