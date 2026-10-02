-- Fix: execute-due-reassignments-hourly has failed every hour since the 2026-09-22 secret
-- rotation (20260922155630_move_pg_net_and_vault_cron_secrets.sql) with
-- "not authorized" raised from check_reassignment_cron_secret.
--
-- Cause: this one secret was checked in two places with two separate copies:
--   1. pg_cron -> Edge Function header: vault `reassignment_cron_secret` vs. the function's
--      REASSIGNMENT_CRON_SECRET env var. Both were rotated, so they match (function returns
--      500, not 401).
--   2. Edge Function -> RPC: the same env var vs. a bcrypt hash in
--      public.reassignment_cron_secret. The rotation never touched this hash, so it still
--      matched the old (compromised) value and every call was rejected.
--
-- Fix: check against the vault entry directly, so there is one source of truth and the next
-- rotation (vault + Edge Function secret) can't leave a third copy behind. The
-- public.reassignment_cron_secret table is no longer read; it is left in place, not
-- dropped, so this migration is non-destructive.
--
-- Also revokes EXECUTE from public/anon/authenticated on both functions. The only
-- legitimate caller is the execute-due-reassignments Edge Function (service_role), and
-- check_reassignment_cron_secret is otherwise only called inside
-- execute_due_child_reassignments (SECURITY DEFINER, owned by postgres).
--
-- Comparing sha256 digests rather than the raw strings keeps the comparison length-fixed.
-- Plain CREATE OR REPLACE with an unchanged signature, so there is no overload trap.

CREATE OR REPLACE FUNCTION public.check_reassignment_cron_secret(p_secret text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_expected text;
begin
  select decrypted_secret into v_expected from vault.decrypted_secrets where name = 'reassignment_cron_secret';
  if v_expected is null or p_secret is null
     or extensions.digest(p_secret, 'sha256') <> extensions.digest(v_expected, 'sha256') then
    raise exception 'not authorized';
  end if;
end;
$function$;

revoke all on function public.check_reassignment_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_reassignment_cron_secret(text) to service_role;

revoke all on function public.execute_due_child_reassignments(text) from public, anon, authenticated;
grant execute on function public.execute_due_child_reassignments(text) to service_role;
