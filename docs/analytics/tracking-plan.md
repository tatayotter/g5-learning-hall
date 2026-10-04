# Tracking plan

What Learning Hall measures, why, and how each feature gets a keep / improve / remove call.
Every analytics event in the codebase is listed here. **Adding or renaming an event means
updating this file in the same PR.**

Saved queries for the SCSSES launch cohort: [scsses-launch-cohort.sql](scsses-launch-cohort.sql).

## 1. Where events live

One first-party table, `public.analytics_events` (Supabase). No third-party analytics runs on
any screen a child uses. Vercel Analytics and GA load only on the adult marketing pages
(`components/MarketingAnalytics.tsx`).

| Column | Meaning |
|---|---|
| `user_id` | Child: `children.id` (the app user id). Parent: `parents.id::text` (auth uid). |
| `session_id` | Random per browser tab session (`sessionStorage`). |
| `event_name` | `object_action`, snake_case. |
| `properties` | Event fields, plus on every client event: `display_mode` (browser / installed / twa), `device` (android / ios / desktop) and first-touch `utm_*` / `fbclid` when present. |
| `app_tab` | Kid tab the event happened on, `'parent'` for parent events, null otherwise. |
| `is_family` | True for the founder's family accounts. **Exclude these from every analysis.** |
| `client_ts` / `created_at` | Device time / server time. Use `created_at`, bucketed in `Asia/Manila`. |

Writers (`lib/analytics.ts`):

- `trackEvent(name, props, appTab?)`: kids. No-op before login.
- `trackParentEvent(name, props)`: parents. Keyed on the auth uid. Accepted by RLS only when
  that uid has a `parents` row (migration `20261004120000`). Before 2026-10-04 every
  client-side parent event was rejected.
- `trackClientError(source, error)`: crashes, from a child or a parent session.
- `useScreenTime(screen, emit)` (`hooks/useScreenTime.ts`): active time per screen.
- Server-side inserts: `app/api/child-signup/route.ts`, plus the parent-link SQL functions.

## 2. Rules

- **Name** events `object_action` in the past tense or as a state: `quest_completed`, `tab_view`.
  Reuse an existing name plus a property rather than inventing a near-duplicate.
- **Privacy.** Never put names, usernames, PINs, emails, phone numbers, free text a child typed,
  or full URLs (pathname only) in `properties`. IDs are fine; they're already the row key. The
  repo is public, so example queries and reports use aggregates only.
- **Never break gameplay.** Writers are fire-and-forget and never throw.
- **Session-replay and third-party trackers stay off kid screens.** The Philippine Data Privacy
  Act (RA 10173) treats children's data as needing parental consent; first-party and minimal is
  the standard.

## 3. Core metrics

| Metric | Definition |
|---|---|
| **Active (day)** | Any event that day (Manila date). |
| **Learned** | Any of `main_quest_completed`, `guild_quiz_complete`, `event_quiz_completed`, `intro_training_completed`. |
| **Activation** | Learned on the signup day. |
| **D1 / D7 / D30 return** | Active on day 1 / any of days 1-7 / any of days 8-30 after signup. |
| **North star** | Weekly learners: kids who *learned* on at least one day in the week. |
| **Engaged time** | Sum of `screen_time.duration_ms`. Active time only: gaps over 2 min without input are idle. |
| **Parent-linked** | Child row has `parent_id`. Parent-linked kids returned about 7x as often in the 2026-09-30 funnel; always split retention by this. |

Read week-1 numbers from a school launch as inflated by novelty and teacher push. Week 3-4
retention is the real signal. Cohorts are small (dozens to low hundreds), so A/B tests aren't
meaningful yet; compare cohorts before and after a change instead.

## 4. Event catalog

Volumes are non-family events over the 30 days to 2026-10-04 ("new" = shipped 2026-10-04, no
data yet).

### Session and navigation

| Event | Fires when | Properties | 30d (events / users) |
|---|---|---|---|
| `session_start` | First login per browser session | - | 197 / 100 |
| `login` | Kid picks their account | - | 84 / 25 |
| `tab_view` | Kid tab becomes active (`app_tab` = tab) | - | 834 / 110 |
| `screen_time` | A screen is left, hidden or closed | `screen`, `duration_ms` | new |
| `client_error` | Uncaught error, rejected promise, or render crash | `source` (window / promise / boundary / global_boundary), `message`, `name`, `stack`, `path`, `digest` | new |

`screen_time.screen` for kids: the tab key (`board`, `todo`, `journal`, `monster`, `profile`,
`codex`, `guilds`, `vault`, `bonus_quests`, ...) or `quest_study` / `quest_ready` / `quest_quiz`
while a main quest is open. For parents: `parent_home`, `parent_child`, `parent_pricing`,
`parent_shop`, `parent_shop_pack`, `parent_my_secs`.

### Signup and first session

| Event | Fires when | Properties | 30d |
|---|---|---|---|
| `child_self_registration_submitted` | Kid self-registers (server) | source, attribution | 99 / 99 |
| `intro_started` | New player with no curio enters the intro | `new_player` | 48 / 45 |
| `intro_beat_viewed` | Each story beat shown | `beat`, `index` | 239 / 45 |
| `intro_skipped` | Story skipped | `at_beat`, `index` | 27 / 27 |
| `intro_story_completed` | Story finished | - | 14 / 14 |
| `starter_curio_claimed` | First curio picked | `source` | 36 / 36 |
| `intro_training_submitted` | Training quiz attempt | `perfect`, `attempt`, `grade` | 69 / 32 |
| `intro_training_completed` | Training quiz passed | `attempts`, `grade`, `handoff` | 25 / 25 |
| `intro_training_skipped` | Training skipped | `phase`, `attempts` | 7 / 7 |
| `intro_first_quest_handoff` | Sent into first real quest | `quest` | 20 / 20 |
| `tab_tutorial_step_viewed` | Spotlight tutorial step shown | `tab`, `step`, `stepId` | 308 / 95 |
| `tab_tutorial_completed` / `tab_tutorial_skipped` | Tutorial finished / skipped | `tab`, `atStep` | 44 / 30, 120 / 70 |

### Learning

| Event | Fires when | Properties | 30d |
|---|---|---|---|
| `main_quest_completed` | Daily main quest passed | `subject`, `attempts`, `xp_earned`, `gold_earned` | 22 / 16 |
| `guild_level_up` | Level up after a main quest | `new_level` | 3 / 3 |
| `guild_quiz_start` | Guild quiz started | `guild_key` | 65 / 12 |
| `guild_quiz_complete` | Guild quiz finished | `guild_key`, `correct_count`, `wrong_count`, `xp_earned`, `gold_earned` | 112 / 12 |
| `guild_session_record_failed` | Guild session failed to save | `guild_key`, `permanent`, `message` | 0 |
| `event_quiz_completed` | Custom event quiz passed | `event_id`, `subject`, `attempts` | 0 |
| `event_reward_claimed` | Event or gauntlet reward claimed | `event_id` | 0 (1 on 09-10) |
| `event_quest_locked_encountered` | All event quests already done | `event_id`, `reason` | 0 |
| `daily_checklist_bonus_claimed` | Daily checklist bonus | `gold_earned`, `streak` | 0 (1 on 09-19) |

### Curios, battle, economy

| Event | Fires when | Properties | 30d |
|---|---|---|---|
| `battle_training_started` / `_declined` | Tatay training offered | `replay`, `resumed` | 8 / 4, 8 / 3 |
| `battle_training_beat_viewed` / `_story_skipped` | Training story beats | `beat`, `index` / `at_beat` | 17 / 4, 1 / 1 |
| `battle_training_tatay_done` / `_dummy_done` | Each training fight ends | `won`, `attempt` | 3 / 3 each |
| `battle_training_tip_viewed` / `_tip_done` | Element tip shown / dismissed | `tip`, `ms` | 40 / 4 each |
| `battle_training_completed` | Training finished | `replay`, `bonus_paid` | 3 / 3 |
| `curio_arena_battle_start` / `_end` | Live PvP battle | `battle_id`, `end_reason`, `winner_id` | 0 |
| `keeper_egg_granted` | Keeper's Egg given | `new_grant`, `element` | 3 / 3 |
| `keeper_egg_beat_viewed` / `_skipped` | Egg story beats | `beat` / `at_beat` | 9 / 3, 1 / 1 |
| `keeper_egg_reminders` | Reminder opt-in answered | `enabled` | 0 |
| `keeper_egg_return_viewed` | Egg progress seen on return | `progress` | 0 |
| `keeper_egg_completed` | Egg hatched | - | 2 / 2 |
| `shop_purchase_attempt` | Curio shop buy | `item_key`, `cost`, `success` | 35 / 3 |
| `shop_purchase_blocked_insufficient_gold` | Buy blocked: not enough gold | `item_key`, `cost`, `short_by` | 0 |

### Install and parent linking (kid side)

| Event | Fires when | Properties | 30d |
|---|---|---|---|
| `install_nudge_shown` / `_opened` / `_dismissed` | Add-to-home-screen nudge | `platform` | 27 / 18, 8 / 8, 6 / 6 |
| `install_prompt_result` | Native install prompt answered | `outcome` | 1 / 1 |
| `pwa_installed` | App installed | - | 2 / 1 |
| `parent_cta_opened` | "Show a parent" CTA opened | - | 0 |
| `parent_cta_invite_sent` | Kid sent a parent invite | - | 0 |
| `parent_link_requested` / `parent_link_confirmed` | Link flow (SQL functions) | ids | 1 / 1 each |

### Parent (all new 2026-10-04, `app_tab = 'parent'`)

| Event | Fires when | Properties |
|---|---|---|
| `parent_registration_submitted` | Parent signs up (rejected by RLS until 2026-10-04) | `source`, attribution |
| `parent_login` | Parent signs in | - |
| `parent_dashboard_viewed` | Dashboard loaded (approved parents) | `children`, `premium` |
| `parent_child_opened` | Child detail page opened | `child_id` |
| `parent_pin_revealed` | Child PIN shown | `child_id` |
| `parent_insight_opened` | Journal or weak topics opened (Premium) | `insight`, `child_id` |
| `parent_locked_feature_tapped` | Free parent taps a Premium-locked row | `feature` (journal / weak_topics / compare_children) |
| `parent_sheet_opened` | Any sheet opened | `sheet` (addChild / compare / bug / delete / lessons) |
| `parent_child_added` | Child added from the dashboard | `grade` |
| `parent_checkout_started` | Checkout button pressed | `kind` (premium / childSlot / sec_pack), `from`, `pack_id` |
| `parent_coins_awarded` | Coins sent to a child | `amount`, `child_id` |
| `parent_email_optin_changed` | Email updates toggled | `opted_in` |
| `parent_page_viewed` | Pricing / shop / pack / My SECs opened | `page`, `pack_id` |
| `parent_link_clicked` | FB group, Messenger or support email tapped | `target` |
| `parent_bug_report_sent` | Problem report sent | - |
| `parent_signed_out` | Sign-out confirmed | - |

## 5. Keep / improve / remove

Each feature gets two numbers per weekly cohort:

- **Adoption:** % of that week's active kids (or parents) who used it at least once.
- **Repeat use:** among those users, average distinct days used per week.

Plus one tie-breaker: **retention lift**, the D7 return rate of kids who used the feature in
their first week vs. those who didn't. It's correlation, not proof, but a feature that's low
adoption and high lift is worth surfacing.

| Adoption | Repeat use | Call |
|---|---|---|
| 40%+ | 2+ days/week | **Keep, invest**: core loop. |
| 40%+ | under 1.3 days | **Improve the experience**: people try it and don't come back. |
| under 15% | 2+ days/week or clear retention lift | **Improve discoverability**: the people who find it love it. |
| under 10% | low, no lift, after 4 weeks | **Remove candidate**: confirm with 3-5 kid or parent observations before cutting. |

The thresholds are starting points for a small app; revisit after the first 4-week review.

Two exceptions:
- **The learning core is never a removal candidate.** Main quests, the intro training and guild
  quizzes are the product. For these the question is *how to raise completion*, measured by
  activation and `quest_study` to `quest_quiz` drop-off.
- **Monetization features** (Premium, child slots, SEC packs) are judged on
  `parent_locked_feature_tapped` and `parent_checkout_started` relative to parents active, not on
  adoption.

### Per feature

| Feature | Adoption signal | Depth / success signal | Question it answers |
|---|---|---|---|
| Main quests (board) | `tab_view` board, `quest_study` | `main_quest_completed`; `quest_study` to `quest_quiz` time and drop-off | Do kids finish the daily lesson? Where do they quit? |
| Intro + first curio | `intro_started` | `intro_story_completed` vs `intro_skipped`; `intro_training_completed`; `intro_first_quest_handoff` | Does the intro lead to a first real quest? |
| Tab tutorials | `tab_tutorial_step_viewed` | completed vs skipped, step reached | Do tutorials teach or get skipped? (120 skips vs 44 completes so far) |
| Guilds | `tab_view` guilds, `guild_quiz_start` | `guild_quiz_complete` / start, correct rate, days per user | Is optional practice used beyond the main quest? |
| Curios / monster tab | `tab_view` monster | battle training completion, shop purchases, arena battles | Does collecting drive return visits? (returners used it 69% vs 18% in the 09-30 funnel) |
| Battle training | `battle_training_started` vs `_declined` | `_completed`, tip time | Is the coached fight worth its length? |
| Keeper's Egg | `keeper_egg_granted` | `keeper_egg_return_viewed`, `_completed`, D1/D2 return | Does "come back tomorrow" bring kids back? |
| Todo / journal / codex / vault / profile | `tab_view` per tab | days per visitor, `screen_time` | Each tab on the adoption x repeat grid |
| Bonus quests / SEC packs | `tab_view` bonus_quests; `parent_page_viewed` shop | `parent_checkout_started` sec_pack | Is anyone buying or using enrichment packs? |
| Install nudge | `install_nudge_shown` | opened, `pwa_installed`, D7 by `display_mode` | Does installing raise retention? |
| Parent link CTA | `parent_cta_opened` | `parent_link_confirmed`; retention of linked vs unlinked | Can kids bring parents in? (0 child-initiated links so far) |
| Parent dashboard | `parent_dashboard_viewed` | `parent_child_opened`, insights, `screen_time` parent_child, return visits | Do parents come back to check progress? |
| Premium | `parent_locked_feature_tapped`, `parent_page_viewed` pricing | `parent_checkout_started` premium | Which locked feature creates purchase intent? |

## 6. Review cadence

- **Launch day (2026-10-05):** instrumentation health check plus baseline (scheduled report).
- **Weekly:** activation, D1, errors, screen-time outliers.
- **Week 4 (around 2026-11-02):** first keep / improve / remove review using section 5.
  Write the decision and the numbers behind it into `docs/analytics/reports/`.
- Pair each review with a few observations of real kids or parents using the app. The numbers
  show *what*; watching shows *why*.

## 7. Known gaps

- **No main-quest start event.** Completion is logged, abandonment isn't directly. Until a
  `main_quest_started` exists, use `screen_time` `quest_study` sessions with no matching
  `main_quest_completed`.
- **Tab actions are mostly untracked.** Todo, journal, codex, vault and profile only have
  `tab_view` and `screen_time`, not what the kid did there (e.g. journal entry written).
- **Parent data starts 2026-10-04.** Earlier parent behaviour can only be inferred from tables
  (`children`, `subscriptions`, `parent_link_requests`).
- **Event volumes are only reliable from the date each event shipped.** Check the first-seen date
  before comparing periods.
- **`analytics_events` is readable by the anon key** (policy `analytics_events_select_anon`).
  A fix is in progress in a separate task.
