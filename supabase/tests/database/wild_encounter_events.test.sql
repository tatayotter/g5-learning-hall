-- pgTAP tests for 20261004090000_wild_curio_persistence_and_events: players
-- can log their own wild encounter events but not anyone else's, can't read
-- the table, and only known event names are accepted. Also checks the
-- pending curio column a player saves on their own battle state.

begin;
create extension if not exists pgtap;
select plan(8);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_we_' || substr(md5(random()::text), 1, 8) as kid,
       'pgtap_we_other_' || substr(md5(random()::text), 1, 8) as other_kid;
grant select on fx to authenticated;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid, kid, 'x', 'PGTAP Wild Kid', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into user_battle_state (user_id) select kid from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

-- ── Own events: allowed ───────────────────────────────────────────────────────
select lives_ok(
  $$ insert into wild_encounter_events (user_id, event, correct) select kid, 'scroll_answered', true from fx $$,
  'a player can log their own scroll answer'
);
select lives_ok(
  $$ insert into wild_encounter_events (user_id, event, monster_id, quality, level, attempts_left, pity)
     select kid, 'spawned', 'emberwyrm', 'perfect', 5, 3, false from fx $$,
  'a player can log their own spawn'
);

-- ── Someone else's events: rejected ───────────────────────────────────────────
select throws_ok(
  $$ insert into wild_encounter_events (user_id, event) select other_kid, 'caught' from fx $$,
  '42501', null,
  'a player cannot log events for another player'
);

-- ── Unknown event / quality: rejected ─────────────────────────────────────────
select throws_ok(
  $$ insert into wild_encounter_events (user_id, event) select kid, 'free_legendary' from fx $$,
  '23514', null,
  'an unknown event name is rejected'
);
select throws_ok(
  $$ insert into wild_encounter_events (user_id, event, quality) select kid, 'spawned', 'mythic' from fx $$,
  '23514', null,
  'an unknown quality is rejected'
);

-- ── Players can't read the table ──────────────────────────────────────────────
select is(
  (select count(*)::int from wild_encounter_events),
  0,
  'a player cannot read wild encounter events, even their own'
);

-- ── Pending curio is saved on the player's own battle state ──────────────────
update user_battle_state set pending_wild_curio = '{"monster_id":"emberwyrm","attempts_left":2}'::jsonb
where user_id = (select kid from fx);

reset role;

select is(
  (select pending_wild_curio ->> 'attempts_left' from user_battle_state b, fx where b.user_id = fx.kid),
  '2',
  'a player can save their pending wild curio'
);
select is(
  (select count(*)::int from wild_encounter_events e, fx where e.user_id = fx.kid),
  2,
  'exactly the two allowed events were recorded'
);

select * from finish();
rollback;
