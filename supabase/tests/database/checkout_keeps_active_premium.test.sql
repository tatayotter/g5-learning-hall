-- pgTAP tests for 20261002130000_checkout_keeps_active_premium:
--   - a yearly Premium checkout never downgrades an already-active
--     subscription before payment;
--   - it never touches purchased child slots (slots are a separate one-time
--     purchase kept forever), including across a renewal;
--   - the webhook applies the staged amount exactly once.

begin;
create extension if not exists pgtap;
select plan(11);

create temp table fx as
select gen_random_uuid() as parent_id,
       'pgtap_cs_1_' || substr(md5(random()::text), 1, 10) as checkout_1,
       'pgtap_cs_2_' || substr(md5(random()::text), 1, 10) as checkout_2,
       'pgtap_pay_1_' || substr(md5(random()::text), 1, 10) as payment_1,
       'pgtap_pay_2_' || substr(md5(random()::text), 1, 10) as payment_2;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-checkout-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- status | addon_children | amount_php | coin_pool_balance
create or replace function pg_temp.sub_state() returns text as $$
  select s.status || '|' || s.addon_children || '|' || coalesce(s.amount_php::text, 'null') || '|' || s.coin_pool_balance
  from public.subscriptions s, fx where s.parent_id = fx.parent_id;
$$ language sql;

select pg_temp.login_as(parent_id) from fx;

select throws_ok(
  format('select public.create_checkout_session(1, 348, %L)', (select checkout_1 from fx)),
  'child slots are purchased separately',
  'a yearly checkout cannot carry child slots');

-- ── First purchase ───────────────────────────────────────────────────────────
select public.create_checkout_session(0, 249, (select checkout_1 from fx));
select is(pg_temp.sub_state(), 'pending|0|249|0', 'first checkout creates a pending row');
select ok(public.handle_paymongo_webhook((select checkout_1 from fx), (select payment_1 from fx)),
  'webhook activates the first purchase');
select is(pg_temp.sub_state(), 'active|0|249|10000', 'payment activates Premium with a full coin pool');
select is(public.handle_paymongo_webhook((select checkout_1 from fx), (select payment_1 from fx)), false,
  'redelivered webhook for the same payment is a no-op');

-- Simulate two purchased slots and some coins spent.
update public.subscriptions set addon_children = 2, coin_pool_balance = 1234 from fx where subscriptions.parent_id = fx.parent_id;

-- ── Renewal while still active: stays Premium, slots untouched ───────────────
select public.create_checkout_session(0, 249, (select checkout_2 from fx));
select is(pg_temp.sub_state(), 'active|2|249|1234',
  'starting a renewal keeps Premium active, slots and coins untouched');
select is(public.max_children_for_parent((select parent_id from fx)), 5,
  'child limit is unchanged while the renewal is unpaid');
select is((select pending_amount_php from public.subscriptions s, fx where s.parent_id = fx.parent_id), 249::numeric,
  'the renewal amount is staged');

select ok(public.handle_paymongo_webhook((select checkout_2 from fx), (select payment_2 from fx)),
  'webhook applies the renewal');
select is(pg_temp.sub_state(), 'active|2|249|10000',
  'renewal keeps purchased slots and refreshes the coin pool');
select ok((select pending_amount_php is null from public.subscriptions s, fx where s.parent_id = fx.parent_id),
  'staged amount is cleared after payment');

select * from finish();
rollback;
