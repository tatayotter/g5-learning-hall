-- pgTAP tests for 20261004160000_narrow_journal_and_monsters_read: anon and a
-- bare anonymous-auth session can read neither table; a signed-in child reads
-- only their own weekly journal but still sees other players' curios; a
-- parent (not a player) reads neither.

begin;
create extension if not exists pgtap;
select plan(11);

create temp table fx as
select gen_random_uuid() as parent_id,
       gen_random_uuid() as kid_a_auth,
       gen_random_uuid() as stray_auth,
       -- Fixed names, not random hex: the children name filter reads digits as letters.
       'pgtap_jmr_kida' as kid_a,
       'pgtap_jmr_kidb' as kid_b,
       -- First Sunday of 2099: content_weeks is Sunday-keyed and unique per grade.
       (date '2099-01-01' + ((7 - extract(dow from date '2099-01-01')::int) % 7)) as week_sunday;
grant select on fx to anon, authenticated;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-jmr-parent@test.invalid' from fx;
-- The auth.users signup trigger normally creates this; don't depend on it.
insert into public.parents (id, full_name, phone, status)
select parent_id, 'PGTAP Parent', '09000000000', 'approved' from fx
on conflict (id) do nothing;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key, parent_id)
select kid_a, kid_a, 'x', 'PGTAP Kid A', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10), parent_id from fx;
insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid_b, kid_b, 'x', 'PGTAP Kid B', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id) select kid_a_auth, kid_a from fx;

insert into content_weeks (grade, week_starting_date) select 4, week_sunday from fx;
insert into player_weekly_journal (user_id, content_week_id)
select u, w.id from fx, content_weeks w, unnest(array[fx.kid_a, fx.kid_b]) as u
where w.grade = 4 and w.week_starting_date = fx.week_sunday;

insert into user_monsters (user_id, monster_id) select kid_a, 'solarch' from fx union all select kid_b, 'solarch' from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── anon ──────────────────────────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from player_weekly_journal), 0, 'anon cannot read player_weekly_journal');
select is((select count(*)::int from user_monsters), 0, 'anon cannot read user_monsters');

-- ── Bare anonymous-auth session (no mapped player) ────────────────────────────
reset role;
select pg_temp.login_as(stray_auth) from fx;
set local role authenticated;
select is((select count(*)::int from player_weekly_journal), 0,
  'an unmapped authenticated session cannot read player_weekly_journal');
select is((select count(*)::int from user_monsters), 0,
  'an unmapped authenticated session cannot read user_monsters');

-- ── Signed-in child ───────────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(kid_a_auth) from fx;
set local role authenticated;
select is((select count(*)::int from player_weekly_journal where user_id = (select kid_a from fx)), 1,
  'a child can read their own weekly journal');
select is((select count(*)::int from player_weekly_journal where user_id = (select kid_b from fx)), 0,
  'a child cannot read another player''s weekly journal');
select is((select count(*)::int from user_monsters where user_id = (select kid_a from fx)), 1,
  'a child can read their own curios');
select is((select count(*)::int from user_monsters where user_id = (select kid_b from fx)), 1,
  'a child can still read another player''s curios (profiles, trades, battles)');

-- ── Parent (signed in with real auth, not a player) ───────────────────────────
reset role;
select pg_temp.login_as(parent_id) from fx;
set local role authenticated;
select is((select count(*)::int from player_weekly_journal), 0, 'a parent session cannot read player_weekly_journal');
select is((select count(*)::int from user_monsters), 0, 'a parent session cannot read user_monsters');

-- ── Policy shape ──────────────────────────────────────────────────────────────
reset role;
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename in ('player_weekly_journal', 'user_monsters')
     and cmd in ('SELECT', 'ALL') and qual = 'true'),
  0,
  'neither table has an unconditional read policy'
);

select * from finish();
rollback;
