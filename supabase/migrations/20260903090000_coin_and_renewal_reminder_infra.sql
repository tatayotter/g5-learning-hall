-- Infra for two new automated email sequences (see mail-kit design):
--   1. Coin-pool expiry reminder — Premium parents with unused gold as their
--      yearly pool's reset date approaches (coin_pool_balance resets to
--      10000 on renewal, does NOT roll over — see
--      20260812080000_make_paymongo_webhook_idempotent.sql).
--   2. Renewal reminder — Premium parents whose subscription renews soon.
--
-- Same shape as the existing reengagement-sync pattern (candidate RPC +
-- mark-sent RPC, called by a daily cron via an Edge Function), but the
-- dedup strategy is a "sent for period X" column compared directly against
-- current_period_end, rather than a timestamp-vs-timestamp comparison --
-- current_period_end only changes once a year on renewal, so this can't
-- double-send within a window and needs no interval math to reset.
--
-- Both candidate RPCs are cron-only: no per-caller auth check makes sense
-- here (there's no "current user" for a cron job), so instead of leaving
-- them PUBLIC-executable like the existing get_reengagement_candidates,
-- EXECUTE is revoked from anon/authenticated and granted only to
-- service_role, which is how the Edge Function actually calls them.

alter table public.subscriptions
  add column if not exists last_coin_reminder_for_period timestamptz,
  add column if not exists last_renewal_reminder_for_period timestamptz;

create or replace function public.get_coin_expiry_candidates()
returns table(parent_id uuid, parent_email text, parent_first_name text, coin_pool_balance integer, current_period_end timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  select s.parent_id, u.email::text, p.full_name, s.coin_pool_balance, s.current_period_end
  from public.subscriptions s
  join public.parents p on p.id = s.parent_id
  join auth.users u on u.id = p.id
  where s.status = 'active'
    and p.status = 'approved'
    and p.marketing_opt_in = true
    and s.coin_pool_balance > 0
    and s.current_period_end is not null
    and s.current_period_end > now()
    and s.current_period_end <= now() + interval '30 days'
    and (s.last_coin_reminder_for_period is null or s.last_coin_reminder_for_period <> s.current_period_end)
    and u.email is not null;
$$;

revoke execute on function public.get_coin_expiry_candidates() from public, anon, authenticated;
grant execute on function public.get_coin_expiry_candidates() to service_role;

create or replace function public.mark_coin_reminder_sent(p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.subscriptions
  set last_coin_reminder_for_period = current_period_end
  where parent_id = p_parent_id;
end;
$$;

revoke execute on function public.mark_coin_reminder_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_coin_reminder_sent(uuid) to service_role;

create or replace function public.get_renewal_reminder_candidates()
returns table(parent_id uuid, parent_email text, parent_first_name text, current_period_end timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  select s.parent_id, u.email::text, p.full_name, s.current_period_end
  from public.subscriptions s
  join public.parents p on p.id = s.parent_id
  join auth.users u on u.id = p.id
  where s.status = 'active'
    and p.status = 'approved'
    and p.marketing_opt_in = true
    and s.current_period_end is not null
    and s.current_period_end > now()
    and s.current_period_end <= now() + interval '14 days'
    and (s.last_renewal_reminder_for_period is null or s.last_renewal_reminder_for_period <> s.current_period_end)
    and u.email is not null;
$$;

revoke execute on function public.get_renewal_reminder_candidates() from public, anon, authenticated;
grant execute on function public.get_renewal_reminder_candidates() to service_role;

create or replace function public.mark_renewal_reminder_sent(p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.subscriptions
  set last_renewal_reminder_for_period = current_period_end
  where parent_id = p_parent_id;
end;
$$;

revoke execute on function public.mark_renewal_reminder_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_renewal_reminder_sent(uuid) to service_role;
