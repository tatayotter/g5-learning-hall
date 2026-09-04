# RPC identity hardening

**Status:** Group A shipped 2026-09-03 (migration `rpc_identity_hardening_group_a` on
project `rsiupmbfhqtihmtahccg`). All 16 functions listed below now reject/no-op when
`p_user_id` doesn't match the caller's `current_app_user_id()`. Verified live: an
unauthorized `tutor_curio` call now raises `not authorized`; an unauthorized
`fetch_player_notifications` call now returns zero rows. Group B (`admin_*`) is
unchanged, still out of scope. No app code changes were needed — every call site already
only ever passed the current session's own id (see call-site confirmation below), so this
was a pure server-side hardening with no client-visible behavior change for legitimate

**2026-09-04 regression + fix:** `spend_gold` (added the same day, for the "skip for gold"
battle mechanic — see [[project_skip_question_for_gold]]) shipped one migration *after*
Group A without the identity check, exactly the gap this doc closed everywhere else —
caught by ultrareview on the PR before merge, fixed same-day in
`20260904010000_harden_spend_gold_rpc.sql`. Lesson: this doc's Group A list needs to be
treated as a living checklist any new `p_user_id`-taking `SECURITY DEFINER` RPC must be
checked against, not a one-time pass — added `spend_gold` to the list below so a future
audit query catches it if the pattern ever regresses again.
use.
Related: [[feedback_postgres_function_hardening]] (admin passcode boundary),
[[project_curio_quality_tutoring]] (where this was first flagged, as a "someday" item —
this doc supersedes that framing; it's a live issue, not a someday one).

## The gap

The app has a real per-player identity mapping in place and RLS uses it correctly:

```sql
create function current_app_user_id() returns text
  language sql stable security definer set search_path to 'public'
as $$
  select app_user_id from public.user_identity_map where auth_uid = auth.uid();
$$;
```

`user_monsters`, `player_inventory` etc. all gate direct table access on
`current_app_user_id() = user_id`. That part is solid.

But **every gameplay RPC that takes `p_user_id` ignores this function entirely** — they
take `p_user_id` as a plain parameter and trust whatever the caller sends, with no check
that it matches the caller's actual session identity. All are `SECURITY DEFINER`, so they
run with elevated privilege regardless of who calls them.

Confirmed live in the `rsiupmbfhqtihmtahccg` (DepEd Grade 5 Student - Enrichment) project via:

```sql
select p.proname, pg_get_function_arguments(p.oid) as args,
       (pg_get_functiondef(p.oid) like '%current_app_user_id()%') as checks_identity
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef = true
  and pg_get_function_arguments(p.oid) ilike '%p_user_id%'
order by checks_identity, p.proname;
```

Zero of the 23 matches check identity.

**It's exploitable today, not just theoretical.** `tutor_curio` (and by the same grant
pattern, presumably all of the below) grants `EXECUTE` to `anon` — callable with the
public anon key alone, no login required:

```sql
select grantee, privilege_type from information_schema.routine_privileges
where routine_name = 'tutor_curio';
-- anon, authenticated, postgres, service_role, PUBLIC — all EXECUTE
```

Combined with `user_monsters`/`player_progress` having public "read all" SELECT policies
(intentional, for leaderboards), an attacker can read any player's real `user_id` +
monster row id, then call these RPCs directly against the PostgREST endpoint — bypassing
the app UI — to spend/grant someone else's gold, force a quality reroll on someone else's
curio, claim someone else's daily bonus, forge a quiz-grading result, etc.

## Affected functions

Grouped by what fixing them requires. All are in `public`, all `SECURITY DEFINER`.

### Group A — straightforward: add an identity check, no other changes needed

These take `p_user_id` as the sole subject of the mutation, are only ever called from the
child's own game session (verified: every one of their call sites in the app is inside a
gameplay component/hook driven by the logged-in player's own `userId`, never a
parent/admin panel acting on a child's behalf — see call-site list at the bottom), and
have no legitimate cross-user caller:

- `tutor_curio(p_user_id, p_monster_row_id, p_use_tome)`
- `spend_gold_and_grant_item(p_user_id, p_item_key, p_quantity)`
- `spend_gold(p_user_id, p_amount)` — added 2026-09-04, hardened same-day (see status note above)
- `apply_character_deltas(p_user_id, p_week_starting_date, p_xp_delta, p_gold_delta)`
- `apply_progress_deltas(p_user_id, p_xp_delta, p_gold_delta)`
- `apply_progress_update(p_user_id, ...16 more delta/count params)`
- `claim_curio_egg(p_user_id, p_user_monster_id)`
- `claim_daily_checklist_bonus(p_user_id, p_today, p_day_name, p_grade)`
- `claim_marketing_gold_bonus(p_user_id)`
- `claim_registrant_referral_reward(p_user_id)`
- `grade_content_question(p_user_id, p_question_id, p_selected)`
- `grade_content_quiz(p_user_id, p_answers)`
- `incubate_curio_egg(p_user_id, p_egg_id)`
- `fetch_player_notifications(p_user_id)`
- `mark_notifications_read(p_user_id)`
- `record_progress_event(p_user_id, p_column)`
- `sync_egg_progress(p_user_id)`
- `add_trash_stats(p_user_id, p_collected, p_gold)`

Fix pattern (add as the first statement in the function body):

```sql
IF p_user_id IS DISTINCT FROM current_app_user_id() THEN
  RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END IF;
```

`add_trash_stats` takes `p_user_id uuid` (the rest take `text`) — same fix, just matches
its existing type.

### Group B — admin functions, different track

- `admin_award_gold`, `admin_award_progress_gold`, `admin_set_character_stats`,
  `admin_set_progress_stats`, `admin_upsert_weekly_package_data`

These already gate on `p_passcode` (a separate, weaker boundary already flagged in
[[feedback_postgres_function_hardening]]: "admin auth boundary lives in app UI too, not
just RLS"). They're *intentionally* cross-user (admin acting on any child's data), so the
Group A fix doesn't apply — `p_user_id` is supposed to differ from the admin caller's own
identity here. Out of scope for this doc; tracked separately via the linked memory.

### Excluded — different trust boundary already

- `supabase/functions/resolve-live-battle` (Edge Function) calls these RPCs from a
  server-side context using the service role key, not the anon/authenticated client key.
  Server-side callers are already trusted; no change needed there. Worth a quick check
  during implementation that it isn't accidentally passing through a client-supplied
  `p_user_id` for the *other* player in a battle in a way Group A's check would break —
  see rollout risk below.

## Rollout risk — READ BEFORE IMPLEMENTING (revised 2026-09-03, see below)

**Original concern:** 13 of 70 `player_progress` rows have no `user_identity_map` entry,
so `current_app_user_id()` returns `NULL` for them and a strict Group A check would
reject calls for those ids.

```
arki, arkipj, arkipjaic, carlstiengotostos, demo_476c0d3fe1, demo_83fb714e57,
francisarkipj, francisarkipjaictin, francisarkipkaictin, maviz,
mikhailkazuedahilan, zachkyriepredog, ziggyboy
```

**Investigated further — this is NOT a backfill blocker, it's the system working
correctly.** `user_identity_map.auth_uid` is the primary key: one browser/session slot
maps to exactly one `app_user_id` at a time, and the mapping is only ever set by
`link_verified_identity` (called from `lib/userSession.ts`'s `linkIdentity()`) at the
moment a profile is picked on the splash screen *and the PIN is re-proven* — never at
account-creation time. That's a deliberate anti-self-attestation boundary (see the
comment above `linkIdentity()`): a raw `INSERT`/`UPDATE` on this table is revoked for
`anon`/`authenticated` specifically so no browser can claim a known `app_user_id` without
proving its PIN.

Breakdown of the 13:
- `demo_*` (2) — expected, ephemeral per [[project_public_demo_account]].
- `maviz`, `ziggyboy` (2) — real, freshly-created accounts nobody has profile-selected
  (and PIN-verified) in a browser session yet. Self-heals the moment they do; no action
  needed, and manually inserting a mapping would bypass the PIN check this design exists
  to enforce.
- `arki`/`arkipj`/`arkipjaic`/`francisarkipj`/`francisarkipjaictin`/`francisarkipkaictin`
  (6) — one browser's self-registration flow (`create_unclaimed_child_account`) run
  repeatedly; each new signup's `ON CONFLICT (auth_uid) DO UPDATE` silently reassigned
  that browser's one identity slot to the newest account, orphaning the rest. Same
  self-heal path: whoever logs into a specific one of these with its PIN gets remapped.
- `mikhailkazuedahilan`, `zachkyriepredog`, `carlstiengotostos` (3) — no `children` row
  at all, only orphaned `player_progress` rows, all created at the identical timestamp
  2026-08-11 09:16:58 with 0 gold. Look like dead seed/test data, not recoverable
  accounts — nothing to link them to. Candidate for a separate cleanup, out of scope
  here.

**Conclusion:** Group A's check failing for any of these ids is correct — it's refusing
to act on an identity nobody in the current session has proven. Ship the check without a
pre-migration backfill step. The only thing worth re-verifying during implementation:
confirm no code path calls a Group A RPC *before* `linkIdentity()` has resolved for the
active profile (e.g. a speculative prefetch on app boot) — that would produce a false
rejection for a legitimately active session, unlike the accounts above.

## Call-site confirmation (Group A only ever self-called)

Verified via grep across `components/`, `hooks/`, `lib/` — every call site passes the
*current session's own* `userId`/`app_user_id`, sourced from the logged-in player's own
state, never a different player's id read off e.g. a leaderboard row:

`MonsterShop.tsx`, `MonsterGuild.tsx`, `monster/TrainingMap.tsx`, `Dashboard.tsx`,
`lib/masteryGauntletEngine.ts`, `TutorRollModal.tsx`, `QuestModule.tsx`,
`EggHatchModal.tsx`, `DailyBonusModal.tsx`, `battle/shared.tsx`, `lib/guildEngine.ts`,
`lib/dailyChecklist.ts`, `hooks/useWeeklyData.ts`, `lib/marketingBonus.ts`,
`lib/curioEggs.ts`, `lib/referral.ts`, `lib/curioQuality.ts`, `lib/inventory.ts`,
`lib/tutorCurio.ts`, `lib/trades.ts`, `monster/HatcheryPanel.tsx`, `lib/tomeShop.ts`.

No parent-dashboard or admin-panel component calls any Group A function on a child's
behalf — parent-facing mutations go through the separate `admin_*` (Group B) path.
