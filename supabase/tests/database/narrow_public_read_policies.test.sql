-- pgTAP tests for 20261004140000_narrow_public_read_policies: anon can read
-- none of curio_eggs / user_subclass_profiles / leaderboard_reactions /
-- grade_content_owners; an auth session with no mapped player can't either;
-- a signed-in child sees only their own eggs but still sees other players'
-- guild profiles and leaderboard reaction targets (never who reacted); a
-- parent sees their own child's guild profile and no one else's.

begin;
create extension if not exists pgtap;
select plan(15);

create temp table fx as
select gen_random_uuid() as parent_id,
       gen_random_uuid() as kid_a_auth,
       gen_random_uuid() as kid_b_auth,
       gen_random_uuid() as stray_auth,
       -- Fixed names, not random hex: the children name filter reads digits as letters.
       'pgtap_npr_kida' as kid_a,
       'pgtap_npr_kidb' as kid_b;
grant select on fx to anon, authenticated;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-npr-parent@test.invalid' from fx;
-- The auth.users signup trigger normally creates this; don't depend on it.
insert into public.parents (id, full_name, phone, status)
select parent_id, 'PGTAP Parent', '09000000000', 'approved' from fx
on conflict (id) do nothing;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key, parent_id)
select kid_a, kid_a, 'x', 'PGTAP Kid A', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10), parent_id from fx;
insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid_b, kid_b, 'x', 'PGTAP Kid B', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id)
select kid_a_auth, kid_a from fx union all select kid_b_auth, kid_b from fx;

insert into user_subclass_profiles (user_id) select kid_a from fx union all select kid_b from fx;
insert into curio_eggs (user_id, egg_species_id, element)
select kid_a, 'solarch', 'light' from fx union all select kid_b, 'solarch', 'light' from fx;
insert into leaderboard_reactions (from_user_id, to_user_id, emoji) select kid_b, kid_a, 'clap' from fx;
insert into grade_content_owners (user_id, grade) select kid_a, 4 from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── anon ──────────────────────────────────────────────────────────────────────
set local role anon;

select is((select count(*)::int from curio_eggs), 0, 'anon cannot read curio_eggs');
select is((select count(*)::int from user_subclass_profiles), 0, 'anon cannot read user_subclass_profiles');
select is((select count(*)::int from grade_content_owners), 0, 'anon cannot read grade_content_owners');
select throws_ok('select to_user_id from leaderboard_reactions', '42501', null,
  'anon has no SELECT privilege on leaderboard_reactions');

-- ── Auth session with no mapped player (e.g. a bare anonymous sign-in) ────────
reset role;
select pg_temp.login_as(stray_auth) from fx;
set local role authenticated;

select is((select count(*)::int from user_subclass_profiles), 0,
  'an unmapped session cannot read user_subclass_profiles');
select is((select count(*)::int from (select to_user_id from leaderboard_reactions) x), 0,
  'an unmapped session cannot read leaderboard_reactions');

-- ── Signed-in child ───────────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(kid_a_auth) from fx;
set local role authenticated;

select is((select count(*)::int from curio_eggs where user_id = (select kid_a from fx)), 1,
  'a child can read their own eggs');
select is((select count(*)::int from curio_eggs where user_id = (select kid_b from fx)), 0,
  'a child cannot read another player''s eggs');
select is((select count(*)::int from user_subclass_profiles where user_id = (select kid_b from fx)), 1,
  'a child can still read another player''s guild profile');
select is((select count(*)::int from grade_content_owners), 0,
  'a child cannot read grade_content_owners');
select is((select count(*)::int from leaderboard_reactions where to_user_id = (select kid_a from fx)), 1,
  'a child can still count leaderboard reactions');
select throws_ok('select from_user_id from leaderboard_reactions', '42501', null,
  'a child cannot see who sent a leaderboard reaction');
select lives_ok(
  $$ insert into leaderboard_reactions (from_user_id, to_user_id, emoji) select kid_a, kid_b, 'clap' from fx $$,
  'a child can still send a leaderboard reaction'
);

-- ── Parent ────────────────────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(parent_id) from fx;
set local role authenticated;

select is((select count(*)::int from user_subclass_profiles where user_id = (select kid_a from fx)), 1,
  'a parent can read their own child''s guild profile');
select is((select count(*)::int from user_subclass_profiles where user_id = (select kid_b from fx)), 0,
  'a parent cannot read another child''s guild profile');

reset role;
select * from finish();
rollback;
