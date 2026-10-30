# Community 6

> 84 nodes

## Key Concepts

- **20260806230001_initial_schema_baseline_a_tables.sql** (80 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.parent_link_requests** (13 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.trades** (12 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.user_identity_map** (10 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.analytics_events** (9 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.request_parent_link()** (8 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **public.request_parent_link()** (8 connections) — `supabase/migrations/20260911110000_fix_parent_link_analytics_insert.sql`
- **public.live_battles** (6 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.trade_items** (6 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.pending_parent_reassignments** (5 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **20260911100000_parent_link_gate_and_instrumentation.sql** (5 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **public.create_unclaimed_child_account()** (5 connections) — `supabase/migrations/20261002170000_raise_child_signup_ip_limit.sql`
- **public.draft_summaries** (4 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **children** (4 connections)
- **parents** (3 connections)
- **public.child_login_failures** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.child_signup_rate_limit** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.am_i_linked()** (3 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.preview_parent_link()** (3 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.enforce_pvp_requires_linked_parent()** (3 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **public.my_pending_link_request()** (3 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **trg_pvp_requires_linked_parent** (3 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **pg_temp.login_as()** (3 connections) — `supabase/tests/database/generalize_family_accounts.test.sql`
- **analytics_events_event_name_created_at_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **analytics_events_session_id_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- *... and 59 more nodes in this community*

## Relationships

- [Community 9](Community_9.md) (23 shared connections)
- [Community 27](Community_27.md) (12 shared connections)
- [Community 37](Community_37.md) (7 shared connections)
- [Community 48](Community_48.md) (5 shared connections)
- [Community 68](Community_68.md) (4 shared connections)
- [Community 46](Community_46.md) (4 shared connections)
- [Community 34](Community_34.md) (3 shared connections)
- [Community 145](Community_145.md) (3 shared connections)
- [Community 98](Community_98.md) (2 shared connections)
- [Community 30](Community_30.md) (1 shared connections)
- [Community 43](Community_43.md) (1 shared connections)

## Source Files

- `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- `supabase/migrations/20260905170002_verify_child_login_return_profile.sql`
- `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- `supabase/migrations/20260911110000_fix_parent_link_analytics_insert.sql`
- `supabase/migrations/20260914060000_fix_respond_to_trade_race.sql`
- `supabase/migrations/20261002170000_raise_child_signup_ip_limit.sql`
- `supabase/tests/database/generalize_family_accounts.test.sql`

## Audit Trail

- EXTRACTED: 188 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*