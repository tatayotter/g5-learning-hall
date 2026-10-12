-- pgTAP tests for 20261006030000_generalize_family_accounts.sql:
--   1. The family password path is gone (table and functions dropped).
--   2. children.show_crown exists and is exposed on children_public.
--   3. link_verified_identity only links with a real credential: the PIN for a
--      child, nothing without one. The old function let a family account be
--      claimed with no credential at all if its family password was missing.
--   4. account_created_at reads children.created_at, so a converted account
--      keeps its original age for the 48-hour push notification hold.

begin;
create extension if not exists pgtap;
select plan(9);

create temp table fx as
select
  gen_random_uuid() as parent_id,
  gen_random_uuid() as fresh_auth,
  -- Fixed names, not random hex: the children name filter reads digits as
  -- letters, so a random suffix can be rejected. Rolled back, so no collision.
  'pgtap_kid_crown' as child_id;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-crown-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx;

insert into children (id, parent_id, username, pin_hash, full_name, grade, school_name, avatar, referral_key, created_at)
select child_id, parent_id, child_id, extensions.crypt('1234', extensions.gen_salt('bf')),
       'PGTAP Crown Kid', 'Grade 5', 'Test School', 'default', substr(md5(random()::text), 1, 10),
       '2026-07-16 00:00:00+00'
from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── 1. Family password path removed ─────────────────────────────────────────

select hasnt_table('public', 'family_credentials', 'family_credentials is dropped');
select hasnt_function('public', 'verify_family_login', 'verify_family_login is dropped');
select hasnt_function('public', 'set_family_password', 'set_family_password is dropped');

-- ── 2. Crown column ─────────────────────────────────────────────────────────

select has_column('public', 'children_public', 'show_crown', 'children_public exposes show_crown');
select is(
  (select show_crown from children where id = (select child_id from fx)),
  false,
  'show_crown defaults to false for a new child'
);

-- ── 3. Linking needs a real credential ──────────────────────────────────────

select pg_temp.login_as(fresh_auth) from fx;
select is(
  link_verified_identity((select child_id from fx), null),
  false,
  'a child account cannot be claimed without a credential'
);
select is(
  link_verified_identity((select child_id from fx), '9999'),
  false,
  'a wrong PIN is refused'
);
select is(
  link_verified_identity((select child_id from fx), '1234'),
  true,
  'the correct PIN links the account'
);

-- ── 4. Account age comes from the children row ──────────────────────────────

select is(
  account_created_at((select child_id from fx)),
  '2026-07-16 00:00:00+00'::timestamptz,
  'account_created_at returns children.created_at'
);

select * from finish();
rollback;
