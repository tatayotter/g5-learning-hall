# Learning Hall PH — UI Style Guide

**Read this before styling any quest, quiz, battle, or event screen.** It exists because Claude
has repeatedly reached for an older dark "dungeon" palette that was deliberately replaced —
most recently on the Topic Mastery Gauntlet (2026-08-28), which copied `BossFightScreen`'s dark
theme instead of the parchment palette everything around it already uses. Don't let it happen a
third time: check this file first, not habit or an old component you happened to copy from.

## The shell defaults to light now, and "white" means true white (2026-08-28)

Two related changes landed together:

1. **The outer shell** (Dashboard root, the world map, the battle stage frame) used to default to
   a dark "dungeon" look — that's gone. `components/Dashboard.tsx`'s root wrapper and no-data
   fallback screen are now `bg-white text-[#2a1505]`, matching the content panels described in the
   next section instead of contrasting with them.
2. **The parchment-tinted "white" token is retired.** `app/globals.css`'s DUNGEON RESKIN used to
   define `--color-white: #ede4d3` (a warm off-white) — every `bg-white`/`text-white`/
   `border-white` in the app baked to that tint. It's now `#ffffff`, true white. If you see
   `#ede4d3` anywhere, it's a leftover — flag it.

**Change (1) was a scoped, per-file edit, not a global token flip — change (2) was.** These
needed different techniques because `--color-black`/`--color-white`/`--color-neutral-*` are used
throughout the codebase for two unrelated purposes that happen to share the same names: (a) the
shell's dark/light mood, and (b) generic "real black/white" — `text-black` on a bright yellow
button, `border-black` comic-outline accents on already-light content, etc. Flipping
`--color-black` globally would have silently broken every (b) usage app-wide, so the shell's dark
surfaces were converted to explicit literal hex directly in their own files instead (`bg-black` →
`bg-white` etc., scoped to just that element) — `--color-black`/`--color-neutral-*` in
`app/globals.css` are still untouched. `--color-white`, on the other hand, has no such (b) usage
that depends specifically on the *off-white* tint (a pure-white card and a pure-white "text on a
dark button" both read fine), so flipping it globally was safe and is what actually reached every
`bg-white` across the whole app in one edit — including ones this pass didn't touch by hand.
**One exception**: `components/admin/**` (`/tatayadmin`) had already been decoupled onto literal
hex during the shell migration (see below), so it kept its original off-white foreground
(`#ede4d3`) unchanged regardless of the token flip — matching admin's own "stays dark, unaffected"
rule.

If you're adding a new shell-level dark surface, follow pattern (1): don't lean on the bare
`black`/`neutral-*` utilities and expect them to mean "shell dark" — write the actual dark color
you want as a literal. Plain `bg-white`/`text-white` are safe to use anywhere and will always mean
true white now.

**Deliberately still dark — persistent overlays and scrims, regardless of the shell's theme:**
`SidebarRail.tsx`'s HUD stat bar and nav-drawer/logout scrims, `MapStage.tsx`'s map letterbox/
drawer/corner-tag chrome, `BattleStage.tsx`'s corner name tags and battle log toggle overlay,
`MonsterHpPanel.tsx`, `MapCanvas.tsx`'s in-canvas name tags, and the on-screen `Joystick.tsx` —
these all float directly over game art or dim the screen behind a modal, the same category as a
video player's control bar staying dark in an otherwise light app. Don't "fix" these to match the
now-light shell; they're pinned to explicit dark hex on purpose, for contrast over unpredictable
art/photo content underneath.

**Also excluded on purpose**: `/tatayadmin` (all of `components/admin/*`, `AdminDashboard.tsx`,
`TatayAdminPage.tsx`) stays dark — it's a separate internal tool, not the player-facing shell (see
"What this doc does *not* cover" below). The hero-select splash (`SplashScreen.tsx`) and the
loading screens (`LoadingScreen.tsx`) also stay dark/atmospheric on purpose — deliberate
title-screen moments using painted art that isn't theme-token-driven, a decision made explicitly
when this change shipped rather than an oversight.

## The two layers — don't flatten them into one

The app is **not** a single light-mode or dark-mode app. It's two deliberately different layers:

1. **The shell** — the outer Dashboard/map/HUD chrome, navigation, the world map. Now light/
   parchment by default (see above) — but still visually distinct chrome, not just "more content."
2. **Content panels floating on the shell** — quest cards, quiz/answer screens, study-session
   notes, battle screens, post-battle summaries, event cards. These are **parchment/light** —
   like a scroll or book the player opens. Now that the shell is also light, lean on borders/
   shadows/the specific parchment tokens below to keep panels reading as distinct objects
   sitting on the shell, not as a seamless continuation of it.

Getting this backwards (a dark panel floating on a dark shell, or an unstyled panel that's
indistinguishable from the shell around it) is the exact mistake this doc exists to prevent — it's
specifically what shipped wrong on the first Gauntlet build.

**One documented exception**: the Term Boss Fight (`BossFightScreen.tsx`, "The Forgetting")
keeps its dark/purple horror treatment deliberately — the boss's whole narrative conceit is
mist and corruption creeping over the game. That's an intentional exception for one
specific atmospheric set-piece, not a second default. Everyday quests, quizzes, and reviews
(including the Gauntlet) are calm, ordinary content — they get parchment, not horror styling.
Same for the "Special Event"/event-teaser cards on the board tab (`Dashboard.tsx`'s
`activeEvent` card) — a deliberately moody, gilded-treasure-chest look, independent of the shell.

## Parchment palette — copy these tokens exactly

These are real hex values pulled from shipped code
(`git show dfda0a3` — "Fix: quest/battle parchment theme" — is the source commit; `QuestModule.tsx`,
`components/battle/*.tsx`, and `Dashboard.tsx`'s quest-panel sections are the reference
implementations). Don't approximate with Tailwind's stock `amber-*`/`stone-*` scale — the app
uses these specific custom hex values everywhere, and mixing in stock ambers reads as a
mismatched third palette.

### Backgrounds

| Token | Hex | Use |
|---|---|---|
| Main card fill | `bg-[#f0ddb8]` | The primary parchment card body (quest panels, "Prepare for Battle" screens, study-session containers) |
| Nested/inset panel | `bg-[#e8d0a0]/60` | A box *inside* a parchment card (e.g. the notes/markdown container inside a quest card) |
| Pure white panel | `bg-white` | Battle screens, quiz question cards, post-battle summary — anywhere content needs to read as crisp rather than "aged paper" |
| Soft cream inset | `bg-[#f5f0e8]` | A scrollable sub-panel inside a white panel (battle log, avatar fallback background) |
| Success panel | `bg-[#e8f5e0]` with `border-green-700` | Quest-completed / perfect-score panel |
| Pending panel | `bg-[#f0ddb8]` with `border-[#8b5e2a]` | Offline/awaiting-grading state |

### Borders

| Token | Hex | Use |
|---|---|---|
| Standard border | `border-[#c9a87a]` | Default border on cards, dividers (`hr`), table rules |
| Heavy border | `border-[#8b5e2a]` | Main card outline (pairs with `bg-[#f0ddb8]`), primary button bg |
| Accent border | `border-[#c9781a]` | Selected/active state, hover state |

### Text

| Token | Hex | Use |
|---|---|---|
| Primary text | `text-[#2a1505]` | Headings, body copy that needs to read as "ink on paper" |
| Strongest emphasis | `text-[#1a0d05]` | `<strong>` inside markdown |
| Body text | `text-[#3a2610]` | Paragraph copy, list items |
| Muted/label text | `text-[#6b4820]` | Timestamps, subtitles, secondary info, placeholder-ish text |
| Accent heading | `text-[#7a4a0f]` | `h3`, "IN PROGRESS" pill text, section labels |
| Gold accent | `text-[#c9781a]` | XP callouts, active/selected emphasis (also used as `bg-[#c9781a]/20` for tinted backgrounds) |

### Semantic feedback — stays standard Tailwind, not re-themed to brown

| State | Classes |
|---|---|
| Correct answer | `bg-green-100 border-green-600` (or `bg-[#e8f5e0] border-green-700` for a full completion panel) |
| Wrong answer | `bg-red-100 border-red-500`, text `text-red-700` |
| Default/unanswered option | `bg-white border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#f0ddb8]` (or `bg-[#f0ddb8] border-[#c9a87a] hover:bg-[#e8c88a]` for options sitting directly on a parchment card, per `QuestModule.tsx`) |
| Selected (before grading) | `bg-[#c9781a]/20 border-[#c9781a]` |

### Element-matched colors (battle skill buttons only)

From `ActionTile`'s `element` prop (`components/battle/BattleStage.tsx`) — pastel bg + matching
border, one shade darker on hover:

| Element | Classes |
|---|---|
| fire | `bg-orange-100 border-orange-400 hover:bg-orange-200 hover:border-orange-500` |
| water | `bg-sky-100 border-sky-400 hover:bg-sky-200 hover:border-sky-500` |
| leaf | `bg-green-100 border-green-500 hover:bg-green-200 hover:border-green-600` |
| storm | `bg-yellow-100 border-yellow-500 hover:bg-yellow-200 hover:border-yellow-600` |
| shadow | `bg-purple-100 border-purple-400 hover:bg-purple-200 hover:border-purple-500` |
| light | `bg-amber-100 border-amber-400 hover:bg-amber-200 hover:border-amber-500` |
| *(no element / default tile)* | `bg-white border-[#c9a87a] hover:bg-[#f0ddb8] hover:border-[#c9781a]` |

### Buttons

| Purpose | Classes |
|---|---|
| Primary CTA that starts something consequential (enter a quiz, begin battle) | `bg-blue-600 hover:bg-blue-500 text-white` — blue survives as the one non-parchment accent for "go" actions, don't convert it to brown |
| Secondary / "return to map" / dismiss | `bg-[#8b5e2a] hover:bg-[#6b4820] text-white` |
| Ghost / "go back" text button | `text-[#6b4820] hover:text-[#2a1505] font-bold` |

## Worked reference: `QuestCard.tsx`

`components/QuestCard.tsx` is a good sanity check for the image-backed parchment look: every
subject renders as an illustrated scene image (`cardBg`) with a white radial vignette over the art
and `text-amber-900` text. Subjects without a `SUBJECT_STYLE` entry fall through to
`DEFAULT_STYLE`, which reuses the Weekly Review art rather than a separate look — as of
2026-08-29 there is only one card style, not a real/fallback split, so there's nothing to avoid
copying here.

## Checklist before shipping a new quest/quiz/battle-adjacent screen

1. Is this an everyday quest/quiz/review screen, or a deliberately atmospheric set-piece like
   the Term Boss Fight? Only the latter gets dark styling.
2. Does the outer shell around it stay dark (the map/HUD you're floating this panel on top of)?
   Don't lighten that.
3. Does the panel itself use the parchment tokens above — not stock Tailwind `neutral-*`/`gray-*`
   darks, not stock `amber-*`, but the specific hex values in this doc?
4. Do correct/wrong/selected states use the semantic feedback classes, not custom brown-tinted
   ones?
5. If there's an attack/skill button tied to a monster element, does it use the element-matched
   pastel set instead of a flat parchment tile?

## What this doc does *not* cover

- Admin dashboard screens (`components/admin/*`) — those intentionally stay dark/neutral, they're
  a separate internal-tool surface, not player-facing content.
- The public marketing/blog site (`app/blog/*`) — has its own established look.
- Cosmetic purchasable themes (`lib/themeShop.ts`, `THEME_CATALOG`) — a different, opt-in
  system layered on top of a player's own HUD, unrelated to this doc's default palette.
