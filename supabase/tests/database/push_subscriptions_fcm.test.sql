-- pgTAP tests for 20261005010000_push_subscriptions_fcm: FCM rows need no
-- web keys, web rows still do, unknown kinds are rejected, and the existing
-- owner RLS covers FCM rows (a child saves its own token, not someone else's).

begin;
create extension if not exists pgtap;
select plan(7);

create temp table fx as
select gen_random_uuid() as kid_auth,
       gen_random_uuid() as other_auth,
       -- Fixed names, not random hex: the children name filter reads digits as letters.
       'pgtap_fcm_kid' as kid,
       'pgtap_fcm_other' as other;
grant select on fx to anon, authenticated;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid, kid, 'x', 'PGTAP Push Kid', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx
union all
select other, other, 'x', 'PGTAP Push Other', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id)
select kid_auth, kid from fx union all select other_auth, other from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── Constraints (as table owner) ──────────────────────────────────────────────
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'push_subscriptions' and column_name = 'kind'),
  '''web''::text',
  'kind defaults to web, so existing web inserts are unchanged'
);

select lives_ok(
  $$ insert into push_subscriptions (owner_kind, owner_id, kind, endpoint)
     values ('app_user', 'pgtap_fcm_kid', 'fcm', 'pgtap-fcm-token-owner') $$,
  'an fcm row needs no p256dh/auth_key'
);

select throws_ok(
  $$ insert into push_subscriptions (owner_kind, owner_id, kind, endpoint)
     values ('app_user', 'pgtap_fcm_kid', 'web', 'https://push.example/pgtap-no-keys') $$,
  '23514',
  null,
  'a web row without keys is rejected'
);

select throws_ok(
  $$ insert into push_subscriptions (owner_kind, owner_id, kind, endpoint)
     values ('app_user', 'pgtap_fcm_kid', 'apns', 'pgtap-apns-token') $$,
  '23514',
  null,
  'an unknown kind is rejected'
);

-- ── RLS: the existing owner policies apply to fcm rows ────────────────────────
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select lives_ok(
  $$ insert into push_subscriptions (owner_kind, owner_id, kind, endpoint)
     values ('app_user', 'pgtap_fcm_kid', 'fcm', 'pgtap-fcm-token-self') $$,
  'a child can save an fcm token for itself'
);

select throws_ok(
  $$ insert into push_subscriptions (owner_kind, owner_id, kind, endpoint)
     values ('app_user', 'pgtap_fcm_other', 'fcm', 'pgtap-fcm-token-spoof') $$,
  '42501',
  null,
  'a child cannot save an fcm token for another child'
);

select is(
  (select count(*)::int from push_subscriptions where kind = 'fcm'),
  2,
  'a child sees only its own fcm rows'
);

select * from finish();
rollback;
