# Story sequences: what they teach, and what to build next

Learning Hall teaches its game systems through voiced, interactive story sequences: the kid
*acts out* the lore (opens the Ledger, refuses the Forgetting, loses to Tatay) instead of reading
a manual. This file tracks which features each sequence covers, which features nothing teaches
yet, and candidate sequences ranked by how much they should move the usage numbers.

Last updated 2026-10-03, after battle training was built.

## The three sequences we have

| Sequence | Who sees it, when | Production sheet |
|---|---|---|
| **First-curio intro** (origin story, starter pick, training quest) | Any account with no curio, before anything else | `docs/intro/first-curio-intro.md` |
| **Battle training** (Tatay's challenge, element lesson, Training Dummy) | First Curio Arena visit until finished; replayable from Trainers | `docs/intro/battle-training.md` |
| **Term Boss intro** ("The Trial of the Forgetting") | Once per player, grade and term, when the Term Boss event goes live | `docs/intro/term-boss-intro.md` |

Plus lighter **first-visit spotlight tutorials** (`TutorialSpotlight`, no voice) on the board,
guilds and Curio Arena tabs (the Arena one now waits until battle training closes).

## Coverage map

✔ = taught by acting it out, ○ = mentioned only, blank = not taught.

| Feature | First-curio intro | Battle training | Term Boss intro |
|---|:-:|:-:|:-:|
| Lore: the Ledger, Keepers, the Forgetting, why learning matters | ✔ | ○ | ✔ |
| The five Guilds exist (one per subject area) | ✔ | | |
| Choosing a first curio | ✔ | | |
| Main quest flow: study notes, then quiz, all correct to win | ✔ | | |
| Rewards: XP, Gold, curio EXP from quests | ✔ | ○ | |
| Weekly quests on the Campaign Map / Board | ○ | | |
| Battle basics: skills ask questions, more questions = stronger | | ✔ | ○ |
| Perfect hits, partial damage on some wrong answers | | ✔ | ✔ |
| Skip a question for gold | | ✔ | |
| Simultaneous turns, speed decides who strikes first | | ✔ | |
| HP, fainting, losing when the whole team faints | | ✔ | ○ |
| Rest, Items, Switch | | ✔ | |
| Skills unlock by curio level ("Unlocks at Lv.X") | | ✔ | |
| Elements and matchups (the element chart) | | ✔ | |
| Losing is normal; come back stronger | | ✔ | ✔ |
| Challenging other Keepers (PvP) and the Training Dummy | | ○ | |
| Term-end review: one shadow per subject | | | ✔ |
| Hearts, combos, studying and retrying after running out | | | ✔ |
| Freeing a sealed rare curio by clearing all shadows | | | ✔ |

## Features nothing teaches yet

Grouped by where they live. Each is a candidate for a sequence or, if small, a coach tip.

**Coming back every day (the retention loop)**
- Daily checklist on the To-Do tab, its streak and the streak's gold
- Curio eggs: the check-in streak advances eggs and hatches new curios (Hatchery,
  `docs/curio-egg-mechanism-design.md`)
- Push notifications (opt-in card on the Board)

**The family loop**
- Linking a parent (Parent Quest: 2 Growth Pills + 100 gold), the parent dashboard, the parent
  seeing progress. PvP is gated behind a linked parent.

**Guilds**
- The five Guild mini-games (Lorekeeper, SpellCaster, Number Realm, Logic Labyrinth, Lexicon
  Arena), guild levels and tiers, guild curios that evolve with guild level

**Growing curios**
- Team slots vs. benched curios; Missions (idle expeditions for benched curios)
- Teaching and unlearning skills in the Compendium
- Growth Pills, curio quality tiers and Tutoring (Tomes of Knowledge), graduation tiers
- Duplicate catches: keep as a spare or convert to gold

**Exploring and catching**
- The Training Map and World Map regions, walking around
- Wild encounters from answering scrolls, catching wild curios, the Compendium dex

**Spending and economy**
- The Vault (real-world rewards bought with gold, supplied by the parent)
- The Monster Shop and battle items (potions, Attack Scroll, Iron Shield)

**Social**
- Leaderboard, classmates on the map, live battle invites from real players
- Trading curios with other players, the Recycler (trash for gold)

**Other**
- Journal, Codex, Profile and achievements, Bonus Quests (enrichment packs)
- The Mastery Gauntlet (term-break event built from the kid's own mistakes)

## Candidate sequences, ranked

Ranked by the usage data (2026-09-30 / 10-02): 70% of new kids never start a quiz, only about
6% come back on day 2, parent-linked kids retain about 7x better, 79% skip the origin story, and
most kids who finish the training quest stop on the Board right after.

**Lesson from that data:** put the teaching in the parts the kid *does* (taps, choices, real
UI), not in narration, because most kids skip narration. And end every sequence by dropping the
kid into the next real action.

### 1. "Come Back Tomorrow" (the daily loop): highest priority
- **Goal:** fix day-2 return (6%).
- **When:** the end of the kid's first real session (after the first main quest, or on leaving
  the Board the first time).
- **Teaches:** the daily checklist and its streak gold, the egg that hatches if they come back,
  and turning on reminders.
- **Shape:** short (3 beats). The Lorekeeper hands the kid a **curio egg** that "needs a Keeper
  who returns": the kid taps to warm it, sees a 3-day streak meter with day 1 already lit, and
  is asked to turn on reminders ("so your egg doesn't go cold"). A day-2 mini-scene on the next
  login: the egg cracks a little, day 2 lights up, and today's checklist opens.
- **Needs:** an egg grant tied to the intro (check `docs/curio-egg-mechanism-design.md` for how
  eggs are granted today), plus the existing push opt-in.

### 2. "Show Your Parent" (the Parent Quest)
- **Goal:** more parent links (about 7x retention; zero child-initiated links so far).
- **When:** right after the first main-quest win, while the kid is proud of something.
- **Teaches:** why a parent matters (Vault rewards they supply, PvP unlocks, the parent sees
  progress), and exactly how to show them.
- **Shape:** Tatay (Rhonn Mercene) speaks directly: "Every Keeper has a family behind them."
  The kid picks a reward their parent can give them in the Vault, then gets a big "Show your
  parent" card with the link. The 2 Growth Pills + 100 gold are previewed as the prize.
- **Ties in** the Vault, so it also covers spending.

### 3. "The Guild Halls"
- **Goal:** guild play beyond main quests; teaches subject practice.
- **When:** first Guilds tab visit (replaces or follows today's spotlight tutorial).
- **Teaches:** each Guild is a subject mini-game, guild levels and tiers, and that a guild curio
  evolves as its guild levels up.
- **Shape:** the five Guardians each give one line as the kid lights their hall (reuses the
  origin story's "light the Guilds" idea), then one coached 3-question round in the kid's grade's
  first open guild.

### 4. "Wild Curios"
- **Goal:** map exploration and catching.
- **When:** the kid's first wild encounter on the Training Map.
- **Teaches:** scrolls on the map, wild encounters, catching, the Compendium dex, duplicates.
- **Shape:** coach tips over the real encounter (like battle training), a short Damien line
  ("A wild one! Answer to calm it down"), and a Compendium reveal at the end.

### 5. "Raising Your Curio"
- **Goal:** the curio-growth systems, which are the main gold sinks.
- **When:** when the kid owns a second curio, or their first curio first reaches a skill-unlock
  level.
- **Teaches:** team vs. bench, Missions for benched curios, teaching a skill in the Compendium,
  Growth Pills, quality and Tutoring, graduation.
- **Shape:** several small coached moments spread over time rather than one long story
  (too many systems for one sitting).

### 6. "Challenge a Keeper" (first real PvP)
- **Goal:** the social loop.
- **When:** the first live battle invite from a real player or bot classmate, after battle
  training.
- **Teaches:** invites, classmates, the leaderboard, the daily PvP gold.
- **Shape:** very short: battle training already taught the fight itself.

### 7. "The Mastery Gauntlet"
- **Goal:** term-break engagement.
- **When:** when the Gauntlet event starts (the term-break counterpart to the Term Boss intro).
- **Teaches:** the Gauntlet is built from your own mistakes; mistakes are what to practice.
- **Shape:** the Forgetting gloating over the kid's own wrong answers, which the kid then
  "takes back". Note: the Tarsipling term-break narrative is a separate idea, on hold.

### Smaller: coach tips, not full stories
- Trading and the Recycler, the Journal, the Codex, Profile and achievements, Bonus Quests.
  These are easy to understand from the UI; a first-visit spotlight tip is enough.

## The reusable kit (how a new sequence gets built)

- **Story player:** `StoryPlayer` in `components/intro/OriginStory.tsx` (beats, voiced captions
  one box at a time, skip button, custom interactions via `renderInteraction`, sprites drawn
  over the art via `renderOverlay`).
- **Coaching over real UI:** `CoachTipOverlay` and the queue in
  `components/monster/BattleTraining.tsx`, fed by `LiveBattleScreen`'s `onCoachMoment`. Tips
  spotlight `data-tutorial-id` targets and wait for "Got it".
- **Cast and voices** (ElevenLabs Eleven v4, Generation 1, free voices only, numbers as English
  words): the Lorekeeper = Gideon - Pirate (0.34 / 0.70), Tala = Lulu Lolipop, Damien = Quang
  Anh, the Forgetting = Silent Systemus – Sovereign Protocol, Tatay = Rhonn Mercene -
  Conversational (default settings).
- **Recording:** one paragraph per speaker joined with " ... ", download Generation 1, split with
  `tools/split_intro_vo.py` (keep each voice line a one-line object literal in the script file).
  A sequence runs about 2,000–3,000 characters; the free plan has 10,000 credits a month.
- **Art:** 16:9 pixel art matching `public/intro/ledger_hall.webp`, captions over the bottom
  35%, keep important things near the horizontal center (phones crop to the middle slice).
  Where a sprite stands is a one-number setting in code, so regenerate art only for content.
- **Analytics:** every sequence fires beat-viewed, skipped and completed events; check them
  about a week after launch.
- **One-time rewards** go through a server function with its own completion table (see
  `supabase/migrations/20261003100000_battle_training_completion.sql`), never a client flag.
