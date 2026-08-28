-- Topic Mastery Gauntlet (see project_term_break_special_content_plan memory).
--
-- A term-break event quest: instead of admin-authored event_quests content, the
-- pool is assembled dynamically from draft_questions_public for the grade/term
-- that just ended (same source + topic-balancing helper as the Term Exam Boss
-- Fight). First run per student has no attempt history, so the pool is random;
-- from then on, previously-wrong questions for that grade/term are prioritized,
-- so a student's *next* break gauntlet actually targets their real mistakes.
--
-- Reuses the existing custom_events/event_quests reward system rather than
-- inventing a parallel one: a gauntlet-type event still grants a curio via
-- claim_event_reward, just gated on a completed gauntlet session instead of
-- N mastered event_quests.

-- ── custom_events: flag gauntlet-type events + which term they review ────────

alter table public.custom_events
  add column content_source text not null default 'authored'
    check (content_source in ('authored', 'gauntlet'));
alter table public.custom_events
  add column gauntlet_term smallint check (gauntlet_term between 1 and 3);

-- ── Per-question correctness log ──────────────────────────────────────────────
-- One row per (user, question) -- upserted on every answer, so it always
-- reflects the student's most recent attempt. Scoped to draft_questions (the
-- term-wide pool), not content_questions (the weekly Monster Arena pool) --
-- separate table because it keys off a different question source, same as
-- boss_persona_defeats vs. player_question_attempts already do.

create table public.mastery_gauntlet_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question_id uuid not null,
  grade integer not null,
  subject text not null,
  term integer not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (user_id, question_id)
);
create index idx_mastery_gauntlet_attempts_user_scope
  on public.mastery_gauntlet_attempts using btree (user_id, grade, term);

alter table public.mastery_gauntlet_attempts enable row level security;
create policy "mastery_gauntlet_attempts: read own" on public.mastery_gauntlet_attempts
  for select using (current_app_user_id() = user_id);
-- No client insert/update policy -- writes only happen through
-- grade_mastery_gauntlet_question (SECURITY DEFINER), same contract as
-- player_question_attempts / grade_content_question.

-- ── Session completion marker ─────────────────────────────────────────────────
-- The gauntlet pool is dynamic (not N fixed event_quests rows), so
-- "did this student finish this break's gauntlet" needs its own flag rather
-- than counting mastered event_quests. Client-written directly (like
-- user_event_progress already is) -- it's just a completion marker, no
-- correctness data to protect.

create table public.mastery_gauntlet_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id uuid not null references public.custom_events (id),
  grade integer not null,
  term integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, event_id)
);
alter table public.mastery_gauntlet_sessions enable row level security;
create policy "mastery_gauntlet_sessions: read own" on public.mastery_gauntlet_sessions
  for select using (current_app_user_id() = user_id);
create policy "mastery_gauntlet_sessions: insert own" on public.mastery_gauntlet_sessions
  for insert with check (current_app_user_id() = user_id);

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- Grades one gauntlet question and upserts the correctness log in the same
-- call. SECURITY DEFINER for the same reason grade_boss_question is: direct
-- client SELECT on draft_questions is locked down (it carries correct_answer),
-- so the read has to happen server-side under an elevated role.
create or replace function public.grade_mastery_gauntlet_question(
  p_question_id uuid, p_selected text, p_user_id text, p_grade int, p_subject text, p_term int
) returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  answer text;
  is_correct boolean;
begin
  select correct_answer into answer from public.draft_questions where id = p_question_id;
  if not found then
    raise exception 'no such draft question: %', p_question_id;
  end if;

  is_correct := (answer = p_selected);

  insert into public.mastery_gauntlet_attempts (user_id, question_id, grade, subject, term, is_correct, answered_at)
  values (p_user_id, p_question_id, p_grade, p_subject, p_term, is_correct, now())
  on conflict (user_id, question_id) do update set
    is_correct = excluded.is_correct,
    answered_at = excluded.answered_at;

  return is_correct;
end;
$$;

-- claim_event_reward: add the gauntlet-completion branch alongside the
-- existing event_quests-mastery check. A gauntlet event has zero event_quests
-- rows by design, so the old logic (total_quests = 0 -> false) would never
-- let it be claimed -- branch on content_source before that check runs.
create or replace function public.claim_event_reward(p_event_id uuid, p_user_id text, p_grade_level integer)
returns boolean
language plpgsql
set search_path to 'public'
as $$
declare
  ev record;
  total_quests int;
  mastered_quests int;
  session_done boolean;
  inserted int;
begin
  select reward_monster_id, status, content_source, gauntlet_term into ev
  from public.custom_events
  where id = p_event_id;

  if not found or ev.status not in ('active', 'scheduled') then
    return false;
  end if;

  if ev.content_source = 'gauntlet' then
    select exists(
      select 1 from public.mastery_gauntlet_sessions
      where event_id = p_event_id and user_id = p_user_id and grade = p_grade_level
    ) into session_done;
    if not session_done then
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

-- admin_upsert_custom_event: extend with content_source + gauntlet_term.
create or replace function public.admin_upsert_custom_event(
  p_passcode text, p_id uuid, p_title text, p_banner_url text, p_details_markdown text,
  p_reward_lore_markdown text, p_reward_monster_id text, p_start_date date, p_end_date date,
  p_content_source text default 'authored', p_gauntlet_term int default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  result_id uuid;
begin
  perform public.check_admin_passcode(p_passcode);

  if p_id is null then
    insert into public.custom_events (
      title, banner_url, details_markdown, reward_lore_markdown,
      reward_monster_id, start_date, end_date, status, content_source, gauntlet_term
    ) values (
      p_title, p_banner_url, p_details_markdown, p_reward_lore_markdown,
      p_reward_monster_id, p_start_date, p_end_date, 'draft', p_content_source, p_gauntlet_term
    ) returning id into result_id;
  else
    update public.custom_events set
      title = p_title,
      banner_url = p_banner_url,
      details_markdown = p_details_markdown,
      reward_lore_markdown = p_reward_lore_markdown,
      reward_monster_id = p_reward_monster_id,
      start_date = p_start_date,
      end_date = p_end_date,
      content_source = p_content_source,
      gauntlet_term = p_gauntlet_term,
      updated_at = now()
    where id = p_id
    returning id into result_id;

    if result_id is null then
      raise exception 'no custom_event with id %', p_id;
    end if;
  end if;

  return result_id;
end;
$$;
