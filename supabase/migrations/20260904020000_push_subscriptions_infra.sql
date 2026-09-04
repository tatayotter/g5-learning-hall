-- Web Push subscriptions, keyed the same way every other RLS-scoped table in
-- this app resolves "who is this browser" — either the anon-auth bridge
-- (user_identity_map, for child/classmate gameplay identities) or a real
-- Supabase Auth parent session (parents.id = auth.uid()). Mirrors the
-- owner-scoping pattern already used for live_battles/user_monsters etc.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_kind text not null check (owner_kind in ('app_user', 'parent')),
  -- app-level text user id (children.id/classmates.id) when owner_kind='app_user';
  -- parents.id (uuid, stored as text) when owner_kind='parent'.
  owner_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_owner_idx
  on public.push_subscriptions (owner_kind, owner_id);

alter table public.push_subscriptions enable row level security;

-- A browser may only manage subscription rows for the identity it can
-- currently prove: its bridged app_user_id (child/classmate gameplay login)
-- or its own real parent auth session. No cross-account read/write.
create policy "push_subscriptions_owner_select"
  on public.push_subscriptions for select
  to authenticated
  using (
    (owner_kind = 'app_user' and owner_id in (
      select app_user_id from public.user_identity_map where auth_uid = auth.uid()
    ))
    or (owner_kind = 'parent' and owner_id = auth.uid()::text)
  );

create policy "push_subscriptions_owner_insert"
  on public.push_subscriptions for insert
  to authenticated
  with check (
    (owner_kind = 'app_user' and owner_id in (
      select app_user_id from public.user_identity_map where auth_uid = auth.uid()
    ))
    or (owner_kind = 'parent' and owner_id = auth.uid()::text)
  );

create policy "push_subscriptions_owner_delete"
  on public.push_subscriptions for delete
  to authenticated
  using (
    (owner_kind = 'app_user' and owner_id in (
      select app_user_id from public.user_identity_map where auth_uid = auth.uid()
    ))
    or (owner_kind = 'parent' and owner_id = auth.uid()::text)
  );

-- Upsert-by-endpoint from the client needs update rights too (re-subscribing
-- on the same browser/endpoint refreshes keys rather than erroring on the
-- unique constraint).
create policy "push_subscriptions_owner_update"
  on public.push_subscriptions for update
  to authenticated
  using (
    (owner_kind = 'app_user' and owner_id in (
      select app_user_id from public.user_identity_map where auth_uid = auth.uid()
    ))
    or (owner_kind = 'parent' and owner_id = auth.uid()::text)
  )
  with check (
    (owner_kind = 'app_user' and owner_id in (
      select app_user_id from public.user_identity_map where auth_uid = auth.uid()
    ))
    or (owner_kind = 'parent' and owner_id = auth.uid()::text)
  );
