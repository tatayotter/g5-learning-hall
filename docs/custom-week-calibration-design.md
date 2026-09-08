# Custom Week Calibration — Design & Build Ticket

Status: **Design only. Nothing implemented.**
Owner: Rowil
Last updated: 2026-09-08

## Background

Content today is authored and released week-by-week, in real time, on one shared
calendar for every child in a grade (`content_weeks`, keyed by `grade` +
`week_starting_date`, generated Sunday-by-Sunday — see
`memory/project_weekly_content_conventions.md`). School-year pacing (which BOW
topic belongs to which real week) comes from a single hardcoded anchor,
`SCHOOL_OPEN_MS` in `lib/promptBuilder.ts`, matched to the public-school DepEd
calendar.

That breaks for children whose actual school calendar doesn't match — most
concretely, a private-school child whose classes start up to ~2 months after
public school. The app would otherwise serve them content 2 months ahead of
what they've actually been taught.

**The business shift that makes this buildable:** starting next school year,
Rowil authors the full year's content for every grade up front, in one pass,
rather than week-by-week as the year unfolds. That removes the constraint that
made per-child pacing expensive — a calibrated child, early or late, always
resolves to a `content_weeks` row that already exists, because the whole
year's rows already exist. Non-paying parents keep following the default
DepEd-based schedule at no cost to them or to Rowil (same as today, just
pre-authored instead of generated week-by-week).

## Decisions (confirmed with Rowil)

- **Sold as a Premium perk**, gated behind the existing `subscriptions` table
  / `isPremium` check already driving other perks (coin pool, add-on child
  slots — see `app/parent-dashboard/page.tsx:69`). No new billing plumbing.
- **Calibration input is a single Math-topic picker, not a date field, on
  purpose.** A parent knows "what lesson is my child on in Math" without
  having to go check anything; a raw start-date question would feel like prep
  homework. Math is deliberately used as a proxy for the child's whole-week
  pace — the app has one shared weekly package per grade covering all
  subjects together, so there is no per-subject pacing to represent even if
  we asked about every subject.
- **Weekly drip is preserved, unconditionally.** Calibration changes *whose
  calendar* a child's "current week" is measured against; it never removes
  the one-school-week-per-real-week gate. This is intentional — it's both the
  anti-progress-exploit mechanism and the actual pacing mechanism for
  learning, and nothing in this feature is allowed to bypass it.
- **One-time calibration, with a 7-day grace window, then locked for the
  school year.** No self-service recalibration after that. See "Exploit
  policy" below — this was the deciding factor against any always-editable
  design.
- **Pace drift over the year is an accepted v1 limitation.** No resync UX is
  being built now. A single manual admin override (below) covers both the
  post-grace-window correction case and genuine mid-year drift, instead of
  building two mechanisms.
- **Term-scoped systems (guild question pools, Boss Fight) must auto-derive
  their term from the calibrated week**, not read a separately-maintained
  global. See "Term-derivation inventory" below — this was found during
  design review, not part of the original ask, but is required for the
  feature to actually work end-to-end.

## Data model

```sql
-- content_weeks: add a stable curriculum-position key alongside the existing
-- real-date key. Backfilled via the same formula lib/promptBuilder.ts already
-- uses (schoolWeekFromDate), so every already-authored week gets a value with
-- no re-authoring.
alter table content_weeks add column school_week integer;

-- children: nullable — null means "use the default DepEd anchor for this
-- school year," i.e. today's behavior, at no cost to free-tier parents.
alter table children add column week1_date date;
alter table children add column week1_locked_at timestamptz; -- set once the
  -- 7-day grace window closes; null = still editable by the parent.
alter table children add column week1_calibration_source text; -- e.g.
  -- 'math_topic:grade5:wk9-10' — stores which topic answer produced this
  -- date, for support/audit, not for runtime logic.
```

An admin-only override path (see "Exploit policy") edits `week1_date` directly
after `week1_locked_at` is set, and must write an audit row (who, when, old
value, new value) — reuse whatever audit pattern the admin dashboard already
has for other manual overrides, or add a minimal `admin_action_log` insert if
none exists yet.

## Calibration UI (parent-facing)

1. Parse each grade's Math BOW markdown into an ordered list of topic entries
   — `{term, weekStart, weekEnd, title}` — using the same `**WkX-Y: Title.**`
   bullet convention `extractBowSummary` already relies on
   (`lib/promptBuilder.ts:82`). Write this as a small sibling parser
   (`extractBowTopics`) rather than duplicating the regex inline — both should
   share the underlying bullet-matching logic.
2. Parent (Premium only) sees a dropdown of topic titles in curriculum order:
   "What is your child currently learning in Math?"
3. On selection, show the 1-2 topics immediately before/after the pick for a
   quick sanity check ("does this look right?") before confirming — cheap
   insurance against an honest mis-click, given the parent may not always be
   completely sure.
4. On confirm: map `(term, weekStart)` → absolute `school_week` (inverse of
   `weekToTermInfo`, e.g. Term 1 Wk9 → school_week 10, per the
   `schoolWeek - 1 = termWeek` relationship in `lib/promptBuilder.ts:62`).
   Range picks resolve to the range's start (conservative — assumes the child
   just started that topic).
5. Compute and store `week1_date = today − (school_week − 1) weeks`. Clamp so
   the resulting `school_week` never exceeds the current real school_week —
   a parent picking a not-yet-reached topic has nothing to resolve to.
6. Start the 7-day grace window (`week1_locked_at = null` until it elapses).

## Runtime resolution

- **Effective school_week for a child** = `school_week` computed from
  `children.week1_date` if set, else from the default DepEd anchor (today's
  `SCHOOL_OPEN_MS`-equivalent for that school year).
- **Content fetch** (`app/api/content/route.ts`, `hooks/useWeeklyData.ts`):
  resolve `content_weeks` by `(grade, school_week)` instead of
  `(grade, week_starting_date)`, using the child's effective school_week.
  Free-tier children's effective school_week always equals the real-time
  value, so this is a no-op change in their observed behavior.
- **Social features stay on the real shared calendar, deliberately.**
  Leaderboards, PvP, sibling battles, bot-classmate challenges, and the
  weekly journal all continue to key off `startOfWeek(today)` exactly as
  today. Only the Main Quest lesson/quiz content and term-scoped systems
  below read the per-child anchor. This avoids desynchronizing two calibrated
  siblings (or a calibrated child and their classmates) out of features that
  assume a shared cohort.
- **Weekly drip gate is unchanged in shape**, just reads the personalized
  anchor: unlocked-through-week = `floor((today − effective_week1_date) / 7)
  + 1`, capped exactly as it is today.

## Term-derivation inventory (found during design review)

`lib/guildConfig.ts:4`'s `CURRENT_TERM` is a manually-bumped global constant.
Four runtime, per-child consumers currently read it directly and would show a
calibrated child the wrong term's content the moment `CURRENT_TERM` is bumped
for everyone else:

- `hooks/useBossFightProgress.ts:20` — scopes `boss_persona_defeats` query
- `components/Dashboard.tsx:466,483,488` — boss pool counts, cutscene-seen gating
- `components/GuildPoolStats.tsx:45` — guild question-pool stats query
- `components/monster/BossFightScreen.tsx:288,317` — question pool fetch,
  `claim_boss_persona_victory` RPC's `p_term` param

Three admin-authoring consumers stay manual (they tag content at authoring
time, not runtime) but need an explicit term selector rather than defaulting
silently, since authoring is no longer synchronized with "the term happening
right now" once a full year is authored in advance:
`components/admin/BossFightSection.tsx`,
`components/admin/DraftQuestionsSection.tsx`,
`components/admin/QuestionBankSection.tsx`.

Checked and confirmed unaffected: `lib/leaderboard.ts` (no term/week keying —
cumulative), `BREAK_WEEKS` in `components/admin/ContentMatrixSection.tsx`
(real-date-keyed but only drives the admin's own authoring-skip UI).

**Fix, and why it needs to go further than "swap the import":**

1. Remove `CURRENT_TERM` as an importable runtime value. Replace it with one
   function, `getEffectiveTerm(...)`, as the only way to obtain a term number
   client-side (for display/labels only — see next point).
2. **Move the authoritative term computation server-side for anything that
   writes or gates access.** `claim_boss_persona_victory` and the pool-fetch
   RPCs currently trust a client-supplied `term`/`p_term` with no server-side
   cross-check (`supabase/migrations/20260825000004_draft_questions_term_boundary.sql:33`).
   Change these to look up the calling user's own `week1_date` /
   subscription status server-side (via `auth.uid()`) and compute the
   expected term inside the function body, ignoring or validating against any
   client-supplied value. This closes both the accidental-bug case (a client
   forgets to use the derived helper) and the tampering case (a modified
   client sends an arbitrary term) in one move, and is more robust than
   relying on lint rules alone.
3. Add an ESLint `no-restricted-imports` rule blocking any runtime import of
   the raw constant outside the three admin-authoring files, so a future
   regression fails CI instead of shipping silently.
4. **One-time reconciliation pass** before cutover: for every existing
   `boss_persona_defeats` row (pre-calibration, so all on the default
   anchor), recompute what the new formula would say for that real date and
   diff against the term actually recorded. Any mismatch is a day
   `CURRENT_TERM` was bumped early/late by hand — decide per-mismatch whether
   to leave history as-is (default) rather than silently rewriting it.
5. `boss_fights_status.boss_fights_enabled` stays a single global admin
   toggle, independent of term number, on purpose — Boss Fight *availability*
   is an admin-timed event for everyone; term-scoping only fixes *which
   term's* pool a child sees once it's on.

## Exploit policy (settled)

**Recalibration:** one-time answer at enrollment/premium activation, freely
editable for 7 days (`week1_locked_at` stays null), then locked
(`week1_locked_at` set) for the rest of the school year. No self-service path
after that.

Rejected alternatives and why: always-editable reopens the exact exploit
weekly drip exists to prevent (walking `week1_date` earlier repeatedly
unlocks the whole year). "Forward-only" edits (can only move `week1_date`
later) avoid that specific exploit but block the equally-legitimate
"we actually started earlier than I first said" correction, and are a
confusing rule to explain to a parent in the one sentence this feature is
supposed to fit in.

**Pace drift:** accepted as a known v1 limitation, not designed around. Set
expectations at calibration time ("this sets your child's pace for the
school year"). Revisit only if real usage shows it's a common complaint.

**Shared release valve for both:** a single manual admin override — edit
`week1_date` directly in the admin dashboard after `week1_locked_at` is set,
writing an audit row. Deliberately friction-full (requires contacting
support) so it can't become a routine lever, but exists so no paying parent
is permanently stuck on a mis-click or genuine drift. One mechanism serves
both edge cases instead of building two.

## Grade promotion (open — needs a decision before next school year, not before v1 build)

Calibration doesn't automatically carry meaning across a grade promotion — a
child calibrated 3 weeks behind in Grade 4 needs an explicit decision at
Grade 5 enrollment: re-ask, carry the same offset forward, or reset to
default. Not a blocker for building this ticket, but must be decided before
the first grade-promotion cycle after launch, or every calibrated family
silently reverts to default with no notice.

## Prerequisites before this is safe to ship

1. **This year's full content library must actually be finished** for every
   grade before selling the perk — once sold, a calibrated parent can land on
   any week in the year on day one, so authoring gaps are no longer caught by
   "real time hasn't reached that week yet."
2. Term-derivation inventory items above (server-side term lookup, lint
   guard, reconciliation pass) — required for the feature to work correctly,
   not just nice-to-have hardening.

## Build checklist

- [ ] Migration: `content_weeks.school_week` (backfilled), `children.week1_date`,
      `children.week1_locked_at`, `children.week1_calibration_source`
- [ ] `extractBowTopics()` parser (sibling to `extractBowSummary`)
- [ ] Parent calibration UI (Premium-gated), with sanity-check preview step
- [ ] Content route + `useWeeklyData` resolution by `school_week`
- [ ] Server-side term lookup in `claim_boss_persona_victory` and pool-fetch RPCs
- [ ] Remove `CURRENT_TERM` runtime export; add `getEffectiveTerm()`; ESLint guard
- [ ] Admin term-selector UI for the 3 authoring-time consumers (no more silent default)
- [ ] Historical `boss_persona_defeats` reconciliation pass (report, not auto-fix)
- [ ] Admin override UI for `week1_date` post-lock, with audit logging
- [ ] 7-day grace window enforcement (`week1_locked_at` set by a scheduled job or on-read check)
