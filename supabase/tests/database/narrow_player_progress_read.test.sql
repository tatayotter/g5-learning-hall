-- pgTAP tests for 20261004150000_narrow_player_progress_read: anon and a bare
-- anonymous-auth session can't read player_progress; a signed-in child can
-- read their own row and other players' rows (leaderboard, profiles); a parent
-- can read their own child's row and no one else's.

begin;
create extension if not exists pgtap;
select plan(7);

create temp table fx as
select gen_random_uuid() as parent_id,
       gen_random_uuid() as kid_a_auth,
       gen_random_uuid() as stray_auth,
       -- Fixed names, not random hex: the children name filter reads digits as letters.
       'pgtap_ppr_kida' as kid_a,
       'pgtap_ppr_kidb' as kid_b;
grant select on fx to anon, authenticated;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-ppr-parent@test.invalid' from fx;
-- The auth.users signup trigger normally creates this; don't depend on it.
insert into public.parents (id, full_name, phone, status)
select parent_id, 'PGTAP Parent', '09000000000', 'approved' from fx
on conflict (id) do nothing;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key, parent_id)
select kid_a, kid_a, 'x', 'PGTAP Kid A', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10), parent_id from fx;
insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid_b, kid_b, 'x', 'PGTAP Kid B', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id) select kid_a_auth, kid_a from fx;

insert into player_progress (user_id) select kid_a from fx union all select kid_b from fx
on conflict (user_id) do nothing;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── anon ──────────────────────────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from player_progress), 0, 'anon cannot read player_progress');

-- ── Bare anonymous-auth session (no mapped player, not a parent) ──────────────
reset role;
select pg_temp.login_as(stray_auth) from fx;
set local role authenticated;
select is((select count(*)::int from player_progress), 0,
  'an unmapped authenticated session cannot read player_progress');

-- ── Signed-in child ───────────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(kid_a_auth) from fx;
set local role authenticated;
select is((select count(*)::int from player_progress where user_id = (select kid_a from fx)), 1,
  'a child can read their own progress');
select is((select count(*)::int from player_progress where user_id = (select kid_b from fx)), 1,
  'a child can still read another player''s progress (leaderboard, profiles)');

-- ── Parent ────────────────────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(parent_id) from fx;
set local role authenticated;
select is((select count(*)::int from player_progress where user_id = (select kid_a from fx)), 1,
  'a parent can read their own child''s progress');
select is((select count(*)::int from player_progress where user_id = (select kid_b from fx)), 0,
  'a parent cannot read another child''s progress');

-- ── Policy shape ──────────────────────────────────────────────────────────────
reset role;
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'player_progress' and cmd in ('SELECT', 'ALL') and qual = 'true'),
  0,
  'player_progress has no unconditional read policy'
);

select * from finish();
rollback;
