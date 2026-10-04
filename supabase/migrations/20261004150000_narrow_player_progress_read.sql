-- Narrow player_progress reads from "any authenticated session" to signed-in
-- players and a child's own parent.
--
-- "player_progress: read all" was `for select to authenticated using (true)`.
-- Anyone holding the public anon key can mint an authenticated session with
-- signInAnonymously(), so in practice every player's level/xp/gold, lifetime
-- counters and achievements were readable by anyone.
--
-- Readers that still need cross-player reads: the leaderboard
-- (lib/leaderboard), HeroProfile and PlayerStatsPopup. Parents read their own
-- children's rows (ChildProgressPanel, ChildComparisonPanel). "Signed-in
-- player" means current_app_user_id() resolves: both splash login paths call
-- link_verified_identity before the dashboard loads. The admin ToolsSection
-- now reads through /api/admin-weekly (service role) instead of the browser.
--
-- Every database function that reads or writes this table is SECURITY
-- DEFINER, so none of them depend on this policy.

drop policy if exists "player_progress: read all" on public.player_progress;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'player_progress'
      and policyname = 'player_progress: read as player or parent'
  ) then
    create policy "player_progress: read as player or parent" on public.player_progress
      for select to authenticated
      using (
        (select public.current_app_user_id()) is not null
        or exists (
          select 1 from public.children c
          where c.id = player_progress.user_id and c.parent_id = (select auth.uid())
        )
      );
  end if;
end $$;
