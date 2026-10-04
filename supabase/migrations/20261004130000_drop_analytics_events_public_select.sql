-- Stop anon/authenticated from reading analytics_events.
--
-- analytics_events_select_anon (from the schema baseline) was
-- `for select using (true)`, so anyone holding the public anon key could read
-- every analytics row: app user ids, parent auth uids, utm/fbclid attribution,
-- client error messages and stacks. The users are children.
--
-- The only reader was the admin dashboard (components/admin/AnalyticsSection),
-- which now goes through the passcode-gated /api/admin-analytics route with
-- the service-role client. Every database function that touches this table
-- (delete_own_family_data, request_parent_link, confirm_parent_link) is
-- SECURITY DEFINER, and no client insert asks for the inserted row back, so
-- nothing else depends on SELECT.
--
-- Insert policies are left untouched ("analytics_events: self insert", plus
-- "analytics_events: parent self insert" where present).

do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'analytics_events'
      and policyname = 'analytics_events_select_anon'
  ) then
    drop policy analytics_events_select_anon on public.analytics_events;
  end if;
end $$;
