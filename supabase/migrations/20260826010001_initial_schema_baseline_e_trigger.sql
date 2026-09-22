-- Initial schema baseline, part E of D (yes -- the fifth file for a "part D of D" baseline;
-- see the note below): the on_auth_user_created_insert_parent trigger on auth.users.
--
-- See part A (20260806230001_initial_schema_baseline_a_tables.sql) for the full rationale,
-- versioning note, and idempotency notes shared by this whole baseline.
--
-- Why this file lives HERE, dated right after 20260826010000_auto_approve_parents.sql,
-- instead of alongside the rest of the baseline back at 2026080623000x: this trigger calls
-- public.handle_new_parent_signup(), and that function isn't defined until
-- 20260826010000_auto_approve_parents.sql (a real, pre-existing migration, not part of this
-- baseline). CREATE TRIGGER resolves its function reference immediately, not lazily, so
-- creating this trigger any earlier would fail a from-scratch replay with "function
-- handle_new_parent_signup() does not exist". This is the only piece of the baseline that
-- couldn't be grouped with the rest for that reason.
--
-- Idempotency: guarded by an explicit existence check against pg_trigger, since Postgres has
-- no CREATE TRIGGER IF NOT EXISTS.

do $t$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_insert_parent' and not tgisinternal) then
    create trigger on_auth_user_created_insert_parent after insert on auth.users
      for each row execute function handle_new_parent_signup();
  end if;
end $t$;
