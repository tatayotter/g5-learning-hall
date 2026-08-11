# Weekly Progress System Redesign — Migration Plan

Status: **Draft — not started.** No schema or code changes have been made yet.
Owner decisions locked in during brainstorm (2026-08-11): full redesign, content/progress split,
lifetime-cumulative counters, normalized content tables, grade-keyed content ownership,
server-side week identity.

## 1. Why

Current system: single `weekly_packages` table, keyed `(user_id, week_starting_date)`, holding
both admin-authored quiz/quest content (`package_data` JSON blob) and player progress
(`character_stats`, journal, achievements, ~13 weekly counters) in the same row. Content is
shared across "classmates" via a `contentSourceId` indirection (one student's row acts as the
canonical content source for others in the same grade).

Known failure modes (see full findings in chat history / project memory
`project_term_boss_fight.md` for boss-fight consumer context):

1. "Current week" is computed independently client-side in 5+ files (`date-fns` `startOfWeek`) —
   no server-side source of truth. Client clock skew silently writes/reads the wrong week.
2. Carry-forward picks the previous week via `ORDER BY week_starting_date DESC LIMIT 1` — no
   explicit chain, no validation it's the immediately preceding week.
3. `character_stats IS NULL` is an overloaded sentinel for "admin pre-staged, not started." This
   caused a real incident (referenced in `useWeeklyData.ts` comments) that reset two students'
   levels to defaults.
4. Two different "get current stats" queries (`useWeeklyData.ts` exact match vs.
   `ChildProgressPanel.tsx` most-recent-≤-today) can disagree during rollover.
5. Only xp/gold (`character_stats`) is written atomically via RPC; journal/achievements/counters
   are blind `.update()` — last-write-wins.
6. Level-up math duplicated in TS and Postgres, hand-kept in sync.
7. Lifetime stats require summing every historical row (weekly counters reset to 0 each week).
8. No tracked migration exists for `weekly_packages` in `supabase/migrations/` at all — schema
   only exists live in Supabase.
9. Monster Arena "answered question" tracking hashes question *text* as a synthetic ID — editing
   wording resets answered-state for everyone.

## 2. Target architecture

### Content (admin-authored, grade-keyed, normalized, versioned)

```
content_weeks     (id, grade, week_starting_date, status: draft|published, created_by, created_at)
content_days      (id, content_week_id fk, weekday)
content_quizzes   (id, content_day_id fk, subject)
content_questions (id, content_quiz_id fk, prompt, options jsonb, correct_answer, sort_order)
```

- Content is owned by `grade`, not by a student. Removes the `contentSourceId` indirection
  entirely — every student in a grade reads the same `content_weeks` row.
- `content_questions.id` is a stable surrogate PK — fixes failure mode #9. Editing `prompt`
  no longer changes the ID.
- Public/student-facing read path is a view (`content_questions_public`) that omits
  `correct_answer`, replacing `weekly_packages_public`.
- `status: draft` replaces the `character_stats IS NULL` pre-staging sentinel (failure mode #3)
  — pre-staged content is just a draft-status row, no progress row implied or required.

### Progress (player-owned, not week-keyed)

```
player_progress         (user_id pk, level, xp, gold, <lifetime cumulative counters>, updated_at)
player_question_attempts(user_id, content_question_id fk, answered_at, correct, pk(user_id, content_question_id))
player_weekly_journal   (user_id, content_week_id fk, journal_logs, mastery_count, purchased_items,
                          honor_grants, achievements_delta, quiz_attempts, pk(user_id, content_week_id))
```

- `player_progress` is the single source of truth for level/xp/gold and **lifetime-cumulative**
  counters (`guild_sessions_count_total`, `monster_battles_won_total`, etc.) — replaces
  failure mode #7. "This week's" counters, if still needed for weekly-quest UI, are derived by
  diffing against a snapshot taken at week start (see open question in §5), not stored as a
  separately-reset column.
- `player_question_attempts` replaces the text-hash dedup (failure mode #9) with a real FK-backed
  fact.
- `player_weekly_journal` keeps genuinely per-week narrative data, FK'd to `content_weeks.id`
  instead of a loose date string — carry-forward becomes a real join on the FK chain, not
  `ORDER BY ... LIMIT 1` guessing (failure mode #2).

### Server-side week identity

- `current_week_start()` SQL function, fixed timezone (Asia/Manila), single source of truth.
  Every RPC computes the week server-side instead of trusting a client-supplied date string
  (failure mode #1, and the `trades.ts` "trust the client's Sunday" issue).
- All mutations become atomic RPCs: `apply_progress_deltas`, `record_weekly_event`,
  `grade_question` — no more blind client `.update()` for counters/journal (failure mode #5).

## 3. Migration phases

**Phase 0 — Safety net — DONE (2026-08-11)**
- Discovered the local repo was missing 138 of 139 live migrations (only `boss_fight_schema` was
  tracked). Full reconciliation via `supabase db pull`/`db dump` was blocked by Docker Desktop
  requiring hardware virtualization not enabled in this machine's BIOS/UEFI.
- Fallback taken: hand-wrote and applied
  [`supabase/migrations/20260811082838_baseline_weekly_progress_scope.sql`](../supabase/migrations/20260811082838_baseline_weekly_progress_scope.sql),
  an idempotent migration documenting (via live SQL introspection) only the objects this redesign
  touches: `weekly_packages`, `weekly_packages_public`, `grade_content_owners`,
  `user_completed_questions`, and their RPCs (`apply_character_deltas`,
  `increment_weekly_counter`, `grade_monster_question`, `grade_weekly_quiz`,
  `grade_weekly_review_quiz`, `strip_weekly_quiz_answers`, `admin_upsert_weekly_package_data`,
  `admin_set_character_stats`, `admin_award_gold`). Verified as a true no-op (row count unchanged
  at 159) before and after applying. Local and remote migration history now match for this scope.
- **Known gap, explicitly not resolved:** the other ~135 migrations outside this scope remain
  undocumented locally. Full reconciliation needs Docker Desktop (or `pg_dump`/`psql` some other
  way) and is tracked as a separate follow-up, not blocking this redesign.
- New discovery from introspection: `increment_weekly_counter` already computes "current Sunday"
  server-side via `date_trunc('week', CURRENT_DATE)` — but with no explicit timezone (uses the DB
  session default, not a deliberate `Asia/Manila` choice). This is partial prior art for
  `current_week_start()`, not a reason to skip building it properly. Also: only 5 of the 12
  weekly counters are reachable through this RPC's allowlist; the other 7 are written through
  other paths not yet located — worth a quick check before Phase 4's cutover of counter writes.

**Phase 1 — New schema, additive only — DONE (2026-08-11)**
- Applied [`supabase/migrations/20260811130000_add_progress_redesign_phase1_schema.sql`](../supabase/migrations/20260811130000_add_progress_redesign_phase1_schema.sql):
  `content_weeks`, `content_days`, `content_quizzes`, `content_questions` (+ `content_questions_public`
  view stripping `correct_answer`), `player_progress`, `player_question_attempts`,
  `player_weekly_journal`, plus `current_week_start()` (Asia/Manila, Sunday-start) and RPCs
  `apply_progress_deltas`, `record_progress_event`, `grade_content_question`,
  `admin_create_content_week`, `admin_publish_content_week`, `admin_set_content_day_quiz`.
  `weekly_packages` untouched, still live and unaffected — verified additive-only.
- RLS enabled and policies written for every new table in the same migration (per
  `feedback_supabase_rls.md`). `content_questions` deliberately has no client SELECT policy —
  reads only via `content_questions_public` or `grade_content_question`, same
  answer-hiding-via-view pattern `weekly_packages_public` already uses.
- Security advisor run post-apply: two findings, both pre-existing-pattern matches, not new
  risk — `rls_enabled_no_policy` on `content_questions` (intentional), and
  `security_definer_view` on `content_questions_public` (same ERROR-level flag
  `weekly_packages_public` already carries in production today).
- **Not yet done:** actually wiring any app code to these tables — that's Phase 4. Right now
  they exist and are empty/idle alongside the old system.

**Phase 2 — Backfill script — DONE (2026-08-11)**
- Discovery before writing the script: of the 135 distinct `weekly_packages` user_ids, only
  **10 are real durable accounts** (`damien`, `tala`, + 8 students resolvable in
  `children`/`classmates`). The other 125 are 120 ephemeral `demo_*` accounts (own
  expiry/rollup mechanism already exists) and 5 QA/E2E test fixtures. Decision: scope backfill
  to the 10 real accounts only, skip the rest entirely.
- Also discovered before running: only the 2 content-owner rows (`damien`=10, `tala`=6) have
  non-empty `package_data` — all 143 non-owner rows are `'{}'::jsonb` (content is virtual/shared
  at read time via `contentSourceId`, never duplicated into each student's own row). This
  simplified content backfill to just those 16 rows.
- Also discovered: `package_data` subjects carry a `summary_markdown` lesson field the Phase-1
  schema had no column for — fixed via
  [`20260811084115_add_summary_markdown_to_content_quizzes.sql`](../supabase/migrations/20260811084115_add_summary_markdown_to_content_quizzes.sql)
  before backfilling, so it wasn't silently dropped.
- Ran [`supabase/backfill/2026-08-11-phase2-backfill-real-accounts.sql`](../supabase/backfill/2026-08-11-phase2-backfill-real-accounts.sql)
  (idempotent, dry-run via `ROLLBACK` first, then committed). Result: 16 `content_weeks`, 56
  `content_days`, 106 `content_quizzes`, 1291 `content_questions`, 10 `player_progress` rows, 30
  `player_weekly_journal` rows. Spot-checked `fatty`'s lifetime level/xp/gold against a manual
  calculation from source rows — exact match. `weekly_packages` row count unchanged (159) —
  confirmed non-destructive.
- **Explicitly not migrated:** `player_question_attempts` — `user_completed_questions` stores a
  synthetic hash of question *text* as its id, with no reliable mapping to the new stable
  `content_questions.id` UUIDs. 2,797 existing records across 26 users were left behind;
  Monster Arena "already answered" state resets once the app cuts over. Documented as a
  one-time UX blip, not a data-loss risk (no xp/gold/level lives in that table).

Original Phase 2 design (superseded by the above once real data was inspected, kept for
context):
- One-time script (SQL or Node against Supabase) that reads every existing `weekly_packages` row
  and:
  - Deduplicates `package_data` per grade into `content_weeks`/`content_days`/`content_quizzes`/
    `content_questions` (published status), resolving the current `contentSourceId` mapping into
    "which grade's canonical content is this."
  - Sums each user's weekly counters across all their historical rows into
    `player_progress` lifetime totals; takes the most recent row's `character_stats` as current
    level/xp/gold.
  - Copies journal/achievements/mastery per (user, week) into `player_weekly_journal`, FK'd to
    the matching new `content_weeks.id`.
  - Rebuilds `player_question_attempts` best-effort from any existing `user_completed_questions`
    hash-based records (exact question match not guaranteed — flag ones that can't be resolved).
- Dry-run mode that reports counts/diffs without writing, run and reviewed before the real run.
- Runs against a Supabase branch/staging copy first (see `mcp__supabase__create_branch` in
  available tooling) — never directly against production on first attempt.

**Phase 3 — Dual-write cutover (safety window) — DONE (2026-08-11), via a different mechanism
than originally planned**
- Originally planned as manually duplicating writes at each of the ~8 TS call sites. Implemented
  instead as a single Postgres trigger
  ([`20260811140000_add_dual_write_sync_trigger.sql`](../supabase/migrations/20260811140000_add_dual_write_sync_trigger.sql)):
  `trg_sync_weekly_packages_to_progress` fires `AFTER INSERT OR UPDATE ON weekly_packages` and
  recomputes the affected user's `player_progress` lifetime totals + `player_weekly_journal` row
  from scratch every time. More robust than the original plan — it catches every write path
  (RPCs, admin tools, offline sync replay, boss fight claims, direct `.update()`s) uniformly,
  present or future, with no risk of a forgotten call site.
- New helper `resolve_user_grade(user_id)` scopes the trigger to the same "real accounts only"
  boundary as Phase 2's backfill (checks `grade_content_owners` then `children`/`classmates`;
  returns NULL — meaning "skip" — for demo/test/unknown users).
- Verified live: a zero-delta `apply_character_deltas` call on `fatty` correctly re-synced
  `player_progress` (same values, fresh `updated_at`). `resolve_user_grade` confirmed returning
  NULL for `demo_d1042a0e7a`/`curiotest` and the correct grade for `fatty`/`damien`.
- **Known limitation, accepted:** the trigger does NOT merge `achievements` (unlock-flag jsonb)
  going forward — Phase 4 will redesign achievement checks to read `player_progress`'s lifetime
  counters directly instead, making a mirror of the old per-week semantics moot. Anything
  unlocked between now and Phase 4 cutover won't show in `player_progress.achievements` until
  Phase 4 recomputes it.
- **Not done by this phase:** content authoring is NOT dual-written. Admin edits to
  `package_data` via `admin_upsert_weekly_package_data` still only land in `weekly_packages` —
  they don't automatically appear in `content_questions`. Any new content authored between now
  and Phase 4's admin-UI cutover needs either a manual re-run of the Phase 2 backfill approach
  or (better) for admins to start using `admin_set_content_day_quiz` directly for new weeks.
- Skipped: comparing old vs. new reads in a debug/admin view — not needed since the trigger's
  correctness was verified directly against source data (Phase 2's spot-check + this phase's
  zero-delta test), and no reads have moved yet.
- Security advisor run post-apply found two real issues, fixed immediately in
  [`20260811084850_harden_dual_write_sync_functions.sql`](../supabase/migrations/20260811084850_harden_dual_write_sync_functions.sql):
  `resolve_user_grade` had a mutable search_path, and the trigger function
  `sync_weekly_packages_to_progress` was directly callable via PostgREST by `anon`/`authenticated`
  (trigger functions don't need a direct EXECUTE grant to fire — revoked it). Re-verified the
  trigger still fires correctly after the fix.

**Phase 4 — Cut over call sites.** Superseded by a more detailed 3-wave plan written after
researching every actual call site — see `C:\Users\rowil\.claude\plans\lively-weaving-sutton.md`
(local to this machine) for the full plan. Summary of what shipped:

**Wave 1 (writes) — DONE (2026-08-11).** Sequenced before reads because the dual-write trigger
only mirrors whatever lands in `weekly_packages` — it doesn't prevent a bad write, so the actual
Tala/Damien-incident bug class needed the WRITE path fixed, not just a parallel read path.
- New/rewritten RPCs: `admin_set_progress_stats`, `admin_award_progress_gold` (new); `respond_to_trade`
  and `claim_boss_persona_victory` rewritten to drop `p_week_starting_date` and target
  `player_progress` — removes the last "trust the client's Sunday" call sites.
- Schema correction found mid-implementation: `mastery_count`/`purchased_items`/`honor_grants`
  are carry-forward (not weekly-reset) fields — moved from `player_weekly_journal`-only to
  `player_progress` (Phase 1 had placed them wrong).
- App call sites updated: `hooks/useWeeklyData.ts`, `lib/offlineSync.ts`, `lib/trades.ts` +
  `components/trade/TradePanel.tsx`, `components/monster/BossFightScreen.tsx` + its `app/page.tsx`
  call site, `components/admin/ToolsSection.tsx` + `app/api/admin-weekly/route.ts`.
- **Real bug caught during verification** (loading the actual browser preview and cross-checking
  against the splash screen, not by code review): `tala`'s `player_progress.level` was wrong (1,
  should be 9) because the trigger's "latest row with non-null `character_stats`" heuristic was
  fooled by a genuine pre-existing production anomaly — her `2026-08-16` (future) row has
  non-null but *zeroed* `character_stats` instead of staying NULL. Fixed in
  `20260811091658_fix_progress_sync_future_row_bug.sql`: constrained the lookup to
  `week_starting_date <= current_week_start()`, matching `SplashScreen.tsx`'s existing (correct)
  exact-current-week query; re-ran the corrective recompute across `player_progress`; verified
  fixed. **Flagged for Wave 2:** `lib/leaderboard.ts`'s dedup logic likely has the same latent
  flaw and needs re-verification against real data, not just a ported query shape.

**Wave 2 (reads) — DONE (2026-08-11).**
- `lib/lifetimeStats.ts` rewritten around a new `fetchPlayerProgress()` (full `player_progress`
  row) + `mergeProgressForAchievements()` helper; `fetchLifetimeBattleStats()` kept as a thin
  projection of the same fetch so `HeroProfile.tsx`'s "Lifetime" toggle needed zero changes.
- `lib/leaderboard.ts`: multi-row `weekly_packages` fetch + client-side "latest row wins" dedup
  → single `player_progress` read, no dedup needed.
- `components/ChildProgressPanel.tsx`: same swap; `perfect_quizzes` display relabeled "(career)"
  since it's now lifetime, not this-week.
- `components/HeroProfile.tsx`: "This Week" battle-record view kept exactly as-is per the locked
  decision (still reads the current week's `weekly_packages` row, unchanged — Wave 1 never
  touched how counters are written, so this remains correct with zero risk). Achievement
  criteria (`isEarned`) now check `player_progress` lifetime totals via the new merge helper,
  fetched eagerly (not gated behind the toggle, since achievements need it regardless).
- `components/AchievementsBoard.tsx`: same achievement-criteria swap; needed a new `userId` prop
  threaded from its one call site in `app/page.tsx`.
- `hooks/useWeeklyData.ts`'s write-path unlock-detection loop (`updateStatsAndJournal`): the
  harder case — achievement thresholds must reflect lifetime totals, but the 12 counters
  actually being written in this call are still this-week deltas. Solved by projecting
  `lifetimeTotal + (newWeeklyValue - oldWeeklyValue)` per counter using a `player_progress`
  snapshot fetched on mount and refreshed after each save — mathematically identical to what the
  Phase 3 trigger computes once the write lands, without needing a second round trip.
- **Two bonus fixes, same bug class as the Tala incident, found while sweeping for remaining
  `weekly_packages` stat reads:** `components/PlayerStatsPopup.tsx` had an even worse version of
  the "latest row" bug (no null-guard at all) — fixed. `components/SplashScreen.tsx`'s
  exact-current-week query wasn't buggy, but left a real gap: any user who hadn't yet logged in
  during the current week showed blank stats — fixed by moving to `player_progress`, verified in
  the browser (several accounts that showed "—" before now correctly show "Lvl 1").
- Verified in the browser preview: no compile/console/server errors; splash screen now shows a
  level for every account (including ones with no row for the current week yet); `AchievementsBoard`
  rendered a real computed count ("15 of 65 unlocked") using the new lifetime-based criteria.
  Couldn't click into a full account session (the two real accounts are password-protected and
  no credentials are available in this environment; declined to create a real throwaway child
  account in production or attempt password guessing) — relied on the above plus the extensive
  SQL-level verification already done for Waves 1/2's underlying data.

**Wave 3 (content) — DONE (2026-08-11).** The biggest wave — cut `package_data` over to the
normalized `content_*` tables with real stable question IDs everywhere.
- New RPCs: `grade_content_quiz` (batched, id-keyed grading — replaces `grade_weekly_quiz` AND
  `grade_weekly_review_quiz`, unifying Weekly Review into the same path as a normal quiz once
  questions carry real ids), `admin_set_content_week` (atomic whole-week authoring save),
  `admin_get_content_week` (passcode-gated read reconstructing the old paste-box shape, since
  `content_questions` has no client SELECT policy). `grade_content_question` (Phase 1) was
  amended to return `correct_answer` too — it was designed before any app code called it, and the
  Monster Arena battle UI needs to reveal the correct answer after each question, same as before.
- **Key design choice that kept this wave's risk low:** `hooks/useWeeklyData.ts`'s new
  `fetchGradeContent()` reconstructs the *exact same* `package_data` nested shape (weekday →
  subject → `{summary_markdown, quiz: [{id, question, options}]}`) from the normalized tables,
  grade-keyed instead of per-student. Every downstream consumer — `app/page.tsx`'s quest board,
  `MonsterGuild.tsx`'s `extractQuestions()`, `lib/weeklyReview.ts`'s synthesis — needed **no
  structural changes**, only how they grade (by `question.id` now, not text/position). This
  avoided the flat-list rewrite the original plan sketch assumed would be needed.
- `contentSourceId` fully deleted from `lib/userSession.ts` (field, cache, loader,
  `contentSourceForGrade`, all 4 assignment sites) — content reads are grade-keyed via
  `useWeeklyData`'s own `grade` (from `gradeToNumber(USERS[userId].grade)`).
- Monster Arena (`lib/guildEngine.ts`, `components/MonsterGuild.tsx`): `hashQuestionId`/
  `arenaQuestionText` deleted — answered-state now keys directly on `question.id`. Grading
  collapsed to `gradeMonsterQuestion(userId, questionId, selected)`, no more week param;
  `gradingUserId`/`weekStartingDate` props removed from the 3 battle screens
  (`TrainingMap.tsx`, `BattleScreen.tsx`, `LiveBattleScreen.tsx`) and the shared
  `BattleQuestionModal` — `weekStartingDate` stays on `MonsterGuild.tsx` itself only because
  `TeamPanel`'s (unrelated, out-of-scope) Tutor-Curio gold sync still needs it.
- `components/admin/PackagesSection.tsx` fully rewritten: owner-picker (grade→student) →
  grade-picker (`GRADE_LEVELS`), single-week editor now round-trips through
  `get_content_week`/`set_content_week`, plus a new **bulk import mode** (per the earlier
  clarification) — paste an array of `{grade, week_starting_date, days}`, validates the whole
  batch before saving anything, then saves week-by-week (each its own RPC/transaction) with a
  per-week success/failure report.
- **Verified end-to-end in the browser against real production data** (not just SQL): loaded the
  Main Quest board as a real logged-in account (`fatty`) — all 9 subjects across 5 days rendered
  correctly from the new tables; opened a Study Session and saw the exact real `summary_markdown`
  text; answered and submitted a full 15-question quiz through the actual UI → got
  **"❌ Not quite — 11/15 correct"** — then confirmed in the database that `player_question_attempts`
  recorded exactly 15 attempts / 11 correct, timestamped to the second. Zero console/server
  errors throughout.
- **Known gaps, not addressed this wave:**
  - The rewritten admin authoring UI (`PackagesSection.tsx`) was verified via direct RPC calls
    (`admin_get_content_week`/`admin_set_content_week`/passcode gate all confirmed working) but
    **not click-tested in the browser** — no admin passcode was available in this environment.
    Worth a manual pass before relying on it for real content authoring.
  - `grade_content_owners`, `weekly_packages.package_data`, and the old RPCs
    (`admin_upsert_weekly_package_data`, `grade_weekly_quiz`, `grade_weekly_review_quiz`,
    `grade_monster_question`) are now fully unused by app code but still exist live — intentionally
    left alone (Phase 5 "decommission" is explicitly a later, separate step after a full
    week-rollover observation period).
  - Achievement threshold rebalancing for lifetime counters remains deferred, as decided back in
    Phase 1.
  - The offline shell (`offline-shell/app/page.tsx`) is a separate app and was not touched —
    flagged as out of scope throughout, same as Wave 1.

**Wave 4 — Journal/counter/achievement write path (2026-08-11, done)**
- Root cause: Waves 1-3 moved level/xp/gold and content reads off `weekly_packages`, but
  `journal_logs`/`mastery_count`/`purchased_items`/`honor_grants`/`quiz_attempts`/
  `mastered_quizzes`/the 12 per-week battle counters/`achievements` were still written through the
  ORIGINAL carry-forward/null-sentinel fetch-then-insert-or-update logic in
  `hooks/useWeeklyData.ts` — i.e. the exact bug class this whole redesign exists to kill was still
  live for these fields. Discovered while investigating whether `weekly_packages` could be
  dropped (it could not — it was still the sole write target for all of the above).
- New migration `20260811120908_wave4_journal_write_path.sql`: added the 12 per-week counter
  columns to `player_weekly_journal` (previously only had journal_logs/mastery/purchased/honor/
  quiz_attempts/mastered_quizzes — the dual-write trigger was already mirroring those 6, just not
  the 12 counters or achievements); new `apply_progress_update` RPC (one atomic call — xp/gold
  delta + level-up, absolute mastery/purchased/honor set, per-call deltas for the 12
  `player_progress.*_total` lifetime counters, achievement-id merge into
  `player_progress.achievements`).
- `hooks/useWeeklyData.ts`: fetch no longer touches `weekly_packages`/`weekly_packages_public` at
  all — reads `player_progress` (stats + achievements, lifetime) and `player_weekly_journal`
  (journal/counters, this-week, keyed by `content_week_id`) directly, in parallel with content.
  The entire carry-forward/pre-stage branch (fetch error → bail, no row → carry forward or
  default-insert) is **deleted**, not just bypassed — journal fields have no carry-forward concept
  anymore (a new week legitimately starts at empty/0, no previous-week read needed).
  `updateStatsAndJournal` now calls `apply_progress_update` once, then a direct
  `player_weekly_journal` upsert (RLS: `current_app_user_id() = user_id`, no RPC needed for that
  half). Achievement "already unlocked" set now sourced from `player_progress.achievements`, not
  a per-week field.
- `lib/offlineSync.ts`: new `apply_progress_update`/`player_weekly_journal_upsert` replay targets;
  old `weekly_packages_other_changes` case kept (not deleted) purely so a queue entry written by a
  pre-Wave-4 build (offline device that hasn't reconnected since the update) still replays instead
  of hitting the unknown-target fallback.
- `components/admin/ToolsSection.tsx`: diagnostic read of `toolData` (quiz_attempts/mastered
  quizzes display) now resolves `content_weeks.id` for the user's grade/current-week and reads
  `player_weekly_journal`, instead of `weekly_packages`.
- **Verified**: RPC tested directly (level-up math, absolute mastery/purchased/honor set, achievement
  merge-not-overwrite, per-counter deltas) via scratch `wave4_test_probe` user, cleaned up after.
  `player_weekly_journal` upsert schema tested directly, cleaned up after. Full real browser
  round-trip on the live dev server against production data (`fatty`, a real classmate account,
  Grade 5 English quiz, attempt 2 of an already-answered quiz) — `grade_content_quiz` →
  `updateStatsAndJournal` → `apply_progress_update` + `player_weekly_journal` upsert fired with
  zero console/runtime errors; `quiz_attempts.Monday_English` confirmed incremented 1→2 in the DB
  post-submit. xp/gold correctly did NOT change (repeat-attempt reward suppression is
  `QuestModule.tsx`'s pre-existing, untouched behavior — first-attempt-only rewards).
- **`weekly_packages` now has zero remaining app write paths** (grep-confirmed — only the
  intentional offline backward-compat case in `offlineSync.ts` still references it). It is,
  finally, actually safe to schedule for Phase 5 decommission — not done in this session, per the
  existing "observe for a full week-rollover cycle first" rule below.

**Phase 5 — Decommission**
- Once dual-write window is clean and all call sites cut over (**true as of Wave 4, 2026-08-11**),
  drop writes to old `weekly_packages` (already done), then (after a further safety period —
  recommend waiting past the next Sunday week-rollover, 2026-08-16, so at least one real
  week-boundary is observed with the new write path) drop the table itself, `weekly_packages_public`,
  `grade_content_owners`, `increment_weekly_counter`, and the now-fully-dead
  `sync_weekly_packages_to_progress` trigger, in their own migration.

## 4. Rollback strategy

- Every phase-1 migration is additive-only — rollback is just not proceeding to phase 2+.
- Backfill script is idempotent and non-destructive (never deletes/mutates `weekly_packages`) —
  can be re-run after fixes.
- Dual-write phase means old data path keeps working until explicitly decommissioned in phase 5 —
  that's the real rollback point of no return, and should not happen until phase 4 has been live
  and observed for at least one full week-rollover cycle with real users.

## 5. Open questions — RESOLVED (2026-08-11)

- **Weekly-scoped achievements vs. lifetime counters.** Investigation found 5 of 12 counters
  (`guild_sessions_count`, `monster_battles_won`, `sibling_battles_won`, `dummy_battles_won`,
  `perfect_quizzes`) are shown in `HeroProfile.tsx` both as "this week" and (separately) as a
  lifetime toggle backed by `lib/lifetimeStats.ts`. All 12 counters gate achievement tiers in
  `lib/achievements.ts` (e.g. Guild Initiate/Regular/Veteran/Champion/Legend at 1/5/15/30/50),
  and **the achievement check today reads the current week's value only**, not a lifetime sum.
  **Decision: go fully lifetime-cumulative as originally planned; accept that achievement
  thresholds become "X lifetime" instead of "X in one week."** This is a deliberate game-balance
  change (achievements get easier to reach since progress no longer resets), not an oversight.
  Threshold numbers in `lib/achievements.ts` will need a rebalance pass as a **separate,
  follow-up task** after the schema migration lands — do not silently rescale them as part of
  this migration; ship with the existing threshold numbers first, then decide new ones with real
  usage data.
- **Timezone: `Asia/Manila`, fixed**, for `current_week_start()`. No existing convention in the
  codebase (all current week math is unqualified `date-fns startOfWeek(new Date())`, whatever
  local clock runs it) — this is a genuinely new server-side concept, not a port of an existing one.
- **Boss fight schema RPC audit (`20260807000000_boss_fight_schema.sql`) — done.** Only one
  touchpoint: `claim_boss_persona_victory(p_user_id, p_week_starting_date, p_grade, p_subject,
  p_term)` calls the externally-defined `apply_character_deltas(p_user_id, p_week_starting_date,
  200, 150)` RPC (not defined in this migration file) to award xp/gold. No other function in this
  file reads/writes `weekly_packages`, `character_stats`, or any weekly counter. Phase 4 step 4
  needs to update this one call site to call the new `apply_progress_deltas` RPC instead (no more
  `p_week_starting_date` parameter needed once progress isn't week-keyed).
- **`contentSourceId` fate — confirmed fully removable.** Audited every usage
  (`lib/userSession.ts`, `hooks/useWeeklyData.ts`, `app/page.tsx`, `components/admin/
  PackagesSection.tsx`) — it is purely the grade→content-owner pointer mechanism, nothing else
  depends on "authored by a specific student" semantics. Safe to delete entirely once content is
  grade-keyed via `content_weeks.grade`.

## 6. Explicitly out of scope for this plan

- Any change to Monster Arena battle/guild leveling mechanics (`user_subclass_profiles`,
  `user_monsters`) — those are already decoupled from `weekly_packages`.
- Any change to `subjectSchedule.ts`'s hardcoded weekday→subject mapping — stays as the
  authoring-time validation reference; not stored per-row today, and this plan doesn't change
  that.
