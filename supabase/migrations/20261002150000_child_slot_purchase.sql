-- Buying an extra child slot is its own one-time ₱99 purchase, kept forever.
--
-- Before: "Add a Child Slot" reused the yearly Premium checkout
-- (create_checkout_session with addon_children + 1), so a Premium parent paid
-- ₱249 + slots again, their year restarted from the payment date, and the
-- coin pool reset to 10,000. Product rules (2026-10-02):
--   - a slot is a one-time ₱99 purchase that the account keeps forever; it
--     takes effect on payment and leaves the billing date and coin pool alone;
--   - renewing Premium is ₱249 only (slots are never re-charged);
--   - if Premium lapses, Premium features lock but purchased slots stay:
--     the child limit becomes 1 (free) + purchased slots.
--
-- Modeled on the SEC shop: one row per slot checkout in
-- child_slot_purchases (so an abandoned or duplicate checkout can never leave
-- a parent paying without receiving a slot), a create RPC called by
-- /api/create-child-slot-checkout, and a service-role-only webhook RPC
-- dispatched by app/api/paymongo-webhook on metadata.type = 'child_slot'.

create table if not exists public.child_slot_purchases (
  paymongo_checkout_id text primary key,
  parent_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  amount_php integer not null check (amount_php > 0),
  paymongo_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_child_slot_purchases_parent on public.child_slot_purchases using btree (parent_id);

-- The old create_checkout_session wrote the *requested* slot count onto a
-- row before payment. Under the new limit below a never-paid row would then
-- grant unpaid slots, so clear those first. (Production had none on
-- 2026-10-02; this guards the deploy regardless. Idempotent.)
update public.subscriptions
set addon_children = 0, updated_at = now()
where status <> 'active' and paymongo_payment_id is null and addon_children > 0;

-- Purchased slots count whether or not Premium is active.
--   Premium active: 3 included + slots (cap 5)  — unchanged
--   Premium lapsed / never bought: 1 free + slots (was a flat 1)
-- Same signature/return type, so CREATE OR REPLACE is safe.
create or replace function public.max_children_for_parent(p_parent_id uuid)
returns integer
language sql
security definer
set search_path to 'public'
as $function$
  select case
    when exists (
      select 1 from public.subscriptions s
      where s.parent_id = p_parent_id and s.status = 'active'
    )
    then least(5, 3 + coalesce((select addon_children from public.subscriptions where parent_id = p_parent_id), 0))
    else 1 + coalesce((select addon_children from public.subscriptions where parent_id = p_parent_id), 0)
  end;
$function$;

alter table public.child_slot_purchases enable row level security;

-- Parents can see their own slot purchases. No insert/update/delete policy:
-- rows are only ever written by the SECURITY DEFINER functions below.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'child_slot_purchases'
      and policyname = 'child_slot_purchases_select_own'
  ) then
    create policy child_slot_purchases_select_own
      on public.child_slot_purchases for select
      to authenticated
      using (parent_id = auth.uid());
  end if;
end $$;

-- Called by /api/create-child-slot-checkout (as the signed-in parent) after it
-- has created the PayMongo session. Re-checks eligibility server-side.
create or replace function public.create_child_slot_checkout(p_checkout_id text, p_amount_php integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_addons integer;
begin
  select addon_children into v_addons
  from public.subscriptions
  where parent_id = auth.uid() and status = 'active';

  if not found then
    raise exception 'an active Premium subscription is required to add a child slot';
  end if;
  if v_addons >= 2 then
    raise exception 'this account already has the maximum number of child slots';
  end if;

  insert into public.child_slot_purchases (paymongo_checkout_id, parent_id, amount_php)
  values (p_checkout_id, auth.uid(), p_amount_php)
  on conflict (paymongo_checkout_id) do nothing;
end;
$function$;

revoke execute on function public.create_child_slot_checkout(text, integer) from public, anon;
grant execute on function public.create_child_slot_checkout(text, integer) to authenticated, service_role;

-- Called only by app/api/paymongo-webhook (service role) on a verified
-- checkout_session.payment.paid event. Adds exactly one slot per paid
-- checkout; never touches current_period_end or coin_pool_balance.
-- Returns true when this delivery applied the slot, false on a redelivery.
create or replace function public.handle_child_slot_webhook(p_checkout_id text, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent uuid;
begin
  update public.child_slot_purchases
  set status = 'paid', paymongo_payment_id = p_payment_id, paid_at = now()
  where paymongo_checkout_id = p_checkout_id and status = 'pending'
  returning parent_id into v_parent;

  if v_parent is null then
    if exists (select 1 from public.child_slot_purchases where paymongo_checkout_id = p_checkout_id) then
      return false; -- already applied (PayMongo redelivery)
    end if;
    raise exception 'no pending child slot purchase for checkout %', p_checkout_id;
  end if;

  -- Capped at 2 extra slots (max_children_for_parent = least(5, 3 + addons)).
  update public.subscriptions
  set addon_children = least(addon_children + 1, 2), updated_at = now()
  where parent_id = v_parent;

  return true;
end;
$function$;

revoke execute on function public.handle_child_slot_webhook(text, text) from public, anon, authenticated;
grant execute on function public.handle_child_slot_webhook(text, text) to service_role;
