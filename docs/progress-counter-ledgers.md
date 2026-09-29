# Lifetime progress counters and their ledgers

`player_progress.mastery_count` and `player_progress.purchased_items` are lifetime counters. Each
one should move in lockstep with an insert-only ledger, which is how we audit them.

## Correction to migration `20260923120000_fix_progress_mastery_purchase_honor_deltas.sql`

The backfill comment in that migration (lines 51-53) says `reward_claims` is "the only thing that
increments purchased_items" and that Curio Arena Shop buys "never counted toward it". **That is
wrong.** The migration is already applied to production, so it is left unedited and corrected
here instead (found 2026-09-29).

`purchased_items` has two write paths:

| Path | Increments `purchased_items` | Ledger row |
| --- | --- | --- |
| Reward Vault claim | yes | `reward_claims` (by `app_user_id`) |
| Curio Arena Shop buy (`spend_gold_and_grant_item`, `components/MonsterShop.tsx`) | yes, `+ 1` in the RPC | `player_log` with `action_type = 'purchase'`, description ending `from Curio Arena Shop` — no `reward_claims` row |

Arena Shop buys made before the fix were lost to the old counter-overwrite bug, and the backfill
restored only `reward_claims`. So Arena buys count toward the ledger only from the fix onward.

## Ledger definitions

- **mastery_count:** `player_log` rows with `action_type = 'quiz'` and `description LIKE 'Completed %'`.
- **purchased_items:** `reward_claims` rows, plus `player_log` Arena Shop `purchase` rows with
  `created_at > '2026-09-24T01:48:00Z'`.

```sql
with x as (
  select pp.user_id, pp.mastery_count, pp.purchased_items,
    (select count(*) from public.player_log l
       where l.user_id = pp.user_id and l.action_type = 'quiz'
         and l.description like 'Completed %') as m_ledger,
    (select count(*) from public.reward_claims rc where rc.app_user_id = pp.user_id)
    + (select count(*) from public.player_log l
         where l.user_id = pp.user_id and l.action_type = 'purchase'
           and l.description like '%from Curio Arena Shop'
           and l.created_at > '2026-09-24T01:48:00Z') as p_ledger
  from public.player_progress pp)
select
  count(*) filter (where mastery_count < m_ledger)   as mastery_below_ledger,
  count(*) filter (where purchased_items < p_ledger) as purchases_below_ledger,
  coalesce(sum(mastery_count - m_ledger)   filter (where mastery_count > m_ledger), 0)   as mastery_excess,
  coalesce(sum(purchased_items - p_ledger) filter (where purchased_items > p_ledger), 0) as purchases_excess
from x;
```

## Expected values

- `*_below_ledger` should be 0. Anything above 0 means a counter lost counts.
- The excess totals come from a few accounts that were already ahead of their ledgers before the
  fix. As of 2026-09-29 they were: mastery excess 3 (1 account), purchases excess 5 (3 accounts). They should stay
  constant. A rise means a counter is being double counted, or a new write path has appeared
  that doesn't write a ledger row.

If you add a new way to raise either counter, give it a ledger row and update this doc.
