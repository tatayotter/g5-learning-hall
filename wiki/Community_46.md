# Community 46

> 42 nodes

## Key Concepts

- **public.player_progress** (32 connections) — `supabase/migrations/20260811083401_add_progress_redesign_phase1_schema.sql`
- **public.apply_progress_update()** (7 connections) — `supabase/migrations/20260923120000_fix_progress_mastery_purchase_honor_deltas.sql`
- **20261004180000_daily_reward_caps.sql** (7 connections) — `supabase/migrations/20261004180000_daily_reward_caps.sql`
- **result** (6 connections)
- **public.apply_progress_update()** (6 connections) — `supabase/migrations/20261011120000_achievement_award_dedupe.sql`
- **cur_xp** (5 connections)
- **public.apply_progress_update()** (5 connections) — `supabase/migrations/20260811120908_wave4_journal_write_path.sql`
- **public.award_coins_to_child()** (5 connections) — `supabase/migrations/20260812060000_migrate_remaining_gold_rpcs_off_weekly_packages.sql`
- **public.apply_progress_deltas()** (5 connections) — `supabase/migrations/20261004180000_daily_reward_caps.sql`
- **public.consume_reward_allowance()** (5 connections) — `supabase/migrations/20261004180000_daily_reward_caps.sql`
- **public.shop_items** (4 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **20261015070000_curio_tracking_scrolls.sql** (4 connections) — `supabase/migrations/20261015070000_curio_tracking_scrolls.sql`
- **public.consume_reward_allowance()** (4 connections) — `supabase/migrations/20261028090000_gear_tools_and_earning_trims.sql`
- **public.player_inventory** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.reward_claims** (3 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.spend_gold_and_grant_item()** (3 connections) — `supabase/migrations/20260812060000_migrate_remaining_gold_rpcs_off_weekly_packages.sql`
- **public.spend_gold_and_grant_item()** (3 connections) — `supabase/migrations/20260814000000_fix_spend_gold_and_grant_item_security_definer.sql`
- **public.reward_daily_ledger** (3 connections) — `supabase/migrations/20261004180000_daily_reward_caps.sql`
- **public.set_active_tracking()** (3 connections) — `supabase/migrations/20261015070000_curio_tracking_scrolls.sql`
- **public.summon_tracked_curio()** (3 connections) — `supabase/migrations/20261015070000_curio_tracking_scrolls.sql`
- **daily_reward_caps.test.sql** (3 connections) — `supabase/tests/database/daily_reward_caps.test.sql`
- **public.player_log** (2 connections) — `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- **public.admin_set_reward_claim_status()** (2 connections) — `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- **public.spend_gold()** (2 connections) — `supabase/migrations/20260904000000_add_spend_gold_rpc.sql`
- **public.spend_gold()** (2 connections) — `supabase/migrations/20260904010000_harden_spend_gold_rpc.sql`
- *... and 17 more nodes in this community*

## Relationships

- [Community 35](Community_35.md) (11 shared connections)
- [Community 34](Community_34.md) (6 shared connections)
- [Community 37](Community_37.md) (6 shared connections)
- [Community 30](Community_30.md) (5 shared connections)
- [Community 6](Community_6.md) (4 shared connections)
- [Community 43](Community_43.md) (2 shared connections)
- [Community 9](Community_9.md) (2 shared connections)
- [Community 48](Community_48.md) (2 shared connections)
- [Community 27](Community_27.md) (1 shared connections)
- [Community 147](Community_147.md) (1 shared connections)
- [Community 68](Community_68.md) (1 shared connections)
- [Community 145](Community_145.md) (1 shared connections)

## Source Files

- `supabase/migrations/20260806230001_initial_schema_baseline_a_tables.sql`
- `supabase/migrations/20260806230002_initial_schema_baseline_c_functions.sql`
- `supabase/migrations/20260811083401_add_progress_redesign_phase1_schema.sql`
- `supabase/migrations/20260811120908_wave4_journal_write_path.sql`
- `supabase/migrations/20260812060000_migrate_remaining_gold_rpcs_off_weekly_packages.sql`
- `supabase/migrations/20260814000000_fix_spend_gold_and_grant_item_security_definer.sql`
- `supabase/migrations/20260904000000_add_spend_gold_rpc.sql`
- `supabase/migrations/20260904010000_harden_spend_gold_rpc.sql`
- `supabase/migrations/20260923120000_fix_progress_mastery_purchase_honor_deltas.sql`
- `supabase/migrations/20261004180000_daily_reward_caps.sql`
- `supabase/migrations/20261011120000_achievement_award_dedupe.sql`
- `supabase/migrations/20261015070000_curio_tracking_scrolls.sql`
- `supabase/migrations/20261028090000_gear_tools_and_earning_trims.sql`
- `supabase/tests/database/daily_reward_caps.test.sql`

## Audit Trail

- EXTRACTED: 96 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*