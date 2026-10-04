-- Let parent accounts write their own analytics events.
--
-- analytics_events' only insert policy is "user_id = current_app_user_id()",
-- which resolves through user_identity_map — a table only child (anonymous)
-- sessions are mapped in. Parents sign in with real Supabase Auth and have no
-- mapping, so every client-side parent event was rejected by RLS. That
-- silently dropped parent_registration_submitted (ParentRegisterForm) since it
-- was added, and blocks the new parent dashboard instrumentation
-- (trackParentEvent in lib/analytics.ts), which keys rows on the parent's auth
-- uid, the same key delete_own_family_data already uses for parent rows.
--
-- The policy only admits a uid that has a parents row, so an anonymous child
-- session can't use it to write rows under its raw auth uid.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'analytics_events'
      and policyname = 'analytics_events: parent self insert'
  ) then
    create policy "analytics_events: parent self insert" on public.analytics_events
      for insert to authenticated
      with check (
        user_id = (select auth.uid())::text
        and exists (select 1 from public.parents p where p.id = (select auth.uid()))
      );
  end if;
end $$;
