# Curio Egg Mechanism — Design

Status: **Design only. Nothing implemented.**
Owner: Rowil
Last updated: 2026-08-05

## Background

A graduated curio, once leveled up enough past its graduation, can produce
one egg over its lifetime. The egg hatches (after a 5-day child login streak)
into a **different, earlier species** than the one that laid it — e.g. a
graduated Solarch ("Starlune") lays an egg that hatches into some earlier
species in its family line, not another Solarch.

This is new territory for the codebase: there is currently no DB or code
concept of one species being the "predecessor" of another.

## Terminology correction (important)

The original framing ("Starlune produces a Solarch egg") reads like a
species-to-species evolution chain. **That's not what exists today.**
Starlune is not a species — it's the *display name* `solarch` takes on once
a specific `user_monsters` row's `graduation_tier` reaches 1
(`getGraduatedMonsterDisplay`, [lib/monsterConfig.ts:317](../lib/monsterConfig.ts)).
Graduation is a per-instance stat/cosmetic upgrade of the same species, not a
species change, and there is no existing predecessor/evolution mapping
anywhere (DB or code).

Confirmed with Rowil: the egg should reflect a **real, separate predecessor
species** (game-design content still being authored, more curios coming
soon) — not just an ungraduated copy of the same species. This mapping is
new content that needs its own admin tool to author, since curio species are
currently hardcoded TS in `lib/monsterConfig.ts`, not DB rows.

## Rules (confirmed)

- **One egg per curio, ever.** A curio instance can lay exactly one egg in
  its lifetime.
- **Egg-ready level = graduation tier's level requirement + 3.**
  `GRADUATION_LEVEL_REQUIREMENT[tier] + 3`
  ([lib/monsterConfig.ts:297](../lib/monsterConfig.ts)) — e.g. tier 1 (level
  20) → ready at level 23, tier 2 (level 32) → ready at level 35.
- **Re-prompts on later tiers if skipped.** If the player doesn't claim the
  egg at tier 1's threshold, the "ready to lay an egg" prompt reappears once
  the curio reaches a later tier's threshold (e.g. tier 2 → level 35). Once
  claimed, no more prompts — ever, for that curio.
- **The parent curio is unaffected.** Claiming the egg doesn't remove, bench,
  or reset the curio that laid it.
- **Guild curios are excluded.** No guild-companion species should ever be
  egg-ready.
- **Eligible pool = team + bench, not just active team.** Both active
  (`slot` set) and benched (`slot IS NULL`) rows in `user_monsters` qualify —
  which, conveniently, is *already* the full set of graduated curios, since
  `graduation_tier` only exists on `user_monsters` (a promoted team monster),
  never on `user_caught_monsters` (caught-but-never-promoted curios can't
  graduate and so can never be egg-ready — consistent with "still requires
  graduation," see below). **No schema change needed for this rule** — it
  falls out of how graduation already works.
- **Still gated on graduation.** Only graduated curios (`graduation_tier >=
  1`) can ever become egg-ready — a curio that never graduated, no matter how
  high its level, does not qualify.
- **Hatchling starts at level 1, ungraduated,** added to the team as
  benched (`slot = NULL`) — same defaults new curios already get.
- **5-day login streak, child-side, consecutive.** Counted from the day the
  egg is claimed. A missed day resets progress.
- **Each element has its own egg sprite/design.**

## Missed-day behavior (confirmed)

Progress resets to 0 — the egg is **not** lost, it just stops growing and
needs to be manually restarted:

- On the next visit, the **Hatchery** (a new tab inside Curio Arena — see
  "Player-facing UI" below) shows: *"You forgot to check in, egg stopped
  growing."* with an **Incubate** button.
- The reset itself happens automatically (server-side, in
  `sync_egg_progress`, the moment a gap is detected) — the child doesn't
  lose anything by not opening the Hatchery, but growth stays paused at 0
  until they open it and press **Incubate** to resume.
- This means `curio_eggs` needs a third status distinguishing "actively
  growing" from "paused, waiting for Incubate" — see updated schema below.

## Data model

### `curio_egg_chains` (new table, admin-authored)

The predecessor-species mapping. Lives in the DB (not `monsterConfig.ts`)
specifically so the admin panel can manage it without a code deploy, per
Rowil's request ("let's make a tool in admin that allows me to assign
graduation chains").

| column | type | notes |
|---|---|---|
| `species_id` | `text` primary key | the graduated species, e.g. `'solarch'` — must match a key in `ALL_MONSTERS` |
| `predecessor_species_id` | `text` | the species the egg hatches into — also validated against `ALL_MONSTERS` |
| `updated_at` | `timestamptz` | |
| `updated_by` | `text` | admin identifier, for audit |

**A species with no row in this table simply never becomes egg-ready.** This
is the exclusion mechanism for guild/event curios too: since guild-companion
species (`GUILD_MONSTERS`) and event species (`EVENT_MONSTERS`) are TS-only
concepts Postgres can't see, the design sidesteps needing to mirror those
lists into the DB — the admin just never adds chain entries for them, and
the "ready" check naturally excludes them. Simpler and harder to get wrong
than duplicating a species-category flag.

RLS: public `SELECT` (species/chain data isn't sensitive — the whole
`monsterConfig.ts` species list already ships in the client bundle).
`INSERT`/`UPDATE`/`DELETE` revoked from `anon`; routed through admin RPCs
below (matches the `admin_*` RPC + passcode pattern already used by
`classmates`/events/etc. — see `lib/adminAuth.ts`, `app/api/admin-*`).

### `curio_eggs` (new table, one row per claimed egg)

| column | type | notes |
|---|---|---|
| `id` | `uuid` pk | |
| `user_id` | `text` | owner |
| `parent_user_monster_id` | `uuid` unique, references `user_monsters(id)` | the curio that laid it — `UNIQUE` is what actually enforces "one egg per curio, ever" |
| `egg_species_id` | `text` | resolved from `curio_egg_chains` at claim time (snapshot, so a later admin edit to the chain doesn't retroactively change an egg already in someone's inventory) |
| `element` | `text` | **the predecessor's (`egg_species_id`'s) element**, not the parent curio's — the egg previews what's actually inside, so on the rare occasion a chain crosses elements the sprite reflects the hatchling, not the layer |
| `status` | `text` | `'incubating' \| 'stalled' \| 'hatched'` — `'stalled'` = a check-in was missed, progress reset to 0, waiting on the player to press Incubate in the Hatchery |
| `streak_progress` | `int` default `0` | days counted so far |
| `last_progress_date` | `date` | last calendar day counted, for streak math |
| `claimed_at` | `timestamptz` | |
| `hatched_at` | `timestamptz` | nullable |
| `hatched_user_monster_id` | `uuid` | nullable, set once hatched |

RLS: owner can `SELECT` their own rows. No direct `INSERT`/`UPDATE` grants —
all writes go through the RPCs below (streak progress in particular
shouldn't be client-writable, or a kid could just set it to 5). **Eggs are
not tradeable** — no `curio_eggs` row is ever touched by the existing Trade
flow, and the Trade UI shouldn't offer eggs as tradeable items at all
(unlike curios in `user_monsters`).

`parent_user_monster_id` should be `ON DELETE SET NULL` rather than
`CASCADE` or `RESTRICT`: the egg is a separate, already-claimed reward, so
if the parent curio is later traded away or otherwise removed from
`user_monsters`, the egg (and any in-progress streak) should survive
untouched — losing an already-claimed egg because its unrelated parent left
the account would feel unfair. `parent_user_monster_id` going `NULL` just
means "the parent curio is gone," it doesn't affect the egg's own lifecycle.

### No new columns on `user_monsters`

Eligibility ("is this curio egg-ready / has it already laid one") is
computed, not stored:

```
eligible =
  NOT p_user_id LIKE 'demo\_%'
  AND um.graduation_tier >= 1
  AND um.monster_level >= GRADUATION_LEVEL_REQUIREMENT[um.graduation_tier] + 3
  AND EXISTS (SELECT 1 FROM curio_egg_chains WHERE species_id = um.monster_id)
  AND NOT EXISTS (SELECT 1 FROM curio_eggs WHERE parent_user_monster_id = um.id)
```

**Demo accounts (`demo_` prefix) are excluded entirely** — no egg-ready
prompt, no Hatchery entry, consistent with how Trade is already hidden for
them ([components/MonsterGuild.tsx:701](../components/MonsterGuild.tsx)):
a demo session is too short-lived to ever complete a 5-day streak, so
showing the mechanic would just be a dead end. Both the eligibility check
above and the Hatchery tab's visibility should short-circuit on the
`demo_` prefix, same guard the Trade tab already uses.

## RPCs (all `SECURITY DEFINER`, following the existing `admin_*` / regular
RPC split already used elsewhere in the schema)

- **`claim_curio_egg(p_user_id, p_user_monster_id)`** — re-validates the
  `eligible` predicate above server-side (never trust a client-computed
  "ready" flag), looks up the chain, inserts the `curio_eggs` row. Errors
  clearly if no chain is defined yet for that species (surfaces as "no egg
  content configured for this curio" rather than a generic failure — expect
  this to happen often early on, since chains are still being authored).
- **`sync_egg_progress(p_user_id)`** — called once per child app session
  (hook into wherever `user_last_login` already gets touched). For each
  `incubating` egg the user owns: if `last_progress_date` is yesterday,
  `streak_progress += 1`; if it's today, no-op (already counted); otherwise
  (gap of 2+ days) set `status = 'stalled'`, `streak_progress = 0` — growth
  pauses here rather than silently continuing, so the Hatchery has something
  to show. `'stalled'` eggs are left alone by this RPC (no further date math)
  until the player explicitly resumes them. When `streak_progress` reaches
  5, hatch inline: roll a quality tier (see "Hatch quality roll" below),
  then insert a new `user_monsters` row (`monster_id = egg_species_id`,
  `slot = NULL`, `monster_exp = 0`, `monster_level = 1`, `graduation_tier =
  0`, `acquired_via = 'egg'`, `quality = <rolled tier>`), set `status =
  'hatched'`, `hatched_user_monster_id`, `hatched_at`.
- **`incubate_curio_egg(p_user_id, p_egg_id)`** — the Hatchery's "Incubate"
  button. Only valid on a `'stalled'` egg owned by the caller: flips
  `status` back to `'incubating'` and sets `last_progress_date = today` (so
  the next day's `sync_egg_progress` call counts as day 1 of a fresh
  streak, not an immediate gap-detect).
### Hatch quality roll

Every hatchling gets a free quality-tier roll baked into hatching — reusing
the existing Normal → Good → Outstanding → Perfect system from the Tutor
gold sink ([lib/curioQuality.ts](../lib/curioQuality.ts),
[project_curio_quality_tutoring.md](../../memory/project_curio_quality_tutoring.md)
via memory), not a new probability table. Concretely: `sync_egg_progress`
calls the same roll function `tutor_curio` uses server-side (Fail 68.8% →
Normal / Good 25% / Outstanding 5% / Perfect 1.1%) and writes the result
straight into the new row's `quality` column — no gold cost, no
player-initiated action, it just happens as part of hatching. The player can
still pay to reroll it later via the normal Tutor flow like any other curio.

- **`admin_upsert_egg_chain(p_passcode, p_species_id,
  p_predecessor_species_id)`** / **`admin_delete_egg_chain(p_passcode,
  p_species_id)`** / **`admin_list_egg_chains(p_passcode)`** — standard admin
  CRUD triplet, passcode-gated exactly like `admin_upsert_custom_event` etc.

## Admin UI

New `components/admin/EggChainsSection.tsx`, added to `AdminDashboard.tsx`'s
nav — a simple table: species → predecessor species dropdown (sourced from
`ALL_MONSTERS`), save via `callAdminApi` → `app/api/admin-egg-chains/route.ts`
→ the RPCs above. Same shape as every other admin section in the repo — no
new pattern needed here.

## Player-facing UI

- **"Ready to lay an egg" prompt** — surfaces in My Team (where graduation
  and other curio-instance actions already live per the recent "Move curio
  instance actions ... to My Team" change). A banner/badge on the eligible
  curio's card with a "Claim Egg" button calling `claim_curio_egg`.
- **Sidebar badge.** The `SidebarRail.tsx` Curio Arena icon
  ([components/SidebarRail.tsx:18](../components/SidebarRail.tsx)) gets a
  notification dot/count whenever there's an egg-ready curio waiting to be
  claimed, or a `hatched` egg whose reveal hasn't played yet — same idea as
  the admin approvals badge. Clears once the relevant action (claim, or
  watch the hatch reveal) happens. Since claiming and hatch-reveal are two
  different states, worth deciding during implementation whether they share
  one generic dot or get distinguishable treatment (e.g. dot vs. count) —
  flagged as a detail to settle, not a blocker.
- **Hatchery — new tab inside Curio Arena.** Curio Arena's sub-nav
  currently reads World Map / My Team / Trainers / Compendium / (Trade) /
  Leaderboard ([components/MonsterGuild.tsx:693](../components/MonsterGuild.tsx)).
  Add a **Hatchery** tab there, **always visible** (not conditionally
  hidden like Trade is for demo accounts). When the player has zero eggs and
  no egg-ready curio yet, it shows explainer/teaser copy instead of an empty
  list — something to work toward ("Graduate and level up a curio to earn
  its first egg"), not a dead-end blank tab. Once eggs exist, it lists them:
  - `'incubating'` eggs: element-specific sprite + streak counter
    ("2 / 5 days") **plus a live "Hours left" countdown** to the check-in
    deadline for the current day, so the player can see urgency before the
    egg stalls (not just a static day count). Deadline = `last_progress_date
    + 1 day`; countdown is `deadline - now()`, rendered client-side (ticking
    down in the UI, no need to poll the server for it). Once the countdown
    hits 0 with no check-in, the next `sync_egg_progress` call (next app
    open) is what actually flips it to `'stalled'` — the countdown is a
    warning, not itself the trigger.
  - `'stalled'` eggs: *"You forgot to check in, egg stopped growing."* with
    an **Incubate** button calling `incubate_curio_egg`.
  - `'hatched'` eggs: transient — cleared from the stalled/incubating list
    once the reveal below has played, no separate hatched-list needed
    (the resulting curio just shows up in My Team/bench like any other).
    Before it clears, the status/reveal copy names the hatched curio
    explicitly (*"Your egg hatched into &lt;name&gt;!"*) — the name is
    looked up client-side from `ALL_MONSTERS[egg_species_id].name`, no new
    column needed since `egg_species_id` is already stored on the row.
  - Needs a new `EGG_SPRITE_SRC: Record<Element, string>` map alongside the
    existing `ELEMENT_ICON_SRC`
    ([lib/monsterConfig.ts:27](../lib/monsterConfig.ts)). Art already
    exists at [public/eggs/](../public/eggs/) — one PNG per element:
    `egg_fire_NO_COIN_TRUE_TRANS_200px.png`, `egg_leaf_200px.png`,
    `egg_light_200px.png`, `egg_shadow_200px.png`, `egg_storm_200px.png`,
    `egg_water_200px.png`. Note the fire file has a different naming
    pattern than the other five (`NO_COIN_TRUE_TRANS` suffix vs. the plain
    `egg_<element>_200px.png` convention) — either rename it to match
    before wiring up `EGG_SPRITE_SRC`, or just hardcode the odd filename
    for the `fire` entry in the map.
- **Hatch reveal — a dedicated ceremony, not just a toast.** The underlying
  state flip (`status = 'hatched'`) happens server-side inside
  `sync_egg_progress` the moment the streak hits 5, but the player-facing
  moment is a new `EggHatchModal.tsx`, shown next time the Hatchery (or the
  app generally) notices the new `hatched` status — same "detect on load,
  play once" pattern `GraduationCeremonyModal.tsx` and `TutorRollModal.tsx`
  already use for their reveals. Sequence:
  1. The egg's element sprite (from `EGG_SPRITE_SRC`) centered, at rest.
  2. It **splits into two halves** and separates (top half slides/rotates
     up-and-out, bottom half down-and-out) — a shake/wobble beat first
     would sell it, matching the "charge" beat `TutorRollModal.tsx` already
     does before its reveal.
  3. The hatched curio's sprite fades/scales in from behind the gap,
     revealing name + species.
  4. The **quality roll lands right after**, reusing `TutorRollModal.tsx`'s
     existing tier-glow treatment (green/cyan/orange per tier) so a lucky
     hatch reads as visually exciting the same way a lucky Tutor roll does.
  - Asset-wise, [public/eggs/](../public/eggs/) currently only has one
    whole-egg PNG per element — no pre-split "shell halves" art. Two
    options, either is fine for a v1:
    (a) **Pure CSS split** of the existing single PNG — `clip-path` (or two
        `<img>` copies each clipped to its own half) + a translate/rotate
        transition on each half. No new art needed, matches how the rest of
        this app's ceremonies are CSS/JS driven rather than sprite-sheet
        driven.
    (b) Author actual top-half/bottom-half shell art per element later for
        a more polished crack, and swap it in without touching the modal's
        logic.
  Recommend (a) to ship without blocking on more art, revisit (b) as
  polish.
- **Claim confirmation.** Since claiming is one-time and irreversible per
  curio, the "Claim Egg" button should open a small confirm step (not fire
  `claim_curio_egg` straight off the tap) — mirrors how other one-way
  actions in this app (graduation, Tutor rerolls) already gate behind a
  confirm/reveal modal rather than an instant click. Doesn't need to spoil
  what's inside — species mystery is part of the appeal — just confirm
  intent ("Lay this curio's egg? This can only happen once.").
- **Compendium / first-catch handling.** A hatched curio is functionally a
  new caught curio of `egg_species_id` — it should trip whatever
  first-time-caught logic already exists (Compendium unlock, catch
  notifications, etc.) exactly the same as catching that species any other
  way. No new logic needed here, just don't bypass the existing path when
  inserting the hatchling's `user_monsters` row — worth double-checking
  during implementation that nothing about the egg-hatch insert path
  skips it.

## Open items before implementation

1. Species content: chains are empty until Rowil populates them via the new
   admin tool — until then, no curio anywhere is actually egg-ready (fails
   the `EXISTS (curio_egg_chains ...)` check), which is safe/expected.
2. Hook point for `sync_egg_progress` — needs to piggyback on whatever code
   path currently updates `user_last_login`, to be identified during
   implementation.
3. Normalize `egg_fire_NO_COIN_TRUE_TRANS_200px.png`'s filename (or account
   for it explicitly in `EGG_SPRITE_SRC`) — see "Player-facing UI" above.
4. Hatchling *sprite* per element (post-hatch, the actual creature art) is
   separate from the egg PNGs above and still needs sourcing — the egg
   assets only cover the unhatched state.
5. `admin_upsert_egg_chain` should reject a `predecessor_species_id` that
   belongs to `GUILD_MONSTERS` or `EVENT_MONSTERS` — those are meant to be
   granted only through their own special-acquisition paths (guild level-5
   grant, event participation), not obtainable as a random hatch. The admin
   UI's predecessor dropdown should filter them out entirely rather than
   relying on the admin to know not to pick one.
6. Verify during implementation whether the graduation-ceremony code path
   ever sets `graduation_tier` on a guild-companion's `user_monsters` row.
   It shouldn't (guild curios evolve via the separate `guildEvolution`
   field, not `graduation`) — but if it turns out to, that's a second,
   independent reason (beyond "no chain entry exists") a guild curio could
   never actually become egg-ready, so worth a quick confirmation rather
   than assuming.
7. No cap on simultaneous incubating eggs — a player can have as many
   in-progress eggs as they have graduated, eligible curios. Flagging only
   because it wasn't explicitly decided; revisit if it turns out to clutter
   the Hatchery.
