-- Boss Fight ("The Forgetting" personas) schema.
-- See C:\Users\rowil\.claude\projects\...\memory\project_term_boss_fight.md for the
-- full design brainstorm this implements.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.boss_persona_defeats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  grade integer not null,
  subject text not null,
  term integer not null,
  defeated_at timestamptz not null default now(),
  unique (user_id, grade, subject, term)
);
alter table public.boss_persona_defeats enable row level security;
create policy "boss_persona_defeats: read own" on public.boss_persona_defeats
  for select using (current_app_user_id() = user_id);
create policy "boss_persona_defeats: insert own" on public.boss_persona_defeats
  for insert with check (current_app_user_id() = user_id);

create table public.boss_gauntlet_rewards (
  id uuid primary key default gen_random_uuid(),
  grade integer not null,
  term integer not null,
  reward_monster_id text not null,
  reward_lore_markdown text,
  updated_at timestamptz not null default now(),
  unique (grade, term)
);
alter table public.boss_gauntlet_rewards enable row level security;
create policy "boss_gauntlet_rewards: read all" on public.boss_gauntlet_rewards
  for select using (true);

create table public.boss_gauntlet_claims (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  grade integer not null,
  term integer not null,
  claimed_at timestamptz not null default now(),
  unique (user_id, grade, term)
);
alter table public.boss_gauntlet_claims enable row level security;
create policy "boss_gauntlet_claims: read own" on public.boss_gauntlet_claims
  for select using (current_app_user_id() = user_id);
create policy "boss_gauntlet_claims: insert own" on public.boss_gauntlet_claims
  for insert with check (current_app_user_id() = user_id);

alter table public.admin_config add column boss_fights_enabled boolean not null default false;

-- Exposes only the one flag students need — admin_config itself (passcode_hash,
-- admin_email) stays locked down. Same reasoning as event_quests_public stripping
-- correct_answer instead of granting broader table access.
create view public.boss_fights_status as
  select boss_fights_enabled from public.admin_config where id = true;
grant select on public.boss_fights_status to anon, authenticated;

-- Answer-stripped view of draft_questions, mirroring event_quests_public's shape —
-- used for the boss fight's question pool regardless of draft_questions' own
-- (pre-existing, out of scope here) permissive RLS on correct_answer.
create view public.draft_questions_public as
  select id, week_starting_date, grade, subject, tier, topic, question, options
  from public.draft_questions
  where status = 'published';
grant select on public.draft_questions_public to anon, authenticated;

-- ── RPCs ────────────────────────────────────────────────────────────────────

create or replace function public.grade_boss_question(p_question_id uuid, p_selected text)
returns boolean
language sql
set search_path to 'public'
as $$
  select correct_answer = p_selected from public.draft_questions where id = p_question_id;
$$;

-- Not SECURITY DEFINER — relies on boss_persona_defeats' own "insert own" RLS
-- policy to stop user_id spoofing, exactly like claim_event_reward does for
-- user_event_claims. Reuses apply_character_deltas + upsert_inventory instead of
-- duplicating their logic.
create or replace function public.claim_boss_persona_victory(
  p_user_id text, p_week_starting_date date, p_grade int, p_subject text, p_term int
) returns jsonb
language plpgsql
set search_path to 'public'
as $$
declare
  inserted int;
  stats jsonb;
begin
  insert into public.boss_persona_defeats (user_id, grade, subject, term)
  values (p_user_id, p_grade, p_subject, p_term)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('newly_defeated', false);
  end if;

  stats := public.apply_character_deltas(p_user_id, p_week_starting_date, 200, 150);
  perform public.upsert_inventory(p_user_id, 'growth_pill', 1);

  return jsonb_build_object(
    'newly_defeated', true,
    'xp_gained', 200,
    'gold_gained', 150,
    'character_stats', stats
  );
end;
$$;

-- Mirrors claim_event_reward's shape — re-verifies server-side before granting,
-- grants into user_caught_monsters exactly like the event reward path.
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

  expected_count := case p_grade when 5 then 9 when 2 then 7 else 0 end;
  if expected_count = 0 then
    return false;
  end if;

  select count(*) into defeated_count from public.boss_persona_defeats
  where user_id = p_user_id and grade = p_grade and term = p_term;
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

-- Admin-only, mirrors admin_set_event_status exactly.
create or replace function public.admin_set_boss_fights_enabled(p_passcode text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  perform public.check_admin_passcode(p_passcode);
  update public.admin_config set boss_fights_enabled = p_enabled where id = true;
end;
$$;

-- Admin-only, mirrors admin_upsert_custom_event's upsert-by-unique-key shape.
create or replace function public.admin_upsert_boss_gauntlet_reward(
  p_passcode text, p_grade int, p_term int, p_reward_monster_id text, p_reward_lore_markdown text
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  result_id uuid;
begin
  perform public.check_admin_passcode(p_passcode);
  insert into public.boss_gauntlet_rewards (grade, term, reward_monster_id, reward_lore_markdown)
  values (p_grade, p_term, p_reward_monster_id, p_reward_lore_markdown)
  on conflict (grade, term) do update set
    reward_monster_id = excluded.reward_monster_id,
    reward_lore_markdown = excluded.reward_lore_markdown,
    updated_at = now()
  returning id into result_id;
  return result_id;
end;
$$;
