-- Narrow player_log reads to the owner.
--
-- "player_log: read all" was `for select to authenticated using (true)`. Anyone holding
-- the public anon key can mint an authenticated session with signInAnonymously(), so every
-- player's activity history (user ids are often children's names, plus free-text
-- descriptions) was readable by anyone. Same fix as 20261004160000 for
-- player_weekly_journal.
--
-- Browser readers, all for the signed-in player's own rows:
--   PlayerLog (Journal tab), BoardMapView (cleared-day rewards), Dashboard (training-quest
--   paid-once check).
-- Everything else already bypasses RLS: the admin Deed History now reads through
-- /api/admin-weekly (service role), the parent-daily-summary / detect-streak-reminders /
-- resolve-live-battle edge functions and /api/admin-overview use the service role, and the
-- only SQL functions touching the table (delete_own_family_data, respond_to_trade) are
-- SECURITY DEFINER. No parent view reads it.
--
-- Inserts were already owner-only ("player_log: self insert").

drop policy if exists "player_log: read all" on public.player_log;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'player_log'
      and policyname = 'player_log: read own'
  ) then
    create policy "player_log: read own" on public.player_log
      for select to authenticated
      using (user_id = (select public.current_app_user_id()));
  end if;
end $$;
