-- pgTAP tests for 20261003100000_battle_training_completion: the battle
-- training bonus pays 100 gold exactly once per player, only to the caller's
-- own account, and the completion table can't be written from the client.

begin;
create extension if not exists pgtap;
select plan(9);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_bt_' || substr(md5(random()::text), 1, 8) as kid;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid, kid, 'x', 'PGTAP Battle Kid', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;

insert into player_progress (user_id, gold) select kid, 40 from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── No identity: rejected ─────────────────────────────────────────────────────
select pg_temp.login_as(gen_random_uuid());
select throws_ok(
  'select public.complete_battle_training()',
  'P0001', 'not authorized',
  'a session with no mapped player cannot complete battle training'
);

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
select pg_temp.login_as(kid_auth) from fx;

-- ── First completion pays once ────────────────────────────────────────────────
select is(
  (public.complete_battle_training() ->> 'awarded')::boolean, true,
  'the first completion awards the bonus'
);
select is(
  (select gold from player_progress p, fx where p.user_id = fx.kid), 140,
  'the first completion adds exactly 100 gold'
);
select is(
  (select count(*)::int from battle_training_completions b, fx where b.user_id = fx.kid), 1,
  'completion is recorded'
);

-- ── Second completion pays nothing ────────────────────────────────────────────
select is(
  (public.complete_battle_training() ->> 'awarded')::boolean, false,
  'a repeat completion does not award again'
);
select is(
  (public.complete_battle_training() ->> 'gold')::int, 140,
  'gold is unchanged after repeat completions'
);

-- ── The client can't write the table directly ─────────────────────────────────
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'battle_training_completions' and cmd <> 'SELECT'),
  0,
  'battle_training_completions has no insert/update/delete policies'
);
select isnt(
  has_function_privilege('anon', 'public.complete_battle_training()', 'execute'),
  true,
  'anon cannot call complete_battle_training'
);
select is(
  has_function_privilege('authenticated', 'public.complete_battle_training()', 'execute'),
  true,
  'signed-in players (incl. anonymous child sessions) can call complete_battle_training'
);

select * from finish();
rollback;
