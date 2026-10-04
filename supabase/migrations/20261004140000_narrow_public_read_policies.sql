-- Narrow the remaining "read all" policies on per-player tables.
--
-- Each of these was `for select using (true)` with no role, so anyone holding
-- the public anon key could read every row. App user ids are usernames, and
-- some usernames are built from an email address, so even id-only rows leak.
--
-- curio_eggs           -> owner only. The only reader (lib/curioEggs
--                         fetchUserEggs) loads the signed-in player's own eggs;
--                         every write goes through SECURITY DEFINER RPCs.
-- grade_content_owners -> no client read. Nothing in the client reads it; its
--                         only reader is resolve_user_grade, called from the
--                         SECURITY DEFINER sync_weekly_packages_to_progress.
-- user_subclass_profiles -> signed-in players, plus a parent for their own
--                         child. Other players' guild levels are shown by
--                         HeroProfile, PlayerStatsPopup and the PvP opponent
--                         lookup in MonsterGuild; ChildProgressPanel reads it
--                         as the parent.
-- leaderboard_reactions -> signed-in players, and from_user_id is no longer
--                         selectable. The leaderboard only counts to_user_id
--                         (lib/leaderboard fetchReactionCounts); who reacted to
--                         whom was never shown.
--
-- "Signed-in player" means current_app_user_id() resolves, i.e. a real child
-- login mapped in user_identity_map, not just any anonymous auth session.
--
-- user_themes is intentionally left public: it only holds rows for the two
-- hard-coded legacy family profiles (ids already in the public USERS roster),
-- and it is loaded during Dashboard hydration, before a session may exist.

-- ── curio_eggs ────────────────────────────────────────────────────────────────
drop policy if exists "curio_eggs: read all" on public.curio_eggs;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'curio_eggs' and policyname = 'curio_eggs: read own'
  ) then
    create policy "curio_eggs: read own" on public.curio_eggs
      for select to authenticated
      using (user_id = (select public.current_app_user_id()));
  end if;
end $$;

-- ── grade_content_owners ──────────────────────────────────────────────────────
drop policy if exists "grade_content_owners: read all" on public.grade_content_owners;

-- ── user_subclass_profiles ────────────────────────────────────────────────────
drop policy if exists "user_subclass_profiles: read all" on public.user_subclass_profiles;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_subclass_profiles'
      and policyname = 'user_subclass_profiles: read as player or parent'
  ) then
    create policy "user_subclass_profiles: read as player or parent" on public.user_subclass_profiles
      for select to authenticated
      using (
        (select public.current_app_user_id()) is not null
        or exists (
          select 1 from public.children c
          where c.id = user_subclass_profiles.user_id and c.parent_id = (select auth.uid())
        )
      );
  end if;
end $$;

-- ── leaderboard_reactions ─────────────────────────────────────────────────────
drop policy if exists "leaderboard_reactions: read all" on public.leaderboard_reactions;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'leaderboard_reactions'
      and policyname = 'leaderboard_reactions: read as player'
  ) then
    create policy "leaderboard_reactions: read as player" on public.leaderboard_reactions
      for select to authenticated
      using ((select public.current_app_user_id()) is not null);
  end if;
end $$;

-- Column-level: everything except from_user_id. Inserts (sendReaction) don't
-- ask for the row back, so they don't need SELECT on it.
revoke select on public.leaderboard_reactions from anon, authenticated;
grant select (id, to_user_id, emoji, created_at) on public.leaderboard_reactions to authenticated;
