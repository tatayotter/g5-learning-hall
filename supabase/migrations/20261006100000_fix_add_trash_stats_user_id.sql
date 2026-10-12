-- add_trash_stats has never counted anything.
--
-- It was written with `p_user_id uuid` and an `auth.uid() IS DISTINCT FROM p_user_id` guard, but
-- this app's player ids are text ('damien', a child id, …) — player_progress.user_id is text, and
-- auth.uid() is the anonymous-auth uuid, which is bridged to the app id through
-- user_identity_map (see current_app_user_id()). So every call from the Training Map
-- (components/monster/TrainingMap.tsx: trash picked up, and gold from a recycler trade) failed
-- with "invalid input syntax for type uuid" before reaching the function body, and
-- player_progress.trash_collected_total / trash_gold_earned_total stayed at 0. The four trash
-- achievements in lib/achievements.ts could never unlock.
--
-- This replaces it with a text version guarded the same way as every other player RPC. Counts
-- missed while it was broken are gone; counting starts from here.
--
-- The parameter type changes, so the old function has to be dropped rather than replaced.
drop function if exists public.add_trash_stats(uuid, integer, integer);

create or replace function public.add_trash_stats(
  p_user_id text,
  p_collected integer default 0,
  p_gold integer default 0
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;

  -- Counters only ever go up, and one call covers one pickup or one trade.
  insert into public.player_progress (user_id, trash_collected_total, trash_gold_earned_total, updated_at)
  values (p_user_id, greatest(coalesce(p_collected, 0), 0), greatest(coalesce(p_gold, 0), 0), now())
  on conflict (user_id) do update
    set trash_collected_total = player_progress.trash_collected_total + excluded.trash_collected_total,
        trash_gold_earned_total = player_progress.trash_gold_earned_total + excluded.trash_gold_earned_total,
        updated_at = now();
end;
$$;

revoke all on function public.add_trash_stats(text, integer, integer) from public, anon;
grant execute on function public.add_trash_stats(text, integer, integer) to authenticated, service_role;
