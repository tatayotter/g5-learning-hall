-- Guild session recording reliability, part 1: idempotency.
--
-- mark_guild_session_today is called fire-and-forget from the client with no retry, so a
-- failed request (network blip, tab closed mid-call) silently drops the session: nothing in
-- guild_sessions, no lifetime XP-adjacent counter movement, and no way to safely retry without
-- risking a double count. This migration makes a retry safe; the client-side retry/queue
-- wrapper is a separate, purely additive change (lib/guildSessions.ts).
--
-- p_session_id (new, optional): a client-generated id for one attempt. When given, the
-- underlying player_events row is inserted with that id as its idempotency key (the unique
-- index on (user_id, idempotency_key) already exists — see player_events_and_activity_view).
-- A retry with the same id hits the conflict, so guild_sessions and the lifetime counter are
-- touched only on the FIRST successful insert. Old clients (p_session_id omitted) behave
-- exactly as before: every call counts, same as today.
--
-- p_count_lifetime (new, optional, default false): the lifetime counter
-- (player_progress.guild_sessions_count_total) is currently incremented client-side via
-- apply_progress_update's delta. Until every client sends p_count_lifetime = true, the server
-- leaves that counter alone here, so nothing double-counts during the rollout. Once the new
-- client is the only one in the field, apply_progress_update's guild delta can be dropped and
-- this becomes unconditional (tracked as a follow-up).

drop function if exists public.mark_guild_session_today(text, text, date, integer, integer);

create function public.mark_guild_session_today(
  p_user_id text,
  p_guild_key text,
  p_today date,
  p_questions_answered integer default 0,
  p_correct_count integer default 0,
  p_session_id text default null,
  p_count_lifetime boolean default false
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  affected int;
  v_answered int := greatest(coalesce(p_questions_answered, 0), 0);
  v_correct int := least(greatest(coalesce(p_correct_count, 0), 0), v_answered);
  v_new_event boolean;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;

  if p_guild_key not in ('lorekeeper', 'spellcaster', 'number_realm', 'logic_labyrinth', 'lexicon_arena') then
    raise exception 'unknown guild key: %', p_guild_key;
  end if;

  if p_session_id is not null and length(p_session_id) > 64 then
    raise exception 'session id too long';
  end if;

  -- The per-play event doubles as the idempotency record. With a session id, a retry hits the
  -- unique (user_id, idempotency_key) index and inserts nothing; without one (old client),
  -- every call is unconditionally "new", matching the pre-existing behavior exactly.
  if p_session_id is not null then
    insert into public.player_events (user_id, event_type, payload, idempotency_key)
    values (p_user_id, 'guild_session',
            jsonb_build_object('guild_key', p_guild_key, 'questions_answered', v_answered, 'correct_count', v_correct),
            p_session_id)
    on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing;
    get diagnostics affected = row_count;
    v_new_event := (affected = 1);
  else
    insert into public.player_events (user_id, event_type, payload)
    values (p_user_id, 'guild_session',
            jsonb_build_object('guild_key', p_guild_key, 'questions_answered', v_answered, 'correct_count', v_correct));
    v_new_event := true;
  end if;

  -- Legacy write: idempotent by nature (same date in, same date out), safe to repeat.
  update public.user_battle_state
  set guild_last_played = jsonb_set(coalesce(guild_last_played, '{}'::jsonb), array[p_guild_key], to_jsonb(p_today::text))
  where user_id = p_user_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    insert into public.user_battle_state (user_id, guild_last_played)
    values (p_user_id, jsonb_build_object(p_guild_key, p_today::text));
  end if;

  if not v_new_event then
    return; -- retry of an already-recorded session: legacy JSON re-stamped above, nothing else
  end if;

  -- Server-derived day (Manila), not the device clock — unchanged from before.
  insert into public.guild_sessions (user_id, guild_key, played_on, questions_answered, correct_count)
  values (p_user_id, p_guild_key, (now() at time zone 'Asia/Manila')::date, v_answered, v_correct)
  on conflict (user_id, guild_key, played_on) do update
  set sessions_played = guild_sessions.sessions_played + 1,
      questions_answered = guild_sessions.questions_answered + excluded.questions_answered,
      correct_count = guild_sessions.correct_count + excluded.correct_count,
      last_completed_at = now();

  if p_count_lifetime then
    insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
    update public.player_progress
    set guild_sessions_count_total = guild_sessions_count_total + 1, updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.mark_guild_session_today(text, text, date, integer, integer, text, boolean) from public, anon;
grant execute on function public.mark_guild_session_today(text, text, date, integer, integer, text, boolean) to authenticated, service_role;
