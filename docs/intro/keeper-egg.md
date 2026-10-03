# Keeper's Egg ("come back tomorrow")

After a player's first win, at the next calm moment on the Board, the Lorekeeper gives them a
**Keeper's Egg**. It hatches a random starter Curio on their **third check-in day**. The sequence
also teaches how the real egg system works and ends on the daily checklist.

**Why:** only about 6% of new kids came back on day 2 (usage data, 2026-09-30). This gives every
kid a reason to come back tomorrow, with a visible payoff on each return.
Plan: `docs/intro/sequence-roadmap.md`.

## Decisions (user, 2026-10-03)
- Hatches after **3 check-in days** (day 1 counts on the day it's given).
- **A missed day pauses** the egg: no progress while away, it continues on the next visit, never
  resets or stalls. (Graduation eggs keep their original 5-day, stall-on-gap rules.)
- Hatches a **random starter**, preferring one the player doesn't own yet.
- **Existing and new players** who haven't had one yet. One Keeper's Egg per player, ever.
- **Trigger** (chosen on game-standard grounds): right after the first win (any XP), at the
  next calm moment on the Board (no quest, intro, tutorial, boss intro or hatch reveal open),
  after a 1.2 s pause. It rides the win and lands before the kid leaves; 6 of 7 kids who finish
  the intro's training quest stopped on the Board right after.

## How it plays
1. **The gift:** the egg rises from the Ledger; the kid taps it 3 times to warm it ("It moved!").
2. **The days:** a 3-day meter (Today, Tomorrow, Hatch day) with day 1 already checked; a missed
   day is explained as the egg waiting. Button: "I'll be back tomorrow!"
3. **Reminders** (only when the device can actually ask): turn on push, with the existing 300
   gold bonus. Skipped on devices that can't (e.g. iPhone Safari outside the Home Screen app).
4. **How eggs really work:** some Curios can lay eggs; they grow from quests, battles and Training
   Map scrolls; graduate at level 20 with a Graduation Scroll; three levels later a Curio that can
   lay eggs is ready, and that egg takes five days in a row. The kid taps a path of Level up →
   Graduate → Lay an egg, starting from their own lead Curio. The numbers come from the game's
   real rules (`GRADUATION_LEVEL_REQUIREMENT`, `eggReadyLevel`).
5. **Daily checklist:** "the more days in a row, the more gold" → opens the To-Do tab (where the
   existing checklist spotlight tutorial takes over on a first visit).

**Day two:** a short scene shows the egg wiggling with 2 of 3 days lit ("Just one more day"),
once per day, then offers today's checklist. **Hatch day** uses the existing hatch ceremony.

The egg-laying lesson says *some* Curios can lay eggs on purpose: today only Coralyn, Darkkor,
Duskral and Solarch have egg chains, so 5 of the 6 starters can't (see Improvement spots in the
roadmap).

## Code
- Sequence + day-two scene: `components/intro/KeeperEggSequence.tsx`; script `lib/intro/keeperEgg.ts`.
- Trigger and wiring: `components/Dashboard.tsx` (the egg is read after the daily egg sync).
- Hatchery shows the Keeper's Egg with its own day count, a "?" instead of the species (it's a
  surprise), and "check in tomorrow" instead of a deadline.
- Database: `supabase/migrations/20261003120000_keeper_egg.sql` adds `kind` + `hatch_days` to
  `curio_eggs`, `grant_keeper_egg()`, and a `sync_egg_progress` that uses each egg's own day count
  and lets keeper eggs wait. pgTAP: `supabase/tests/database/keeper_egg.test.sql`.
- Preview: `/dev/ui-gallery` → "Keeper's Egg" (skips the real grant).
- Analytics: `keeper_egg_granted`, `keeper_egg_reminders`, `keeper_egg_completed`,
  `keeper_egg_skipped`, `keeper_egg_beat_viewed`, `keeper_egg_return_viewed`.

## Art
Reuses finished intro scenes for now (`ledger_hall`, `keepers_call`, `solarch_restored`); the egg
sprite is drawn over them. The `keepers_call` scene is busy behind the egg, so dedicated art would
help later.

## Voice script
Lorekeeper = **Gideon - Pirate** (0.34 / 0.70), same workflow as the other sequences
(`tools/split_intro_vo.py` reads `lib/intro/keeperEgg.ts`). Record in this order:

| Clip id | Speaker | Line | Chars |
|---|---|---|---|
| `ke_gift_1` | Lorekeeper | Well done today, Keeper. Before you go, the Ledger has a gift for you. | 70 |
| `ke_gift_2` | Lorekeeper | A Keeper's Egg. The Curio inside only wakes for a Keeper who keeps coming back. Tap it to keep it warm. | 103 |
| `ke_gift_3` | Lorekeeper | Do you feel that? It moved! | 27 |
| `ke_days_1` | Lorekeeper | Come back tomorrow, and the day after. On your third day, your egg will hatch into a new Curio. | 95 |
| `ke_days_2` | Lorekeeper | Busy one day? Don't worry. Your egg will wait for you, and it won't forget a single day you came. | 97 |
| `ke_remind_1` | Lorekeeper | Want a reminder so your egg never gets lonely? Turn on reminders, and you'll get three hundred bonus gold too. | 110 |
| `ke_grow_1` | Lorekeeper | Here's a secret. Some Curios can lay eggs of their own, once they grow strong enough. | 85 |
| `ke_grow_2` | Lorekeeper | Your Curio grows from every quest you finish, every battle you win, and every scroll you answer on the Training Map. | 116 |
| `ke_grow_3` | Lorekeeper | At level twenty, a Graduation Scroll lets it graduate into a stronger form. | 75 |
| `ke_grow_4` | Lorekeeper | Three levels later, a Curio that can lay eggs will be ready. That egg hatches after five days in a row. Tap each step. | 118 |
| `ke_daily_1` | Lorekeeper | One more thing. Every day you come back, finish your daily checklist. The more days in a row, the more gold you earn. | 117 |
| `ke_back_1` | Lorekeeper | You came back, Keeper! Your egg is wiggling. Just one more day. | 63 |
| `ke_hatch_1` | Lorekeeper | Your Keeper's Egg remembered every day you came back. Say hello to your new Curio! | 82 |

**Total: 13 clips, 1158 characters**, all the Lorekeeper. `ke_hatch_1` plays in `EggHatchModal`
when the Keeper's Egg hatches (recorded separately, 2026-10-03, same voice and settings).

**Recorded 2026-10-03:** one 84 s take (Eleven v4, Generation 1), split into
`public/sounds/voice/intro/ke_*.mp3`. Every clip verified against its line (worst similarity 0.92,
from Whisper writing "twenty" and "three hundred" as digits).

Split ids, in order: ke_gift_1 ke_gift_2 ke_gift_3 ke_days_1 ke_days_2 ke_remind_1 ke_grow_1 ke_grow_2 ke_grow_3 ke_grow_4 ke_daily_1 ke_back_1
