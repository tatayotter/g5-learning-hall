-- Narrow the last two "any authenticated session" read policies.
--
-- Both were `for select to authenticated using (true)`. Anyone holding the
-- public anon key can mint an authenticated session with signInAnonymously(),
-- so in practice every row was readable by anyone.
--
-- player_weekly_journal -> owner only. The only browser reader is the
--   player's own useWeeklyData; the admin ToolsSection now reads through
--   /api/admin-weekly (service role). Writes were already owner-only.
-- user_monsters -> signed-in players. Other players' curios are read by
--   HeroProfile, PlayerStatsPopup, the leaderboard, trades (fetchTradeable-
--   Monsters) and the live-battle opponent lookup in MonsterGuild. No parent
--   view reads this table. The SECURITY INVOKER curio RPCs (learn/unlearn
--   skill, graduate, growth pill, set_team_slot) only run for signed-in
--   players, and resolve-live-battle uses the service role.
--
-- "Signed-in player" means current_app_user_id() resolves: both splash login
-- paths call link_verified_identity before the dashboard loads.

-- ── player_weekly_journal ─────────────────────────────────────────────────────
drop policy if exists "player_weekly_journal: read all" on public.player_weekly_journal;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'player_weekly_journal'
      and policyname = 'player_weekly_journal: read own'
  ) then
    create policy "player_weekly_journal: read own" on public.player_weekly_journal
      for select to authenticated
      using (user_id = (select public.current_app_user_id()));
  end if;
end $$;

-- ── user_monsters ─────────────────────────────────────────────────────────────
drop policy if exists "user_monsters: read all" on public.user_monsters;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_monsters'
      and policyname = 'user_monsters: read as player'
  ) then
    create policy "user_monsters: read as player" on public.user_monsters
      for select to authenticated
      using ((select public.current_app_user_id()) is not null);
  end if;
end $$;
