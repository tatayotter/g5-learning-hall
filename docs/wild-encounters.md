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
   reloads. It only goes away when it's caught or runs out of tries.
5. **Three tries, shared.** A wrong encounter answer uses a try. A right answer starts the
   battle, which also uses a try up front (so a reload mid-battle can't dodge a loss). Winning
   catches it. Losing with tries left keeps it nearby; the next walk-up asks a fresh question.
   At zero tries after a miss or a loss, it runs off.
6. **Quality is real in battle.** The wild curio fights with its quality's HP and Attack boost
   (×1.10 / ×1.22 / ×1.40), and the win EXP scales the same way (25 / 28 / 31 / 35).
7. **Catch.** A new species goes to the Catch Inbox at its level and quality. A species the
   player already owns offers a spare (at the quality they beat) or 100 gold.

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
