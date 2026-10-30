# Community 68

> 31 nodes

## Key Concepts

- **public.subscriptions** (19 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.journal_entries** (5 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.get_child_weak_topics()** (5 connections) — `supabase/migrations/20260902140000_get_child_weak_topics.sql`
- **20261002150000_child_slot_purchase.sql** (5 connections) — `supabase/migrations/20261002150000_child_slot_purchase.sql`
- **public.execute_due_child_reassignments()** (4 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.get_child_journal()** (4 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.child_slot_purchases** (4 connections) — `supabase/migrations/20261002150000_child_slot_purchase.sql`
- **pg_temp.login_as()** (4 connections) — `supabase/tests/database/child_slot_purchase.test.sql`
- **checkout_keeps_active_premium.test.sql** (3 connections) — `supabase/tests/database/checkout_keeps_active_premium.test.sql`
- **pg_temp.sub_state()** (3 connections) — `supabase/tests/database/checkout_keeps_active_premium.test.sql`
- **subscriptions_parent_id_idx** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.max_children_for_parent()** (2 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.handle_paymongo_webhook()** (2 connections) — `supabase/migrations/20260812080000_make_paymongo_webhook_idempotent.sql`
- **20260826020000_meta_capi_subscription_tracking.sql** (2 connections) — `supabase/migrations/20260826020000_meta_capi_subscription_tracking.sql`
- **public.create_checkout_session()** (2 connections) — `supabase/migrations/20260826020000_meta_capi_subscription_tracking.sql`
- **public.handle_paymongo_webhook()** (2 connections) — `supabase/migrations/20260826020000_meta_capi_subscription_tracking.sql`
- **20261002130000_checkout_keeps_active_premium.sql** (2 connections) — `supabase/migrations/20261002130000_checkout_keeps_active_premium.sql`
- **public.create_checkout_session()** (2 connections) — `supabase/migrations/20261002130000_checkout_keeps_active_premium.sql`
- **public.handle_paymongo_webhook()** (2 connections) — `supabase/migrations/20261002130000_checkout_keeps_active_premium.sql`
- **idx_child_slot_purchases_parent** (2 connections) — `supabase/migrations/20261002150000_child_slot_purchase.sql`
- **public.create_child_slot_checkout()** (2 connections) — `supabase/migrations/20261002150000_child_slot_purchase.sql`
- **public.handle_child_slot_webhook()** (2 connections) — `supabase/migrations/20261002150000_child_slot_purchase.sql`
- **public.max_children_for_parent()** (2 connections) — `supabase/migrations/20261002150000_child_slot_purchase.sql`
- **journal_entries_user_day_key** (2 connections) — `supabase/migrations/20261006050000_journal_entries_one_per_day.sql`
- **fx** (2 connections) — `supabase/tests/database/checkout_keeps_active_premium.test.sql`
- *... and 6 more nodes in this community*

## Relationships

- [Community 9](Community_9.md) (5 shared connections)
- [Community 6](Community_6.md) (4 shared connections)
- [Community 27](Community_27.md) (3 shared connections)
- [Community 34](Community_34.md) (1 shared connections)
- [Community 46](Community_46.md) (1 shared connections)
- [Community 30](Community_30.md) (1 shared connections)
- [Community 48](Community_48.md) (1 shared connections)

## Source Files

- `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- `supabase/migrations/20260812080000_make_paymongo_webhook_idempotent.sql`
- `supabase/migrations/20260826020000_meta_capi_subscription_tracking.sql`
- `supabase/migrations/20260902140000_get_child_weak_topics.sql`
- `supabase/migrations/20261002130000_checkout_keeps_active_premium.sql`
- `supabase/migrations/20261002150000_child_slot_purchase.sql`
- `supabase/migrations/20261006050000_journal_entries_one_per_day.sql`
- `supabase/tests/database/checkout_keeps_active_premium.test.sql`
- `supabase/tests/database/child_slot_purchase.test.sql`

## Audit Trail

- EXTRACTED: 55 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*