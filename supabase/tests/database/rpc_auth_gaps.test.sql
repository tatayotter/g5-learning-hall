-- pgTAP tests for:
--   1. get_child_last_active: parent-ownership enforcement (the "real last active" feature).
--   2. The 4 RPC authorization gaps closed in close_rpc_auth_gaps — most importantly, that
--      claim_push_gold_bonus_child/_parent reject a cross-account claim attempt and leave the
--      target account's gold untouched (this was a live, exploitable currency-minting bug
--      before that migration; these assertions are the regression test for it).

begin;
create extension if not exists pgtap;
select plan(12);

-- ── Fixture: two real parent/child pairs (needs real auth.users so the parent-ownership
-- EXISTS clauses — c.parent_id = auth.uid() — have something real to check against; the
-- on_auth_user_created_insert_parent trigger auto-creates the matching parents row).
-- child_a_auth is a separate fresh identity for "logged in as the child themselves"
-- (current_app_user_id()-based RPCs), kept distinct from the parent's own auth.uid() so the
-- two kinds of session in this file are never conflated. ──

create temp table fx as
select
  gen_random_uuid() as parent_a, gen_random_uuid() as parent_b, gen_random_uuid() as child_a_auth,
  'pgtap_kid_a_' || substr(md5(random()::text), 1, 8) as child_a,
  'pgtap_kid_b_' || substr(md5(random()::text), 1, 8) as child_b;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_a, false, false, 'pgtap-parent-a-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx
union all
select parent_b, false, false, 'pgtap-parent-b-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx;

insert into children (id, parent_id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select child_a, parent_a, child_a, 'x', 'PGTAP Kid A', 'Grade 5', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx
union all
select child_b, parent_b, child_b, 'x', 'PGTAP Kid B', 'Grade 5', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;

-- Something real for get_child_last_active to find.
insert into guild_sessions (user_id, guild_key, played_on)
select child_a, 'spellcaster', (now() at time zone 'Asia/Manila')::date from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.logout() returns void as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$ language plpgsql;

-- ── get_child_last_active: ownership ──────────────────────────────────────────

select pg_temp.login_as(parent_a) from fx;
select is(
  (select active_source from get_child_last_active((select child_a from fx))),
  'guild_session',
  'the owning parent sees their own child''s real last activity'
);

select pg_temp.login_as(parent_b) from fx;
select is(
  (select count(*)::int from get_child_last_active((select child_a from fx))),
  0,
  'a different parent cannot see another parent''s child activity'
);

select pg_temp.logout();
select is(
  (select count(*)::int from get_child_last_active((select child_a from fx))),
  0,
  'an unauthenticated caller sees nothing'
);

select isnt(
  has_function_privilege('anon', 'get_child_last_active(text)', 'execute'),
  true,
  'anon has no execute grant on get_child_last_active at all'
);

-- ── The gold-minting exploit: claim_push_gold_bonus_child/_parent must reject
--    a caller claiming for someone else's account, and leave that account untouched. ──

insert into player_progress (user_id, gold) select child_b, 1000 from fx;

-- These RPCs authorize via current_app_user_id() (user_identity_map), not auth.uid()
-- directly — a distinct simulated "logged in as child_a" session, unrelated to either parent.
insert into user_identity_map (auth_uid, app_user_id) select child_a_auth, child_a from fx;
select pg_temp.login_as(child_a_auth) from fx;

select throws_ok(
  format('select claim_push_gold_bonus_child(%L)', (select child_b from fx)),
  'P0001', 'not authorized',
  'claiming the child push bonus for someone else''s account is rejected'
);
select is(
  (select gold from player_progress where user_id = (select child_b from fx)),
  1000,
  'the targeted account''s gold is untouched by the rejected attempt'
);

select throws_ok(
  format('select claim_push_gold_bonus_parent(%L)', (select child_b from fx)),
  'P0001', 'not authorized',
  'claiming the parent push bonus for someone else''s account is rejected'
);
select is(
  (select gold from player_progress where user_id = (select child_b from fx)),
  1000,
  'the targeted account''s gold is still untouched after the second rejected attempt'
);

select lives_ok(
  format('select claim_push_gold_bonus_child(%L)', (select child_a from fx)),
  'claiming your own push bonus is still allowed (no push subscription -> null, not an error)'
);

-- ── Dead/never-client-facing RPCs: authenticated must not reach them ──────────

select isnt(
  has_function_privilege('authenticated', 'record_player_event(text,text,integer,jsonb,text)', 'execute'),
  true,
  'authenticated cannot call record_player_event directly (nothing client-facing calls it anymore)'
);
select is(
  has_function_privilege('service_role', 'record_player_event(text,text,integer,jsonb,text)', 'execute'),
  true,
  'service_role can still call record_player_event'
);

select isnt(
  has_function_privilege('authenticated', 'mark_reengagement_sent(text)', 'execute'),
  true,
  'authenticated cannot call mark_reengagement_sent (edge-function/service_role only)'
);

select * from finish();
rollback;
