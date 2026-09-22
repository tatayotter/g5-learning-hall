-- pgTAP tests for mark_guild_session_today: identity enforcement, idempotency, the
-- opt-in server-owned lifetime counter, and backward-compatible legacy JSON writes.
--
-- Run via `supabase test db` (spins up a fresh local stack from supabase/migrations,
-- applies pg_prove over every *.test.sql in this directory). Never run against production —
-- these fixtures are entirely self-contained (fresh random test identities), but the point
-- of the local/CI stack is that a bug can't touch real data even by accident.
--
-- Deliberately compares against (now() at time zone 'Asia/Manila')::date, the same expression
-- mark_guild_session_today itself uses for guild_sessions.played_on — NOT the bare
-- current_date, which reflects the test session's own timezone setting and can differ from
-- Manila for part of every day (Manila is UTC+8), which would make these assertions flaky
-- depending purely on what time the suite happens to run.

begin;
create extension if not exists pgtap;
select plan(13);

-- ── Fixture: two unrelated fresh "logged in as a student" identities ─────────
-- current_app_user_id() only ever consults user_identity_map, so a session can be
-- simulated without touching auth.users at all for this pair.
create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_child_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_child_b_' || substr(md5(random()::text), 1, 8) as user_b,
  (now() at time zone 'Asia/Manila')::date as today;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx
union all
select auth_b, user_b from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── Identity enforcement ──────────────────────────────────────────────────────

select pg_temp.login_as(auth_a) from fx;

select throws_ok(
  format('select mark_guild_session_today(%L, %L, %L::date, 1, 1)', (select user_b from fx), 'spellcaster', (select today from fx)),
  'P0001', 'not authorized',
  'a logged-in student cannot record a session for a different student'
);

select lives_ok(
  format('select mark_guild_session_today(%L, %L, %L::date, 1, 1)', (select user_a from fx), 'spellcaster', (select today from fx)),
  'a student can record their own session'
);

select throws_ok(
  format('select mark_guild_session_today(%L, %L, %L::date, 1, 1)', (select user_a from fx), 'not_a_real_guild', (select today from fx)),
  'P0001', 'unknown guild key: not_a_real_guild',
  'an unrecognized guild key is rejected'
);

-- ── Idempotency: retrying the same session id never double-counts ────────────

select mark_guild_session_today((select user_a from fx), 'number_realm', (select today from fx), 10, 7, 'session-A', true);
select mark_guild_session_today((select user_a from fx), 'number_realm', (select today from fx), 10, 7, 'session-A', true);
select mark_guild_session_today((select user_a from fx), 'number_realm', (select today from fx), 10, 7, 'session-A', true);

select is(
  (select sessions_played from guild_sessions where user_id = (select user_a from fx) and guild_key = 'number_realm' and played_on = (select today from fx)),
  1,
  'three calls with the same session id record exactly one play'
);
select is(
  (select questions_answered from guild_sessions where user_id = (select user_a from fx) and guild_key = 'number_realm' and played_on = (select today from fx)),
  10,
  'the answered count is not tripled by the repeated calls'
);
select is(
  (select count(*)::int from player_events where user_id = (select user_a from fx) and idempotency_key = 'session-A'),
  1,
  'only one player_events row exists for the repeated session id'
);

-- A genuinely different session id for the same guild/day accumulates as a second play.
select mark_guild_session_today((select user_a from fx), 'number_realm', (select today from fx), 5, 2, 'session-B', true);
select is(
  (select sessions_played from guild_sessions where user_id = (select user_a from fx) and guild_key = 'number_realm' and played_on = (select today from fx)),
  2,
  'a different session id for the same guild/day is a genuinely new play'
);

-- ── p_count_lifetime opt-in ────────────────────────────────────────────────────

select is(
  (select guild_sessions_count_total from player_progress where user_id = (select user_a from fx)),
  2,
  'the lifetime counter moved by exactly 2 (one per genuinely new session, not per call)'
);

select mark_guild_session_today((select user_a from fx), 'lorekeeper', (select today from fx), 1, 1, 'session-C', false);
select is(
  (select guild_sessions_count_total from player_progress where user_id = (select user_a from fx)),
  2,
  'p_count_lifetime = false leaves the counter untouched even for a genuinely new session'
);

-- ── Old-style call with no session id: unchanged legacy behavior (every call counts) ──

select mark_guild_session_today((select user_a from fx), 'lexicon_arena', (select today from fx), 1, 1);
select mark_guild_session_today((select user_a from fx), 'lexicon_arena', (select today from fx), 1, 1);
select is(
  (select sessions_played from guild_sessions where user_id = (select user_a from fx) and guild_key = 'lexicon_arena' and played_on = (select today from fx)),
  2,
  'omitting the session id preserves the original always-counts behavior'
);

-- ── Legacy JSON dual-write (checklist backward compatibility) ────────────────

select is(
  (select guild_last_played ->> 'spellcaster' from user_battle_state where user_id = (select user_a from fx)),
  (select today::text from fx),
  'the legacy guild_last_played JSON is still stamped for old clients'
);

-- ── Server owns the date, not the client ──────────────────────────────────────

select mark_guild_session_today((select user_a from fx), 'logic_labyrinth', '1999-01-01'::date, 1, 1, 'session-D', true);
select is(
  (select played_on from guild_sessions where user_id = (select user_a from fx) and guild_key = 'logic_labyrinth'),
  (select today from fx),
  'guild_sessions.played_on uses the server day (Manila), ignoring a mismatched p_today'
);
select is(
  (select guild_last_played ->> 'logic_labyrinth' from user_battle_state where user_id = (select user_a from fx)),
  '1999-01-01',
  'the legacy JSON write still trusts the client date verbatim (unchanged pre-existing behavior)'
);

select * from finish();
rollback;
