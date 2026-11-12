-- The Forgetful on the map (lib/forgetful.ts). A grey-robed follower of the Forgetful turns up on a
-- wild map and asks the kid to forget a question they got wrong:
--   'forget'   -> 2 gold (the question stays missed and comes back some other day);
--   'remember' -> the kid answers that question again: right = 10 gold + 15 EXP, and the
--                 question counts as right now; wrong = no penalty, nothing paid.
-- At most 2 paid meetings a Manila day; any more come back as 'tired' with nothing paid.
-- One row per meeting (p_entry_id), so a retried call pays once. Behind the 'forgetful' switch.

insert into public.feature_flags (key) values ('forgetful') on conflict (key) do nothing;

create table if not exists public.forgetful_meetings (
  entry_id uuid primary key,
  user_id text not null,
  met_on date not null,
  region text not null,
  choice text not null check (choice in ('forget', 'remember')),
  question_id uuid,
  correct boolean,
  status text not null,
  gold integer not null default 0,
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists forgetful_meetings_user_day on public.forgetful_meetings (user_id, met_on);

alter table public.forgetful_meetings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'forgetful_meetings' and policyname = 'forgetful_meetings: read own'
  ) then
    create policy "forgetful_meetings: read own" on public.forgetful_meetings
      for select to authenticated using (current_app_user_id() = user_id);
  end if;
end $$;
-- No client writes: meet_forgetful (security definer) is the only way in.

create or replace function public.meet_forgetful(
  p_user_id text,
  p_entry_id uuid,
  p_region text,
  p_choice text,
  p_question_id uuid default null,
  p_selected text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  -- lib/forgetful.ts FORGETFUL_REWARDS / FORGETFUL_PER_DAY mirror these.
  c_forget_gold constant int := 2;
  c_remember_gold constant int := 10;
  c_remember_xp constant int := 15;
  c_per_day constant int := 2;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_prev public.forgetful_meetings%rowtype;
  v_paid_today int;
  v_answer text;
  v_correct boolean := null;
  v_status text;
  v_gold int := 0;
  v_xp int := 0;
  v_progress jsonb := null;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_entry_id is null then
    raise exception 'entry id required';
  end if;
  if p_choice not in ('forget', 'remember') then
    raise exception 'unknown choice: %', p_choice;
  end if;
  if p_region is null or p_region in ('town', 'hideout') then
    raise exception 'the Forgetful never come here: %', p_region;
  end if;
  if not public.feature_enabled_for(p_user_id, 'forgetful') then
    raise exception 'forgetful is not on for this player';
  end if;

  perform pg_advisory_xact_lock(hashtext('meet_forgetful:' || p_user_id));

  select * into v_prev from public.forgetful_meetings where entry_id = p_entry_id;
  if found then
    if v_prev.user_id <> p_user_id then
      raise exception 'not authorized';
    end if;
    return jsonb_build_object(
      'status', v_prev.status, 'correct', v_prev.correct,
      'correct_answer', case when v_prev.correct is null then null
        else (select correct_answer from public.content_questions where id = v_prev.question_id) end,
      'gold', v_prev.gold, 'xp', v_prev.xp, 'progress', null, 'replayed', true);
  end if;

  if p_choice = 'remember' then
    if p_question_id is null then
      raise exception 'question required';
    end if;
    select correct_answer into v_answer from public.content_questions where id = p_question_id;
    if not found then
      raise exception 'no such content question: %', p_question_id;
    end if;
    v_correct := p_selected is not null and p_selected = v_answer;
    insert into public.player_question_attempts (user_id, content_question_id, correct)
    values (p_user_id, p_question_id, v_correct)
    on conflict (user_id, content_question_id)
    do update set correct = excluded.correct, answered_at = now();
  end if;

  select count(*) into v_paid_today from public.forgetful_meetings
  where user_id = p_user_id and met_on = v_today and status <> 'tired';

  if v_paid_today >= c_per_day then
    v_status := 'tired';
  elsif p_choice = 'forget' then
    v_status := 'forgot';
    v_gold := c_forget_gold;
  elsif v_correct then
    v_status := 'remembered';
    v_gold := c_remember_gold;
    v_xp := c_remember_xp;
  else
    v_status := 'wrong';
  end if;

  if v_gold > 0 or v_xp > 0 then
    v_progress := public.apply_progress_update(p_user_id, p_xp_delta => v_xp, p_gold_delta => v_gold);
  end if;

  insert into public.forgetful_meetings (entry_id, user_id, met_on, region, choice, question_id, correct, status, gold, xp)
  values (p_entry_id, p_user_id, v_today, p_region, p_choice, p_question_id, v_correct, v_status, v_gold, v_xp);

  return jsonb_build_object(
    'status', v_status,
    'correct', v_correct,
    'correct_answer', case when v_correct is null then null else v_answer end,
    'gold', v_gold,
    'xp', v_xp,
    'progress', v_progress,
    'replayed', false
  );
end;
$$;

revoke all on function public.meet_forgetful(text, uuid, text, text, uuid, text) from public, anon;
grant execute on function public.meet_forgetful(text, uuid, text, text, uuid, text) to authenticated, service_role;
