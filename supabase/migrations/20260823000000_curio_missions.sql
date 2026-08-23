-- curio_missions: timed idle expeditions that earn EXP for benched curios.
-- user_id is text (matches every other game table — legacy IDs like "damien"
-- are plain strings, not auth.users UUIDs).
-- RLS uses current_app_user_id() so both legacy and Auth users are covered.

create table public.curio_missions (
  id             uuid         primary key default gen_random_uuid(),
  user_id        text         not null,
  monster_row_id uuid         not null,   -- user_monsters.id
  mission_name   text         not null,
  duration_hours int          not null check (duration_hours in (1,2,4,6,8)),
  exp_reward     int          not null check (exp_reward > 0),
  started_at     timestamptz  not null default now(),
  ends_at        timestamptz  not null,
  claimed_at     timestamptz  default null
);

-- One active (unclaimed) mission per curio at a time
create unique index curio_missions_one_active_per_curio
  on public.curio_missions (user_id, monster_row_id)
  where (claimed_at is null);

create index curio_missions_user_active_idx
  on public.curio_missions (user_id, claimed_at);

alter table public.curio_missions enable row level security;

create policy "curio_missions: read own"
  on public.curio_missions for select
  using (current_app_user_id() = user_id);

create policy "curio_missions: insert own"
  on public.curio_missions for insert
  with check (current_app_user_id() = user_id);

create policy "curio_missions: update own"
  on public.curio_missions for update
  using  (current_app_user_id() = user_id)
  with check (current_app_user_id() = user_id);

create policy "curio_missions: delete own"
  on public.curio_missions for delete
  using (current_app_user_id() = user_id);
