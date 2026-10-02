-- pgTAP tests for 20261002130000_checkout_keeps_active_premium: starting a
-- checkout must never downgrade an already-active Premium subscription before
-- payment, and the payment webhook must apply the staged purchase
-- (addon_children + amount_php) exactly once.

begin;
create extension if not exists pgtap;
select plan(12);

-- Fixture: one fresh parent (real auth.users row; the
-- on_auth_user_created_insert_parent trigger creates the parents row).
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

create or replace function pg_temp.sub_state() returns text as $$
  select s.status || '|' || s.addon_children || '|' || coalesce(s.amount_php::text, 'null')
         || '|' || coalesce(s.pending_addon_children::text, 'null')
  from public.subscriptions s, fx where s.parent_id = fx.parent_id;
$$ language sql;

select pg_temp.login_as(parent_id) from fx;

-- ── First purchase (no active subscription): unchanged behavior ──────────────
select public.create_checkout_session(1, 348, (select checkout_1 from fx));
select is(pg_temp.sub_state(), 'pending|1|348|1',
  'first checkout creates a pending row with the requested slots staged');
select is(public.max_children_for_parent((select parent_id from fx)), 1,
  'pending (unpaid) first purchase still gets the free limit');

select ok(public.handle_paymongo_webhook((select checkout_1 from fx), (select payment_1 from fx)),
  'webhook activates the first purchase');
select is(pg_temp.sub_state(), 'active|1|348|null',
  'payment applies the staged slots and clears the staging columns');
select is(public.max_children_for_parent((select parent_id from fx)), 4,
  'Premium with 1 extra slot allows 4 children');
select is(public.handle_paymongo_webhook((select checkout_1 from fx), (select payment_1 from fx)), false,
  'redelivered webhook for the same payment is a no-op');

-- ── Active parent starts an add-slot checkout: must stay Premium ─────────────
update public.subscriptions set coin_pool_balance = 1234 from fx where subscriptions.parent_id = fx.parent_id;
select public.create_checkout_session(2, 447, (select checkout_2 from fx));
select is(pg_temp.sub_state(), 'active|1|348|2',
  'starting a checkout keeps an active subscription active with its paid-for slots');
select is(public.max_children_for_parent((select parent_id from fx)), 4,
  'child limit is unchanged while the new checkout is unpaid');
select is((select coin_pool_balance from public.subscriptions s, fx where s.parent_id = fx.parent_id), 1234,
  'coin pool is untouched by starting a checkout');

-- ── Paying the add-slot checkout applies it ──────────────────────────────────
select ok(public.handle_paymongo_webhook((select checkout_2 from fx), (select payment_2 from fx)),
  'webhook activates the add-slot purchase');
select is(pg_temp.sub_state(), 'active|2|447|null',
  'paid add-slot purchase updates slots and amount (amount feeds the CAPI revenue event)');
select is(public.max_children_for_parent((select parent_id from fx)), 5,
  'Premium with 2 extra slots allows 5 children');

select * from finish();
rollback;
