# Navigation redesign: audit and rollout plan

Status (2026-10-13): mockup only (`components/dev/NavRedesignMockup.tsx`, live in `/dev/ui-gallery`
under "Navigation redesign (MOCKUP)"). Nothing here is wired into the real game yet. This file is
the checklist the real build has to meet, and the plan for turning it on one kid at a time.

The redesign replaces the compass drawer (`components/SidebarRail.tsx`) and the Curio Arena's
second floating menu (`ARENA_TABS` in `components/MonsterGuild.tsx`) with five tabs:
**Today, Side Quests, Curios, Journal, Vault**, plus a small menu for everything else.

## 1. Every current screen has a home

Nothing in today's game may be left without a way to reach it. Old `?tab=` values (push
notification links, the tab remembered in `sessionStorage`) map through `LEGACY_TAB_TO_NEW` in the
mockup file, so no old link lands on a blank screen.

| Today's screen or popup | Where it lives now | Where it goes |
| --- | --- | --- |
| Main Quest board (`board`): week's quests, Weekly Review | Compass > Main Quest | **Today**, "This week's Main Quests" |
| Event quests + Topic Mastery Gauntlet | Main Quest board | **Today**, event card (only while an event runs) |
| Term boss (TrialBoard, BossFightScreen) | Main Quest board | **Today**, boss card (only while open) |
| To-Do checklist + daily bonus claim (`todo`) | Compass > To-Do | **Today**, first card; pinned on the right at 1200px+ |
| Keeper egg (hatch streak) | Arena > Hatchery, red dot | **Today**, egg countdown card (planned "egg countdown"); Hatch card when ready |
| Daily gift (planned) | not built | **Today**, top card |
| Welcome card, referral key, push opt-in, install nudge, link-parent banner | Board / Dashboard, can stack | **Today**, ONE nudge card at a time, always last |
| Side Quest guilds (`guilds`) | Compass > Side Quests | **Side Quests** tab; "Next" opens the next unplayed guild |
| Curio Arena (`monster`): World Map, Training Map, wild encounters | Compass > Curio Arena, then Arena menu | **Curios** tab opens on the World Map |
| Team, Catch Inbox, curio training, Missions | Arena menu > My Team | Curios > Team (map edge) |
| Trade | Arena menu > Trade | Curios > Team, a button per curio |
| Hatchery | Arena menu | Curios > Hatchery (map edge) |
| Compendium | Arena menu | Curios > Compendium (map edge) |
| Trainers, live battles, dummy/Tatay battles | Arena menu > Trainers | Curios > big Battle button > sheet |
| Leaderboard | Arena menu | Curios > Ranks (map edge) and the Battle sheet |
| Journal + Player Log (`journal`) | Compass > Journal | **Journal** tab |
| Reward Vault, shop, themes, reward claims (`vault`) | Compass > Reward Vault | **Vault** tab; the gold chip also opens it |
| Profile, achievements, alert settings (`profile`) | Compass > Profile | Menu > Profile (also: tap your name) |
| Codex (`codex`) | Compass > Codex | Menu > Codex |
| Bonus Quests / MTAP (`bonus_quests`) | Compass > Bonus Quests | Menu > Bonus Quests |
| Notification inbox | HUD bell | HUD bell (unchanged), opens a Messages sheet |
| Save status + Save now (offline play) | Compass drawer | Menu (phone/tablet) or "Sound & saving" (sidebar); also a chip in the top bar while there's no internet |
| Music/sound sliders | Compass drawer | Same place as save status |
| Log out (with unsaved-play warning) | Compass drawer | Menu > Log out on every layout |
| Live battle invite | 15 s toast, Arena only | Toast on any tab; small "After this" chip during an activity |
| Full-screen popups (daily bonus, egg hatch, curio reveal, achievements, event announcement, graduation, celebrations) | over everything | Unchanged: they sit above the nav |
| Tutorial spotlights | anchor on rail/FAB ids | Tabs carry `data-tutorial-id="nav-<tab>"`; the Arena tutorial step that points at `monster-open-menu` must point at the map-edge buttons instead |

## 2. Gaps the first mockup had, and what changed

1. **Events, the term boss and nudges had no home.** Today now has fixed slots in a fixed order:
   gift, egg, To-Do, event, boss, classmate online, Main Quests, one nudge.
2. **No "no internet" design.** One strip under the top bar says what still works, and every button
   that can't work shows "🔒 Needs internet" instead of failing. Two cases: kids with offline play
   (quests, guilds, map, trainers work) and kids without it (look only).
3. **Shared tablets.** Log out lived only in the phone menu sheet; the desktop sidebar had it but no
   warning. Now Log out is reachable on every layout and keeps today's warnings (no internet, N things
   saved only on this device).
4. **Desktop had no sound or save status.** "Sound & saving" in the sidebar opens them.
5. **The bell did nothing.** It opens Messages and clears its count.
6. **Profile, Codex, Bonus Quests were dead ends.** They open as a page with Back; the tab bar stays
   with no tab lit; Android back closes them.
7. **Small phones and tablets lying sideways weren't covered.** Two new presets (360x640, 1024x768),
   and one layout rule, `navLayoutFor(width, height)`, decides bar / rail / sidebar. The To-Do pins
   only from 1200px, so a sideways tablet keeps a usable content column.
8. **Tap targets.** Inline buttons were 25-30px tall, the gold chip 24px, desktop menu rows ~32px,
   sliders 24px. Everything is now 44px or more.
9. **Tiny text.** Tab labels, badges and chips were 9-10px. Now 11px minimum.
10. **Disabled buttons hid their reason** (faded to unreadable). Lock reasons now sit outside the
    button at full contrast.
11. **Screen readers.** Every icon-only control has a name ("Messages, 2 new", "Curios, something
    new"), the nav is labelled, sheets are dialogs, the logout warning is an alertdialog.
12. **Motion.** Sheets and tab fades follow the device's reduce-motion setting.
13. **Red dots that can't be cleared.** An egg that still needs days is a countdown card, not a dot.
    The Today tab shows the to-dos left, then a dot for an unopened gift.
14. **Phone held sideways.** The big Battle button covered a map pin; it moves to the corner on
    short screens.

## 3. Layout rule

```
width >= 1024              -> sidebar (desktop, tablet lying sideways)
width > height, height<500 -> side rail (phone held sideways)
otherwise                  -> bottom tab bar ("roomy" icon+label from 600px)
To-Do pinned right         -> sidebar AND width >= 1200
```

Run it from a resize listener in the real build so rotating a tablet just works. The bottom bar adds
`env(safe-area-inset-bottom)`; the kid shell has no safe-area handling today.

## 4. With no internet

| Thing | Offline play on | Offline play off |
| --- | --- | --- |
| Main Quests, guilds, Training Map, trainer battles | Works, saves here | Needs internet |
| Live battles, invites, Ranks, Trade | Needs internet | Needs internet |
| Term boss, event quests, Bonus Quests | Needs internet | Needs internet |
| Daily bonus claim, daily gift | Needs internet (waits) | Needs internet (waits) |
| Vault buying | Look only | Look only |
| Journal | Words stay in the box; Save when the internet is back | same |

Today's real game doesn't guard the journal, daily bonus or Vault offline (they just fail to save);
the real build must add those guards, not only the new nav.

## 5. Game moments

Unchanged from the first mockup: during a quiz, guild run, battle, Training Map or wild encounter the
nav hides on every device, a focus bar shows one exit, leaving takes two taps with the real cost
spelled out, live battles only have Surrender. Android back closes the top-most thing first (dialog,
keyboard, sheet, menu page, game moment), then the previous tab, then Today, and only then offers
to close the game.

## 6. Rollout: one kid at a time, behind `new_nav`

Same switch as offline play (`feature_flags`, `lib/featureFlags.ts`).

1. **Build behind the flag, old nav untouched.** A new shell (`components/nav/`) built from the
   mockup's pieces, wrapping the existing tab components (DailyChecklist, BoardMapView, GuildsTab,
   MonsterGuild, JournalTab, VaultTab...) without changing them. `Dashboard.tsx` picks the shell with
   `hasFeatureFlag(userId, 'new_nav')`. Both shells share `activeTab`, mapped through
   `LEGACY_TAB_TO_NEW`, so push links work in both. Migration: `insert into feature_flags (key)
   values ('new_nav') on conflict do nothing` (starts off; additive only).
2. **Things the real build needs that the mockup only fakes:** the live-battle invite listener moved
   out of `MonsterGuild` so invites work on every tab; Android back via `@capacitor/app`'s
   `backButton`; keyboard detection via `visualViewport`; safe-area insets; offline guards for
   journal, daily bonus and Vault; the Arena tutorial step re-anchored; `OfflineBanner` replaced by
   the strip.
3. **Test before each step, no manual testing:** the mockup audit
   (`/mnt/project-files/nav-mockup/e2e/audit.test.js`, 200 checks), then the same checks against the
   real shell with the fake-Supabase harness, the offline e2e suite, and the Android e2e workflow
   (back button, keyboard).
4. **Turn on in steps:** the family accounts first (desktop, daily players) for a few days, then the
   offline-play allowlist, then a share of new sign-ups, then everyone. Compare kids with and without
   the flag on: daily bonus claims, day-2 returns, first quest finished.
5. **Undo:** set the flag to `off`; each kid goes back to the old nav on their next online load
   (a kid who stays offline keeps the new nav until then). Delete the old nav only after two stable
   weeks on `everyone`.

The planned daily gift and egg countdown should be built as Today cards in the new shell, so they are
built once.
