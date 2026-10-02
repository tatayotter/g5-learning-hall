-- pgTAP tests for:
--   1. 20261002150000_child_slot_purchase: a ₱99 child slot adds exactly one
--      slot on payment and never touches the billing date or coin pool.
--   2. 20261002140000_lock_down_payment_webhook_rpcs: no payment webhook
--      handler is callable by anon/authenticated (they could otherwise mark
--      their own checkout as paid from the browser).

begin;
create extension if not exists pgtap;
select plan(16);

create temp table fx as
select gen_random_uuid() as parent_id,
       'pgtap_slot_1_' || substr(md5(random()::text), 1, 10) as checkout_1,
       'pgtap_slot_2_' || substr(md5(random()::text), 1, 10) as checkout_2,
       'pgtap_slot_3_' || substr(md5(random()::text), 1, 10) as checkout_3;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-slot-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select pg_temp.login_as(parent_id) from fx;

-- ── Not Premium yet: no slot purchase allowed ────────────────────────────────
select throws_ok(
  format('select public.create_child_slot_checkout(%L, 99)', (select checkout_1 from fx)),
  'an active Premium subscription is required to add a child slot',
  'a non-Premium parent cannot start a child-slot checkout'
);

-- Active Premium, 0 extra slots, partway through the year, some coins spent.
insert into public.subscriptions (parent_id, status, addon_children, amount_php, coin_pool_balance,
                                  current_period_start, current_period_end)
select parent_id, 'active', 0, 249, 4321, '2026-08-12', '2027-08-12' from fx;

-- ── Buy one slot ─────────────────────────────────────────────────────────────
select lives_ok(
  format('select public.create_child_slot_checkout(%L, 99)', (select checkout_1 from fx)),
  'an active Premium parent can start a child-slot checkout'
);
select is((select status from public.child_slot_purchases where paymongo_checkout_id = (select checkout_1 from fx)), 'pending',
  'the slot purchase starts pending');
select is((select addon_children from public.subscriptions s, fx where s.parent_id = fx.parent_id), 0,
  'starting a slot checkout does not add the slot before payment');

select ok(public.handle_child_slot_webhook((select checkout_1 from fx), 'pay_pgtap_1'),
  'webhook applies the paid slot');
select is((select addon_children from public.subscriptions s, fx where s.parent_id = fx.parent_id), 1,
  'paid slot adds exactly one child slot');
select is(public.max_children_for_parent((select parent_id from fx)), 4,
  'Premium with 1 extra slot allows 4 children');
select is(
  (select current_period_end::date::text || '|' || coin_pool_balance from public.subscriptions s, fx where s.parent_id = fx.parent_id),
  '2027-08-12|4321',
  'billing date and coin pool are untouched by a slot purchase');
select is(public.handle_child_slot_webhook((select checkout_1 from fx), 'pay_pgtap_1'), false,
  'redelivered webhook does not add a second slot');

-- ── Second slot, then the cap ────────────────────────────────────────────────
select public.create_child_slot_checkout((select checkout_2 from fx), 99);
select ok(public.handle_child_slot_webhook((select checkout_2 from fx), 'pay_pgtap_2'),
  'second slot applies');
select is(public.max_children_for_parent((select parent_id from fx)), 5,
  'Premium with 2 extra slots allows 5 children');
select throws_ok(
  format('select public.create_child_slot_checkout(%L, 99)', (select checkout_3 from fx)),
  'this account already has the maximum number of child slots',
  'a third slot cannot be bought'
);

-- ── Premium lapses: features lock, purchased slots stay ───────────────────────
update public.subscriptions set status = 'expired' from fx where subscriptions.parent_id = fx.parent_id;
select is(public.max_children_for_parent((select parent_id from fx)), 3,
  'lapsed Premium keeps purchased slots: 1 free + 2 slots');
select is((select addon_children from public.subscriptions s, fx where s.parent_id = fx.parent_id), 2,
  'purchased slots are not removed when Premium lapses');

-- ── Webhook handlers are server-only ─────────────────────────────────────────
select ok(
  not has_function_privilege('authenticated', 'public.handle_child_slot_webhook(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.handle_child_slot_webhook(text, text)', 'EXECUTE'),
  'handle_child_slot_webhook is not callable by anon/authenticated');
select ok(
  not has_function_privilege('authenticated', 'public.handle_paymongo_webhook(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.handle_paymongo_webhook(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.handle_sec_purchase_webhook(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.handle_sec_purchase_webhook(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.handle_donation_webhook(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.handle_donation_webhook(text)', 'EXECUTE'),
  'existing payment webhook handlers are not callable by anon/authenticated');

select * from finish();
rollback;
