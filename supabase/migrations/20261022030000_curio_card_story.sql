-- The back of a curio's trading card (components/monster/CurioCard.tsx) shows that curio's own
-- story: battles fought and won with it as the active curio, and main quests it trained on.
-- Nothing recorded these per curio before (monster_battle_log is per player), so counting
-- starts from here; the card says so for curios that joined before today.
--
-- Plain counters on user_monsters, bumped by one RPC so two quick results can't overwrite each
-- other the way a client read-modify-write could. Catch Inbox curios aren't counted: a curio
-- only gets a card back once it's on the team or bench.

alter table public.user_monsters add column if not exists battles_fought integer not null default 0;
alter table public.user_monsters add column if not exists battles_won integer not null default 0;
alter table public.user_monsters add column if not exists quests_trained integer not null default 0;

create or replace function public.record_curio_story(
  p_user_id text,
  p_curio_id uuid,
  p_battle_won boolean default null,  -- null = not a battle; true/false = a battle won/lost
  p_trained boolean default false     -- a main quest trained this curio
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

  update public.user_monsters
  set battles_fought = battles_fought + case when p_battle_won is null then 0 else 1 end,
      battles_won = battles_won + case when p_battle_won then 1 else 0 end,
      quests_trained = quests_trained + case when p_trained then 1 else 0 end
  where id = p_curio_id and user_id = p_user_id;
end;
$$;

revoke all on function public.record_curio_story(text, uuid, boolean, boolean) from public, anon;
grant execute on function public.record_curio_story(text, uuid, boolean, boolean) to authenticated, service_role;
