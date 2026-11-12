# Community 10

> 74 nodes

## Key Concepts

- **20260806230001_initial_schema_baseline_a_tables.sql** (80 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.parent_link_requests** (13 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.trades** (10 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.analytics_events** (9 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.request_parent_link()** (8 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **public.request_parent_link()** (8 connections) — `supabase/migrations/20260911110000_fix_parent_link_analytics_insert.sql`
- **public.live_battles** (6 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.pending_parent_reassignments** (5 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **20260911100000_parent_link_gate_and_instrumentation.sql** (5 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **public.trade_items** (4 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **children** (4 connections)
- **parents** (3 connections)
- **public.child_login_failures** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.child_signup_rate_limit** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.draft_summaries** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.preview_parent_link()** (3 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.enforce_pvp_requires_linked_parent()** (3 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **public.my_pending_link_request()** (3 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **trg_pvp_requires_linked_parent** (3 connections) — `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- **pg_temp.login_as()** (3 connections) — `supabase/tests/database/generalize_family_accounts.test.sql`
- **analytics_events_event_name_created_at_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **analytics_events_session_id_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **analytics_events_user_id_created_at_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **child_login_failures_child_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **child_signup_rate_limit_ip_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- *... and 49 more nodes in this community*

## Relationships

- [Community 13](Community_13.md) (21 shared connections)
- [Community 17](Community_17.md) (14 shared connections)
- [Community 34](Community_34.md) (6 shared connections)
- [Community 36](Community_36.md) (6 shared connections)
- [Community 66](Community_66.md) (4 shared connections)
- [Community 35](Community_35.md) (4 shared connections)
- [Community 80](Community_80.md) (2 shared connections)
- [Community 50](Community_50.md) (1 shared connections)
- [Community 39](Community_39.md) (1 shared connections)
- [Community 26](Community_26.md) (1 shared connections)

## Source Files

- `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- `supabase/migrations/20260905170002_verify_child_login_return_profile.sql`
- `supabase/migrations/20260911100000_parent_link_gate_and_instrumentation.sql`
- `supabase/migrations/20260911110000_fix_parent_link_analytics_insert.sql`
- `supabase/migrations/20260914060000_fix_respond_to_trade_race.sql`
- `supabase/tests/database/generalize_family_accounts.test.sql`

## Audit Trail

- EXTRACTED: 168 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*