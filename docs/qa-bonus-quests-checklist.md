# Bonus Quests (Grade 2 Math Enrichment) — Verification Checklist

**Purpose:** manual verification of the kid-side Bonus Quests experience built in this pass — nothing below was click-tested live (no test credentials were on hand), so this is the real first pass. Test with a real Grade 2 child account, logged in normally through the actual app (not a dev/mock route).

**Scope:** the reading/playing experience only. Purchase/entitlement, the Shop, and parent-side My SECs/Progress are NOT part of this checklist — they don't exist yet (see `docs/sec-shop-design.md`). The pack is temporarily unlocked for every Grade 2 account for this testing phase.

---

## 1. Access & visibility

- [ ] Log in as a **Grade 2** child. A **"Bonus Quests"** icon appears in the sidebar nav, alongside Main Quest / To-Do / Side Quests / etc.
- [ ] Log in as a child of **any other grade** (3/4/5/6). Confirm the tab still appears (it's wired for all grades) but shows the **"No Bonus Quests yet"** empty state, not the Math Enrichment pack.
- [ ] Clicking the Bonus Quests icon does not error, and does not break the rest of the sidebar (other tabs still switch correctly afterward).

## 2. Pack entry (Grade 2 account)

- [ ] The "Math+" pack tile renders with its icon, title, and an "Enter" button.
- [ ] Clicking **Enter** opens the Topics view (Grade 2 Math Enrichment header, strand list below it).
- [ ] A back arrow ("← Bonus Quests") returns to the pack-tile screen without a full page reload.

## 3. Topics view (strand accordion)

- [ ] All **8 strand rows** appear, in order: Number Sense, Fractions & Decimals, Ratio & Proportion, Patterns & Algebra, Geometry & Measurement, Statistics, Classic Word Problems. (Mixed Trainer Track is intentionally not listed yet — see file header note in `lib/mtapContent.ts`.)
- [ ] Each strand shows a progress bar and an "N/M mastered" count. On a brand-new account, every strand shows 0/M.
- [ ] Clicking a strand row's body (not the Reviewer button) expands it to show that strand's archetypes.
- [ ] Clicking an already-expanded strand collapses it again. Only one strand is expanded at a time when you open a second one.
- [ ] Inside an expanded strand, every archetype row shows exactly 3 tier pips.
- [ ] **On a brand-new account: only the Easy pip is unlocked (gold) per archetype — Average and Difficult show the 🔒 locked style.**
- [ ] Hovering/tapping a locked pip does nothing (no quiz opens).
- [ ] Tapping an unlocked (gold) pip opens the quiz player for that exact archetype + tier.

## 4. Reviewer

- [ ] Clicking a strand's **"Reviewer"** button (top-right of the strand row) opens the Reviewer screen for that strand — not a quiz.
- [ ] The Reviewer header clearly says **"no timer"** and shows the strand name.
- [ ] Every archetype in that strand appears as its own section, each showing all 3 tiers (Easy/Average/Difficult) with a real question, its answer, and a plain-language solution.
- [ ] No timer countdown or "submit" control appears anywhere in the Reviewer — it's read-only.
- [ ] The **"Back to topics"** button returns to the strand accordion (still expanded to the same strand, not reset to the top-level list).
- [ ] Spot-check 2–3 shown answers by hand — they should be correct (all reviewer content is pulled from the same verified batch the quiz uses, so a wrong one here would mean something regenerated incorrectly, not a display bug).

## 5. Quiz player — normal play

- [ ] Opening a tier's quiz shows the archetype name, the tier badge (Easy/Average/Difficult), a real question, and 4 options.
- [ ] A countdown timer is visible and ticking down from the tier's time budget (15s Easy / 30s Average / 60s Difficult).
- [ ] Tapping an option immediately grades it — a correct option turns green, a wrong selection turns red (and the correct one is also highlighted green).
- [ ] The worked solution text appears below the options after grading.
- [ ] A **"Next Question"** (or **"Finish"** on the last one) button appears; tapping it advances to the next question in that tier's bank, with the timer reset.
- [ ] After the last question, a completion screen shows total correct-this-round and total XP/Gold earned this session, with a button back to Topics.
- [ ] Returning to Topics after finishing a bank shows the mastery/lock UI in step 3 reflecting any new attempts (progress bar should have moved if this was the first session).

## 6. Timer expiry

- [ ] Let a question's timer run to 0 without answering. Confirm it auto-resolves as **incorrect** (not a stuck/frozen screen), shows "Time ran out before you answered," and still lets you proceed to the next question.
- [ ] No reward is given for a question that timed out.

## 7. Reward crediting

- [ ] Note the child's gold/XP in the HUD *before* answering a question correctly for the first time.
- [ ] Answer it correctly. Confirm the HUD's gold/XP updates to reflect **+50 gold / +200 XP** (the standard `calculateReward(1)` amount) shortly after grading — this goes through a full server round-trip (`apply_progress_deltas`), so a brief delay is expected, but it should land within a couple seconds without needing a page refresh.
- [ ] If the reward pushes XP past a level-up threshold, confirm the HUD's displayed level actually increments (this is handled by the same shared RPC every other reward path uses, so it should just work — flag it if not).

## 8. Anti-farming guard (the one you specifically asked for)

- [ ] Answer a question correctly (reward granted — confirmed in step 7).
- [ ] Immediately replay the **same tier**, and get the **exact same question** again (may take a couple of "Next Question" cycles since the bank is shuffled — or exit and re-enter the tier to reshuffle sooner).
- [ ] Answer it correctly again. Confirm:
  - [ ] It still shows **"Correct!"** with the right solution (learning/practice value preserved).
  - [ ] It explicitly shows the **"Already mastered this one before — no extra reward"** message.
  - [ ] The HUD's gold/XP does **NOT** increase this second time.
- [ ] Confirm a **different** question in the same tier, answered correctly for the first time, **does** still pay out normally (the guard is per-question, not per-tier).

## 9. Mastery / tier unlock progression

This one takes real repetition to test properly — budget time for it, or verify the DB state directly (see the SQL check below) rather than clicking 10 times per tier by hand.

- [ ] Answer the same archetype's **Easy** tier questions until you've logged **≥10 attempts** with **≥8 correct**, spread across **at least 2 different calendar days** (or manually backdate a couple of test rows — see below).
- [ ] Confirm the archetype's **Average** pip flips from locked (🔒) to unlocked (gold) after that threshold is met, and to mastered (✓, green) once Average itself reaches the same threshold.
- [ ] Confirm **Difficult** stays locked until Average's threshold is independently met.
- [ ] **Fast alternative to manual repetition** — verify directly in Supabase instead of playing 10+ rounds by hand:
  ```sql
  select archetype, tier, correct, created_at
  from mtap_question_attempts
  where user_id = '<the test child's app user id>'
  order by created_at desc
  limit 20;
  ```
  Confirm the rows match what you actually did in the app (right archetype/tier/correctness), then reload the Topics view and confirm the pip states in step 3 match what `lib/mtapEngine.ts`'s `computeTierUnlocked`/`computeTierMastered` rules would predict from that data (8-of-last-10 + ≥2 distinct days).

## 10. Regression check on the rest of the app

- [ ] Confirm the existing tabs (Main Quest, Side Quests, Journal, Vault, etc.) still work normally after this change — the new tab was added to `components/Dashboard.tsx` and `components/SidebarRail.tsx`, both shared files.
- [ ] Confirm a Grade 5 (or any non-2) child's normal gameplay (guilds, weekly quests, gold) is unaffected.

---

## If something fails

- **Wrong answer marked correct (or vice versa)** → bug in `grade_mtap_expansion_answer` or in the imported content row itself; check the specific `question_code` directly in `mtap_expansion_content`.
- **Reward not crediting** → check the browser console for an `apply_progress_deltas` RPC error; the RPC itself is shared/already-hardened code, so a failure here likely means an auth/session issue (`current_app_user_id()` not resolving), not new bug in this feature.
- **Pip unlock state looks wrong** → this is pure client-side computation from `mtap_question_attempts` — pull the raw rows (query in step 9) and recompute the rule by hand before assuming a code bug.
- **Anti-farming guard not triggering** → check `mtap_question_attempts` for a prior `correct = true` row with the same `question_code` for that user; if one exists and reward still fired, that's a real bug in `grade_mtap_expansion_answer`'s `already_earned` check.
