-- Battle training (components/monster/BattleTraining.tsx): the first Curio
-- Arena visit brings an invite from Tatay, a coached fight he can't lose, then
-- a Training Dummy fight. Finishing it once pays a one-time 100 gold bonus.
--
-- Completion lives in its own table rather than a user_battle_state column:
-- user_battle_state has an "update own" policy, so a client could null the
-- column back out and claim the bonus again. This table has no write policies
-- at all — only complete_battle_training() (security definer) inserts, and the
-- primary key makes the bonus once-per-player.

create table if not exists public.battle_training_completions (
  user_id text primary key,
  completed_at timestamptz not null default now()
);

alter table public.battle_training_completions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_training_completions'
      and policyname = 'battle_training_completions: read own'
  ) then
    create policy "battle_training_completions: read own" on public.battle_training_completions
      for select using (public.current_app_user_id() = user_id);
  end if;
end $$;

-- Gold amount is fixed here, never taken from the client. Returns the same
-- {level, xp, gold} shape as spend_gold so the client can sync its cached
-- stats, plus `awarded` (false when training was already completed).
create or replace function public.complete_battle_training()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user_id text := public.current_app_user_id();
  v_inserted int;
  v_stats jsonb;
begin
  if v_user_id is null then
    raise exception 'not authorized';
  end if;

  insert into public.battle_training_completions (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    insert into public.player_progress (user_id, gold)
    values (v_user_id, 100)
    on conflict (user_id) do update
      set gold = public.player_progress.gold + 100,
          updated_at = now();
  end if;

  select jsonb_build_object('level', level, 'xp', xp, 'gold', gold, 'awarded', v_inserted = 1)
  into v_stats
  from public.player_progress
  where user_id = v_user_id;

  return coalesce(v_stats, jsonb_build_object('awarded', v_inserted = 1));
end;
$function$;

revoke execute on function public.complete_battle_training() from public, anon;
grant execute on function public.complete_battle_training() to authenticated, service_role;
