# Wild curio encounters

How wild curios work on the training maps, and how to measure them. Code:
`components/monster/TrainingMap.tsx` (scroll answers, spawn roll),
`components/MonsterGuild.tsx` (species, quality, tries, battle, catch),
`components/WildEncounterModal.tsx`, `components/monster/map/panels/CurioEncounterPanel.tsx`.

## Rules

1. **Spawn.** Each map scroll holds one question. A right answer has a 5% chance to spawn a
   curio. After 30 right answers without one, a spawn is guaranteed (`pity`). On average one
   appears every ~16 right answers. Only one curio at a time.
2. **Species.** 27 wild species, 6 legendary. A legendary is 1/10 as likely as a normal species,
   and each legendary already owned cuts legendary odds by 40% (floored). About 2.8% of spawns are
   legendary on Ledger's Heart for a player with none. Element maps only spawn their element.
3. **Level and quality.** Level is the active curio's level ±1. Quality is rolled at spawn
   (Normal 68.9%, Good 25%, Outstanding 5%, Perfect 1.1%) and shown as the map glow.
4. **It stays until it's resolved.** The curio is saved on
   `user_battle_state.pending_wild_curio` and follows the player between maps, tabs and
   reloads. It only goes away when it's caught or runs out of tries. It appears next to the
   player; after "Not yet" it steps 2-4 walkable tiles away so the player doesn't keep bumping
   into it.
5. **Three tries, shared.** A wrong encounter answer uses a try. A right answer starts the
   battle, which also uses a try up front (so a reload mid-battle can't dodge a loss). Winning
   catches it. Losing with tries left keeps it nearby; the next walk-up asks a fresh question.
   At zero tries after a miss or a loss, it runs off. Leaving a battle unfinished (reload, tab
   switch) on the last try counts as the loss: it runs off when it next comes back.
6. **Quality is real in battle.** The wild curio fights with its quality's HP and Attack boost
   (×1.10 / ×1.22 / ×1.40), and the win EXP scales the same way (25 / 28 / 31 / 35).
7. **Catch.** A new species goes to the Catch Inbox at its level and quality. A species the
   player already owns offers a spare (at the quality they beat) or 100 gold.

## Tracking Scrolls

A way to hunt one exact curio. Code: `lib/curioTracking.ts`, `hooks/useItemBar.ts`,
`components/monster/map/MapItemBar.tsx`; server side in
`supabase/migrations/20261015070000_curio_tracking_scrolls.sql`.

1. **Buy.** One scroll per first form: the 6 starters and the 21 non-legendary wild curios
   (no legendaries, guild or event curios). 5,000 gold each (`shop_items`), sold in the Shop and
   on the curio's Compendium page. Not sold for a curio the player already has, or while that
   scroll is already in the bag.
2. **Equip and activate.** The map has 4 item slots (keys 1-4 on a computer). A scroll goes from
   the bag (🎒) into a slot; tapping it makes it the active one (`user_battle_state.active_tracking`).
   Only one is active at a time, and each scroll keeps its own meter (`curio_tracking`), so
   switching never loses progress. Needs internet.
3. **Fill the meter.** Each right map-scroll answer adds 1 (`advance_tracking` only counts a
   question the server graded right in the last 10 minutes, once). Wrong answers add nothing and
   take nothing away. The meter is on the account, so map changes and reloads keep it.
4. **Summon.** At 30/30, tapping the scroll asks to summon. `summon_tracked_curio` uses up the
   scroll, rolls level (active curio ±1) and quality (same odds as a wild spawn), and saves the
   curio as `pending_wild_curio` with `tracked: true`. From there it is a normal wild encounter:
   question, battle, catch. A tracked curio never runs away: running out of tries refills them.
5. **Trash shares the slots.** Picked-up trash stacks by type in the same 4 slots
   (`user_battle_state.item_bar`, see `lib/itemBar.ts`), so it survives map changes. With no free
   slot, new trash stays on the map until the player trades at the Recycler or throws some away.

Events: `tracking_started`, `tracking_summoned` in `wild_encounter_events`.

## Funnel data

Every step is a row in `wild_encounter_events` (players can insert their own rows, nobody can
read them from the client). Events: `scroll_answered` (`correct`), `spawned` (`pity`),
`restored`, `approached`, `walked_away`, `question_answered` (`correct`), `battle_started`,
`battle_won`, `battle_lost`, `fled`, `caught`, `duplicate_kept`, `duplicate_gold`.

Funnel over the last 30 days:

```sql
select event,
       count(*) as n,
       count(distinct user_id) as players,
       count(*) filter (where correct) as correct,
       count(*) filter (where pity) as pity
from wild_encounter_events
where created_at > now() - interval '30 days'
group by event
order by n desc;
```

Spawns per right scroll answer (should be about 1 in 16):

```sql
select
  count(*) filter (where event = 'scroll_answered' and correct) as right_scroll_answers,
  count(*) filter (where event = 'spawned') as spawns,
  round(count(*) filter (where event = 'scroll_answered' and correct)::numeric
        / nullif(count(*) filter (where event = 'spawned'), 0), 1) as answers_per_spawn
from wild_encounter_events
where created_at > now() - interval '30 days';
```

Win rate by quality (is a Perfect foe too hard?):

```sql
select quality,
       count(*) filter (where event = 'battle_won') as won,
       count(*) filter (where event = 'battle_lost') as lost
from wild_encounter_events
where event in ('battle_won', 'battle_lost')
group by quality;
```

## Reading older data

Before the fixes of 2026-10-11, three bugs skewed the events. When comparing weeks, start
after that deploy or allow for them:

- Pity spawns could fire a few answers after the previous spawn (an old copy of the battle state
  put the guaranteed-spawn counter back), so `pity` share ran high (35% vs ~21% in week one).
- A double tap on the results screen's Continue could log `battle_won` + `caught` twice and
  insert two catches (one case, 2026-10-08).
- A curio whose last try went on an abandoned battle came back with tries at 0 or below instead
  of running off (`attempts_left` = -1 in one row).
