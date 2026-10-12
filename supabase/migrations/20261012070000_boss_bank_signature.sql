-- boss_bank_signature(): a short fingerprint of one grade/term's published boss questions, so a
-- device can tell when its stored copy (lib/bossQuestionBank.ts) is out of date even though the
-- number of questions didn't change: an admin edit or a translation rewrites question text in
-- place, and the old count-only check kept serving the old wording for up to a week, where an
-- answer picked from the old options is graded against the new correct_answer and marked wrong.
-- Reads the same answer-free view the device downloads, as the caller (no security definer).

create or replace function public.boss_bank_signature(p_grade integer, p_term integer)
returns text
language sql
stable
set search_path to 'public'
as $$
  select md5(coalesce(string_agg(
    id::text || '|' || coalesce(topic, '') || '|' || question || '|' || options::text,
    E'\n' order by id), ''))
  from public.draft_questions_public
  where grade = p_grade and term = p_term;
$$;

revoke all on function public.boss_bank_signature(integer, integer) from public;
grant execute on function public.boss_bank_signature(integer, integer) to anon, authenticated, service_role;
