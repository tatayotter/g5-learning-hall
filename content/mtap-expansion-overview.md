# MTAP Expansion Pack — Overview & Shared Spec (Grades 2-6)

**Status:** draft, not yet wired into generation pipeline or DB.
**Scope:** ALL FIVE GRADES (2-6) now drafted — the strand/archetype research and drafting sweep is complete. See per-grade docs: [Grade 2](mtap-grade2-expansion-bow.md), [Grade 3](mtap-grade3-expansion-bow.md), [Grade 4](mtap-grade4-expansion-bow.md), [Grade 5](mtap-grade5-expansion-bow.md), [Grade 6](mtap-grade6-expansion-bow.md).

This doc holds everything that's **grade-agnostic**: the self-paced structure rationale, sourcing policy, mastery-threshold design, and the canonical Question Template Spec. Each grade's own doc holds only that grade's strand/archetype list — see [[project_mtap_grade5_expansion_research]] for the research trail.

---

## Per-grade strands: independently derived, not reused

**Decision:** each grade level gets its own strand set, derived from that grade's own research pass — not a shared strand template applied uniformly across grades.

### Evidence standard — three tiers, be explicit about which one backs each claim

1. **Search-snippet paraphrase** (weakest) — a search engine's own summary-of-a-summary. Used for the very first pass; several of its conclusions turned out **wrong** once checked against real text (see below). Do not trust this tier alone for anything going into a grade's actual content doc.
2. **Fetched-page paraphrase** — a model reads the real page and summarizes it, with quoted fragments as evidence. Much stronger, but still one layer of summarization between you and the source; occasionally mislabels a quote's category (caught one below).
3. **Direct quote from an actual reviewer document, cross-checked across ≥2 independent documents per grade** — the standard used below. This is as bulletproof as this landscape gets, since **no official MTAP syllabus exists to check against** (established earlier) — "bulletproof" here means "verified against real questions from multiple real documents," not "confirmed by an authority," because no such authority publishes anything to confirm against.

### Cross-grade findings — verified against real question text (Tier 3)

Fetched and read actual questions from independent reviewer documents per grade — **source counts below are exact, not estimated**, because a single-source claim is exactly the kind of thing that turned out wrong once (see Grade 5 probability, caught and fixed below, and Grade 3 ratio, caught and fixed in this pass). Source count per grade: **G2: 5** (2 pdfcoffee + 1 math-inic + 1 depedtambayan + 1 metadata-only dead end), **G3: 4** (2 pdfcoffee + 1 math-inic + 1 metadata-only dead end), **G4: 4** (2 pdfcoffee + 2 math-inic — a second math-inic page, a named 2019 MMC Grade 4 Divisionals document, closed the last open Patterns gap and cross-validated several existing findings), **G5: 4** (3 pdfcoffee, incl. a 2002-2015 multi-year competition collection, + 1 math-inic), **G6: 4** (2 pdfcoffee + 1 quizalize quiz + 1 scribd, thin; 1 additional fetch of a mechanical-engineering "Reviewer (6)" doc was a false-positive title match, discarded).

| Strand | G2 | G3 | G4 | G5 | G6 |
|---|---|---|---|---|---|
| Number Sense (place value, basic ops, Roman numerals) | ✅ incl. Roman numerals | ✅ incl. Roman numeral arithmetic | ✅ incl. divisibility-by-11 rule | ✅ | ✅ |
| Fractions, Decimals | ✅ | ✅ + decimal comparison, fraction-of-fraction | ✅ + mixed↔improper conversion | ✅ full | ✅ full |
| **Ratio & Proportion (formal a:b or "for every X, Y" notation)** | ✅ confirmed — "for every 3 oranges, there are 5 apples..." | ❌ **corrected — not confirmed across 4 real sources.** One source explicitly checked and found no proportion/ratio content. What *does* appear at G3 is **multiplicative comparison** ("six times as many chickens as ducks") — a related but distinct, simpler archetype; not the same as formal ratio notation. | ✅ confirmed — "ratio of adults to kids 5∶2," "ratio of 2:3" (2 independent quotes) | ✅ | ✅ |
| GCF/LCM | ❌ not found in 3 real docs | ❌ not found in 3 real docs | ✅ confirmed — "GCF of 36, 24, 48," "LCM of 36, 27, 54," plus an LCM-cycle word problem | ✅ | ✅ confirmed, 4 separate quotes across 2 sources ("GCF of 91, 65, 338," "LCM of 147 and 63," etc.) |
| Patterns / sequences | ✅ arithmetic next-term, calendar/day-of-week pattern | ✅ arithmetic next-term, **function-machine puzzles** (input → hidden operations → output) | ✅ confirmed — a 4th real source (a named 2019 MMC Grade 4 Divisionals document) gave "find the sum of the numbers in the 20th triple: (1,4,7),(2,6,9),(3,8,11)..." — a two-layer arithmetic-sequence pattern | ✅ | ✅ multi-step alternating-rule sequences, non-arithmetic sequences ("1, 2, 5, 10, 17...") |
| Algebra (2-unknowns sum/difference, equation-solving) | ✅ "sum of two numbers is 27, difference is 7," seating-capacity simultaneous-constraint puzzle | ✅ "2,910 + 6,151 + N = 120,316" | ✅ "three guavas and two apples cost P155, five guavas and four apples cost P285" (classic 2-unknowns system) | ✅ | ✅ explicit linear equations, polynomial substitution |
| Geometry & Measurement | ✅ area, perimeter | ✅ + symmetry, polygon-naming, reverse area→side | ✅ perimeter, reverse area→side | ✅ | ✅ circle area/circumference, cylinder volume, area-percentage-change, similar-figures/shadow-proportion, 3D solid properties (prism edges) |
| **Statistics (averages, data/graph reading)** | ✅ confirmed — "average of 34, 37, 40," bar-graph reading | ✅ confirmed — "Marco... average grade" | ✅ **confirmed this pass** — basketball average-per-game problem (previously unconfirmed after 1 doc; the 3rd source settled it) | ✅ confirmed, heavily — 5 separate real questions incl. consecutive-integer sums, mean-of-dates, discard-and-recompute average | ✅ confirmed heavily — weighted-grade averages, "average of 2 numbers / 4 numbers / 6 numbers combined" (advanced) |
| **Probability** (distinct from averages/data-reading) | ❌ not found in 3 real docs | ❌ not found in 3 real docs | ❌ not found in 3 real docs | ❌ **confirmed absent — 4 independent real sources now, including a multi-year competition collection and a 4th source (math-inic) that showed 5 more real G5 questions, all statistics, zero probability.** Removed from the Grade 5 doc — see below. | ✅ confirmed 3 times across 3 sources — same urn/ball question recurring plus a spinner question, likely one canonical item circulating, but consistent |
| Classic word-problem canon (age/coin/clock/digit/lever/mixture) | **age ✅ genuinely algebraic** — "In 6 years, Alex will be twice his current age" (resolves the earlier doubt — not a disguised subtraction problem), **coin ✅** ("changed ½ of a ₱200-bill..."), clock/time ✅. Digit/lever/mixture **not found in 4 docs**. | age (present but the original label on one quote was likely a mislabel — flagged, not fully trusted), **coin ✅ confirmed again** — "Isabel had 1-peso and 5-peso coins... P22 total, 10 coins" (2nd independent coin confirmation), clock ✅, **digit ✅** ("ones digit is two more than thrice tens digit"), consecutive-integer-sum ✅ ("sum of first 50 integers"). Lever/mixture **not found in 3 docs.** | age ✅ ("Maria is two more than twice..."), **+ a "custom operation" puzzle** (`a@b` defined-symbol type, not seen at other grades) | **resolved, not verified** — no real Grade-5-specific source found despite 8+ targeted attempts across pdfcoffee/scribd/educatorsfiles/depedtambayanph/quizalize. Rather than an unretrofitted Tier-1 claim, this is now a disclosed design decision: G5's Strand 6 is explicitly built as a harder-tier extension of G4's Tier-3-verified canon, not presented as independently-sourced G5 content. See [Grade 5 doc](mtap-grade5-expansion-bow.md) for the full resolution. | age ✅ confirmed 3× ("Vince is twice his sister's age...", "John is 3 less than twice Janet's age..."), work ✅ ("Ian finished 5 boxes in 2 hours, Joey 10 boxes in 3 hours," "drain empties a bathtub in 15 minutes" — 2 quotes), motion ✅ (train-passing-tunnel, and a 1000m-race relative-position problem — 2 quotes, a distinct "advanced/relative" flavor vs. lower grades' simpler single/two-mover setups), **money/pricing ✅** (general shopping/change problems, but NOT the classic mixed-denomination-counting type seen at G2/G3), **digit ✅ but different flavor** — a digit-*rearrangement*/permutation puzzle ("digits of 4765 rearranged"), not the reversed-digit (10t+u) type used at G3-5. **Lever/mixture: now confidently absent — checked across 4 independent sources, none show either.** |
| Rate/speed (motion primitive) | ✅ "farmer can walk 5 km an hour..." (single-mover, simpler than full motion/rate) | not found in 3 docs | ✅ rate-of-change (dam water level) | ✅ full motion/rate incl. two-mover | ✅ train-length and race-position problems (advanced relative-motion variants) |

**Corrections this pass — caught by insisting on multi-source confirmation, exactly the discipline you asked for:**
1. **Grade 3 Ratio & Proportion, downgraded ✅→❌.** The original table's "✅" traced back to a Tier-1 paraphrase and was never actually backed by a quote. Checking 2 more real G3 documents found no ratio/proportion content at all — one explicitly confirmed its absence. What's really at G3 is multiplicative comparison language, a different (and simpler) archetype.
2. **Grade 4 Statistics, upgraded "unconfirmed"→✅.** A 3rd source (math-inic) supplied a real average-per-game question, settling what 2 prior docs left ambiguous.
3. **Grade 5 Probability, reconfirmed absent with a 4th independent source**, further reinforcing the removal already made to the Grade 5 doc.
4. **Grade 2's "age" doubt, resolved.** Flagged last round as possibly "a subtraction problem wearing an age costume" — a direct fetch of a real depedtambayan document found a genuinely algebraic G2 age problem ("in 6 years, Alex will be twice his current age"), same reasoning shape as older grades, just smaller numbers. Doubt cleared, not just dropped.
5. **Grade 6 evidence base doubled** (2 sources → 4), including catching and discarding a false-positive fetch (a "Reviewer (6)" document that turned out to be mechanical-engineering content, not MTAP math — same title-matching risk worth watching for generally). Lever and mixture are now confidently absent at G6 (checked across all 4 sources, zero hits), rather than merely "unconfirmed either way" as flagged last round. Digit and money/coin content exists at G6 but in different forms than lower grades (digit-permutation rather than reversed-digit; general pricing rather than denomination-counting) — worth treating as distinct archetypes if a Grade 6 doc gets written, not the same items just harder.

**New archetypes discovered this pass, not yet in any strand doc:** Roman numeral arithmetic (G2, G3), function-machine puzzles (G3), custom-defined-operation puzzles (G4), symmetry/polygon-naming vocabulary (G3), Goldbach-style prime-sum puzzles (G3), reverse area/perimeter problems (G3, G4), calendar/day-of-week pattern problems (G2), "alternate elimination and retention" style simultaneous-constraint puzzles (chickens-and-rabbits family — G2, G3, G4), percent-of-percent and area-percentage-change problems (G6), train/race relative-motion problems (G6), digit-rearrangement/permutation puzzles (G6, distinct from reversed-digit problems), similar-figures/shadow-proportion problems (G6), repeating-decimal-to-fraction conversion (G6). None of these are in the Grade 5 doc's archetypes either — worth checking whether Grade 5 should have its own versions.

**Still open, flagged honestly:**
- **Grade 5's Strand 6 canon (age/coin/clock/lever/mixture/motion/work) and its reversed-digit sub-archetype — RESOLVED, not removed and not left open.** Found unverified in an accuracy pass, then a dedicated closing attempt (8+ real sources) still couldn't find direct Grade 5 evidence. Rather than leave an unretrofitted Tier-1 claim in place, or search indefinitely, this is now a disclosed methodological decision: these archetypes are explicitly generated as harder-tier extensions of Grade 4's Tier-3-verified versions, not claimed as independently-sourced Grade 5 content. See the [Grade 5 doc](mtap-grade5-expansion-bow.md) for the full resolution — this status is stable, not pending further action.
- Two real math bugs were also caught and fixed in this accuracy pass: the canonical schema's illustrative example params (`a_now:12, years:5`, no `mult`) didn't actually satisfy its own worked example's constraint — fixed to `{12, 4, 2}`. And the Grade 4 Custom-operation worked example's `d3` distractor formula collided with the correct answer whenever `q=1` — fixed by tightening `q`'s range to exclude 1, catching the failure mode checklist item 11 exists for, inside the very worked example meant to demonstrate that checklist.
- This table still isn't a substitute for reading each grade's *own* full document set when that grade's dedicated doc actually gets written — it's now a source-grounded, multi-confirmed starting point, not a finished audit.

---

## Why self-paced, not calendar-gated

The regular BOW is gated by school calendar because it feeds a *scheduled* weekly package generator. This pack is a **paid, opt-in, self-paced reviewer** — a parent buys it once, the child works through it at their own speed. So the unit of progression is **mastery tier**, not calendar week, for every grade in this pack.

## Sourcing policy (applies to every grade)

All questions are original and isomorphic — same topic, structure, difficulty tier, and problem-solving trick as real MTAP reviewer questions, but new numbers/names/phrasing authored for this pack. No verbatim or lightly-reworded text from any MTAP reviewer, past contest paper, or third-party compilation, for any grade in the pack.

---

## This is contest prep, not just extra practice — what that changes

An earlier self-assessment of this pack found it was strong on content authenticity but silent on the things that actually decide contest results: speed under time pressure, technique over brute force, and the parts of MTAP beyond the written round. Confirmed as a real requirement, not a nice-to-have — the four changes below are now load-bearing parts of the spec, not optional additions.

### 1. Timed drilling is mandatory, not optional

Every independent search across this research consistently surfaced the same elimination-round structure: **20 items — 10 at 15 seconds each (2 pts), 5 at 30 seconds each (3 pts), 5 at 60 seconds each (5 pts)**. The one document that would confirm this as a primary source (Metrobank Foundation's official contest mechanics PDF) has been unreachable behind Cloudflare bot-protection every time this research tried it — so this is **Tier-1 evidence, treated as the best available, not as confirmed**. If that PDF becomes reachable later (a manual download and paste would work), re-verify against it before treating these numbers as final.

Given that, this pack's Easy/Average/Difficult tiers map naturally onto that same 15s/30s/60s structure — which is likely not a coincidence, since both this pack's tiering and the real contest's tiering are describing the same underlying difficulty progression:

| This pack's tier | Contest-equivalent time budget | Design implication |
|---|---|---|
| Easy | 15 seconds | Must be solvable via direct recall/single-step application — if a generated Easy question needs more than one real operation, it's mistiered |
| Average | 30 seconds | One additional step or setup, as already designed — the time budget is a second, independent check that the tiering is honest |
| Difficult | 60 seconds | Multi-step, but still expected to resolve within a minute using the *technique* for that archetype — not through brute-force computation, which is a design requirement, not a hope (see #2) |

**Product implication:** the self-paced trainer needs an actual timed-practice mode, not just untimed drilling with a mastery-threshold gate. Practicing an archetype forever untimed does not train the thing the contest actually measures.

### 2. Technique-first, not algebra-first

The research consistently surfaced *named, reusable* shortcut techniques that real Filipino math trainers teach for these exact archetypes — not generic algebra: **Gauss pairing** (consecutive-integer sums), **"alternate elimination and retention"** (coin problems, two-category simultaneous-constraint puzzles — assume all-one-type, then correct for the difference), **"by proportionately"** (ratio/scaling problems), **"completing the whole"** (fast mental addition via round-then-adjust), and digit-sum divisibility shortcuts (e.g. the alternating-sum rule for divisibility by 11). A child who solves every practice problem by setting up and solving a full equation will be too slow on contest day even with perfect accuracy — the whole point of these techniques is that they're faster than the "proper" algebraic method, not just an alternative to it.

**This changes the Question Template Spec** — see the updated schema below: every archetype's generation spec should name its fastest known technique where one exists, and `solution_steps` must teach that technique as the primary method, with standard algebra only as a fallback explanation for *why* it works, not the taught path.

### 3. A Speed Round mode, as the practical stand-in for oral-round pressure

Real MTAP has oral rounds and team events at division/regional finals — verbal, no multiple choice, judged live. A self-paced digital product can't fully replicate that, and it would be dishonest to imply it does. What it *can* do: a **Speed Round mode** — free-response (typed numeric answer, no multiple-choice options to eliminate-and-guess from), strictly timed per the table above, drawn from the Mixed Trainer Track. This is the closest honest analog available in this product's actual medium, not a claim of full oral-round equivalence.

### 4. Scope honesty with parents

This pack should prepare a child well for the **written elimination round** — the actual gate every contestant has to pass first, and the part a self-paced app is well-suited to train. It does not, and should not claim to, prepare a child for oral/team final rounds. That's a real, disclosed scope boundary, not a hidden gap — worth stating plainly wherever this pack is marketed, the same way every other honest flag in this research has been stated plainly rather than smoothed over.

### Mastery thresholds now include speed, not just accuracy

The [existing accuracy-based thresholds](#mastery-thresholds--scaffolded-design-applies-per-archetype-per-grade) below are necessary but no longer sufficient. Tier advancement should require **both** accuracy (as already specified) **and** average solve time at or under that tier's time budget from #1 above, once timed-mode data exists. An accuracy-only threshold would let a child "master" a tier by getting every question right slowly — which is not what the contest actually rewards.

---

## Technique Library — named, reusable shortcut methods

Every technique below is **sourced from this pack's own real-document research**, not generic textbook knowledge invented after the fact — most come directly from the math-inic sources, which are themselves built around Vedic Math "sutras" (named mental-math methods), quoted with their real names intact. Given ~96 archetypes across 5 grades, going one-by-one with fresh research per archetype isn't necessary: most cluster into the same handful of technique families below. Each grade doc's technique-assignment table (added per-grade) references this library by name rather than re-describing each method.

| Technique name | Mechanism | Source | Applies to (archetype families) |
|---|---|---|---|
| **Gauss pairing** | Pair first+last, 2nd+2nd-last, etc. — each pair sums the same, so total = (pair sum) × (number of pairs) | Confirmed via "sum of the first 50 integers" (G3) | Consecutive-integer-sum problems (all grades) |
| **Alternate elimination and retention** | Assume the whole quantity is ONE type, compute the (wrong) total, then correct by the per-unit difference between types | Confirmed via Isabel's coin problem (G3), the 15-table seating puzzle (G2), the divisibility-by-11 remainder shortcut (G4/G6, digit-alternating-sum variant) | Coin problems, simultaneous-constraint ("chickens and rabbits") puzzles, two-unknowns sum/difference puzzles |
| **By proportionately** | Build one full "unit" of the stated ratio, find how many units fit the total, then scale | Confirmed via the "adults:kids 5:2, P10,000 total" ratio problem (G4), and "9+99+999 = 9×?" (divide each term by 9 first) (G4) | Ratio & proportion problems, proportional-pricing problems, similar-figures/shadow problems |
| **Completing the whole** (+ **"dagdag-bawas"**, its add-subtract-balancing form) | Round one number to a friendly value, adjust, then correct the difference at the end; "dagdag-bawas" (Filipino: "add-subtract") does this by simultaneously adding to one term and subtracting the same amount from the other | Confirmed via G2 raw-text fetch — used explicitly for fast mental addition (e.g. "19+33" → treat as "20+32") | Fast arithmetic within any archetype's Easy tier, especially Number Sense |
| **Using a base** | Assume a target/simpler value applies uniformly, then compute only the *deviation* from it rather than the full computation | Confirmed via the basketball average-per-game problem (G4) — assume all games scored the later average, correct only for the earlier games' excess | Averages (especially reverse/discard-and-recompute tiers), weighted-average problems |
| **By addition and by subtraction** (elimination) | Scale one equation of a two-unknowns system so a variable's coefficient matches the other equation, then subtract to eliminate it directly | Confirmed via the guava/apple two-unknowns system (G4) | Two-unknowns algebra systems, custom-defined-operation reverse-solves |
| **Digit-sum divisibility rules** | Divisibility by 9/3: sum the digits. Divisibility by 11: alternating sum of digits from the right. Both let a child skip the actual division entirely for a yes/no or remainder check | Confirmed via the ÷11 remainder problem (G4/G6) | Divisibility & remainder problems, GCF/LCM setup (quick-eliminate non-factors) |
| **Halving repeatedly** | To divide by 8 (or any power of 2), halve three times instead of doing long division | Confirmed via the rice-division-into-grams problem (G4) | Division problems where the divisor is a power of 2 |
| **Squaring numbers ending in 5, and bracketing near-squares** | Numbers ending in 5 square via a fast pattern (n5² = n×(n+1) followed by 25); nearby non-square values can be bracketed between two such squares | Confirmed via the "√2019 between which two consecutive integers" problem (G4) | Square-root estimation, "between which two integers" problems |
| **Working backward through a chain** | For function-machine puzzles or successive-fraction-of-remainder problems, invert each step in reverse order starting from the known final result | Standard technique, consistent with A1's candy-fraction-chain solution (G4) and Grade 3/2's function-machine and fractional-spending-chain archetypes | Function-machine puzzles, fractional-spending/remainder chains, reverse equation-solving |
| **Twice-bigger/twice-smaller from sum and difference** | For "sum is S, difference is D" problems: bigger number = (S+D)/2, smaller = (S−D)/2 — mental shortcut avoiding full substitution | Confirmed via the sum/difference two-numbers problem (G4: "twice the bigger number is 78+14") | Two-unknowns sum/difference puzzles (overlaps with alternate elimination — either technique works, this one is faster when S and D are both given directly) |
| **Legendre's formula** (prime power within a factorial) | The exponent of prime p in n! is `⌊n/p⌋ + ⌊n/p²⌋ + ⌊n/p³⌋ + ...` | Standard number theory, matches the confirmed "power of 3 in 39!" pattern (G6) — already documented in the Grade 6 generation spec | Factorial/prime-factorization problems |
| **Difference-of-squares shortcut** | For a ring/annulus area (big circle minus small circle) or similar "difference of two similar shapes," compute `(R²−r²)` as one product rather than finding R and r's areas separately | Confirmed via the circular-ring area problem (G4 Difficult tier) | Composite/ring geometry, difference-based area problems |
| **Clock-angle formula** | Angle between hands at H:M = `\|30H − 5.5M\|` degrees — direct formula, not a diagram-and-count approach | Standard technique for this well-known problem type; not directly quoted in this pack's sources but this is the only genuinely faster method that exists for it | Clock-hand-angle problems (Grade 5's Strand 6, derived from Grade 4's canon per that doc's disclosed methodology) |
| **Reverse-percent restoration** | To find what percent increase undoes a prior percent decrease d: the answer is `d / (1 − d)`, not d itself | Confirmed via the "price reduced 20%, how much must it increase to restore original" problem (G6) — real answer is 25%, not 20% | Reverse-percent, percent-of-percent problems |
| **Opposite-direction percent-change multiplication** | For two dimensions changing by different percentages, multiply the factors directly: `(1±x)(1±y)`, don't compute each change separately and add | Confirmed via the rectangle length/width percent-change-in-area problem (G6) | Percentage-change geometry |

**Where no faster-than-standard technique exists, `technique` should be `null` — this is a real, honest category, not a gap.** Custom-defined-operation puzzles (the definition is ad-hoc per question, nothing to shortcut), symmetry/polygon-naming (factual recall), and most single-step Easy-tier lookups don't have — and shouldn't be forced to have — a shortcut beyond direct computation. Assigning a fake technique to these would violate checklist item 1's spirit (never dress up a direct answer as something it isn't).

---

## Decisions (locked in, apply across all grades)

- **Storage:** new `mtap_expansion_content` table — not a repurposed `budget_of_work` row (no week/term shape needed). Row `id` scheme is grade-prefixed: `g{grade}-s{strand}-{archetype}-{tier}-{seq}` (e.g. `g5-s6-age-avg-0007`) so the four grades' content never collides and stays independently addressable, consistent with "own strands, not reused" above.
- **Purchase/entitlement gating:** explicitly deferred.
- **Sequencing:** Grade 5 built out fully first as the reference implementation (template stress-tested against it); each of Grades 2-4 gets its own dedicated research pass to confirm its strand/archetype list before content generation starts for that grade — not designed in parallel from assumption.

---

## Mastery thresholds — scaffolded design (applies per archetype, per grade)

The guiding rule: **each tier is deliberately built to leave behind exactly the reasoning move the next tier needs.** Easy isn't just "smaller numbers" — it isolates the core mechanic with no distraction. Average adds one complication that Easy already silently taught. Difficult composes two archetypes or removes a scaffold Average still provided. A child who cleared Easy should recognize *why* Average needs the extra step, because Easy already made them do half of it. This same principle is why per-grade strand introduction (above) matters: a strand's first grade-level appearance becomes the foundation later grades' versions of it build on.

| Tier | Unlock condition | Rationale |
|---|---|---|
| Easy | Open from the start | — |
| Average | 8 of last 10 Easy attempts correct, across ≥2 sessions | "≥2 sessions" stops one lucky streak from unlocking it — the skill needs to survive a break, not just a hot run |
| Difficult | 8 of last 10 Average attempts correct, across ≥2 sessions, AND all Easy-tier archetypes in the strand at ≥80% lifetime | The lifetime-Easy clause makes sure Difficult (which silently leans on multiple archetypes at once) isn't attempted on a shaky foundation in a sibling archetype |
| Mixed Trainer Track | All strands in that grade have ≥1 archetype at Difficult unlocked | Capstone stays locked until there's a real base to draw a shuffled set from |

Numbers above (8/10, ≥2 sessions, 80% lifetime) are a considered starting point, not literally play-tested — treat as tunable constants once real usage data exists.

---

## Question Template Spec

This is the mold every question — hand-authored or AI-generated, any grade — must be poured into. Nothing gets added to the bank without passing every checklist item below.

### Canonical schema

```jsonc
{
  "id": "g5-s6-age-avg-0007",            // {grade}-{strand}-{archetype}-{tier}-{seq}, stable, never reused
  "grade": 5,
  "strand": 6,
  "archetype": "age_problems",
  "tier": "average",                     // easy | average | difficult
  "params": { "a_now": 12, "years": 4, "mult": 2 }, // the generative variables — see Parametrization
                                          // below. VERIFIED against the worked example's own
                                          // formula: other_now = (12+4)/2 = 8, a clean integer —
                                          // an earlier version of this example used {12, 5} with no
                                          // "mult" at all, which doesn't actually solve (17 isn't
                                          // divisible by 2 or 3). Caught in a later accuracy pass;
                                          // exactly the class of bug checklist item 10 exists to catch.
  "question": "string",                  // rendered from a template string + params
  "options": ["string", "string", "string", "string"],
  "correct_answer": "string",            // must exactly match one options[] entry, verbatim
  "distractor_rationale": [
    "off-by-one on the time shift",
    "solved for the wrong person",
    "added instead of the intended relationship"
  ],                                     // one rationale per wrong option, same order — no filler distractors
  "solution_steps": "string",            // short worked solution, 2-4 steps, used for the child's post-answer explanation
  "technique": "string | null",          // name of the fast/shortcut method this archetype has, if one
                                          // is known (e.g. "gauss_pairing", "alternate_elimination_and_
                                          // retention", "by_proportionately", "completing_the_whole",
                                          // "digit_sum_divisibility") — see the Contest Prep section
                                          // above. solution_steps MUST teach this technique as the
                                          // primary method when technique is non-null, not standard
                                          // algebra as a first resort. null only when no faster-than-
                                          // algebra shortcut is known for the archetype.
  "time_budget_seconds": 15,             // 15 | 30 | 60, matching the tier per the contest-timing table
                                          // above (easy/average/difficult) — used by the timed Speed
                                          // Round mode, not just a cosmetic label
  "scaffold_note": "string",             // what this question relies on that the PRECEDING tier already taught (empty for easy)
  "generated_by": "template-vX",         // provenance tag
  "reviewed": false,                     // flips true only after the verification pass below
  "visual": {                            // OPTIONAL — required for any archetype whose question
    "type": "table",                     // can't be fully asked in prose alone.
    "markdown_table": null,              // type "table": a GFM markdown table string, rendered
                                          //   through the SAME ReactMarkdown+remarkGfm pipeline
                                          //   already built for lesson content in QuestModule.tsx
                                          //   (components/QuestModule.tsx:224) — reuse, not new code.
    "image_url": null                    // type "diagram" | "bar_graph" | "pictograph": a pre-
                                          //   rendered image, following the EXACT pattern the
                                          //   Logic Labyrinth guild already ships in production
                                          //   (matrix_image_url — components/guilds/LogicLabyrinth.tsx:249).
                                          //   QuestModule needs the same small <img> addition
                                          //   LogicLabyrinth already has; not a new capability class.
  }
}
```

**Rendering reality check (verified against actual code, not hypothetical):** `QuestModule.tsx` currently renders `q.question` as plain text only ([line 255](../components/QuestModule.tsx:255)) — no visual support exists there today. Both visual types above are cheap extensions of things that already work elsewhere in this codebase: markdown tables reuse the exact pipeline already driving lesson content two lines away in the same file, and `image_url` reuses the exact pattern the Logic Labyrinth guild already ships in production (`matrix_image_url` in [QuestionBankSection.tsx](../components/admin/QuestionBankSection.tsx:136) / [LogicLabyrinth.tsx](../components/guilds/LogicLabyrinth.tsx:249)). Deferred code task — see [Grade 5 doc](mtap-grade5-expansion-bow.md) Next Steps.

### Bulletproofing checklist (every item, every question, every grade)

1. **Single verifiable correct answer.** Derived by actually computing `params` through the stated formula — never eyeballed. If two options could defensibly be argued correct, reject the question, don't patch it.
2. **Distractors represent real errors, not noise.** Each wrong option comes from a specific, plausible mistake, captured in `distractor_rationale`. A distractor nobody would actually arrive at is a wasted option and a giveaway.
3. **Option-length balance.** All 4 options approximately the same length; the correct answer is never reliably the longest (same rule [grade5-weekly-prompt.md](../public/prompts/grade5-weekly-prompt.md) already enforces).
4. **No outside-tier knowledge required.** A Difficult-tier question may assume everything from that archetype's Easy+Average tiers, but never a technique not taught anywhere in the pack yet — including not yet taught at an earlier *grade*, once multiple grades exist.
5. **Self-contained wording.** No pronoun ambiguity, no missing units, nothing left implicit.
6. **Age/culture-neutral, Filipino-context-friendly.** Names, currency (₱), and scenarios read naturally for a Filipino learner at that grade — same tone as the regular BOW prompts.
7. **Provenance is template-generated, not source-adapted.** `generated_by` records the template version. Nothing traces back to a specific real MTAP reviewer question.
8. **Parametrized, not hand-frozen.** `params` must regenerate a materially different question from the same template without a human rewriting prose.
9. **Scaffold check.** `scaffold_note` must name the specific concept/step carried over from the previous tier (or previous grade's version of the archetype, once cross-grade continuity exists). If it can't honestly point to what came before, the tiering is wrong, not just the note.
10. **Verification pass before `reviewed: true`.** Recompute the answer independently from the rendered question text (and rendered `visual`, if present) — not from the params used to write it.
11. **Numeric option distinctness, checked per-draw, not assumed from formula shape.** Four different distractor *formulas* don't guarantee four different *values* for a given param draw. Verify `{correct_answer, d1, d2, d3}` are pairwise distinct after computing them from the actual drawn params; redraw on collision.
12. **Technique-first solution, when a technique exists.** If `technique` is non-null, `solution_steps` teaches THAT method as the primary path — not a full algebraic setup with the technique mentioned as a footnote. A child re-reading the solution after getting a question wrong should come away faster next time, not just correct next time.

### Parametrization — what makes it a *template*, not one question

Each archetype template defines:
- **Fixed structure:** the sentence skeleton with placeholders (`{name}`, `{a}`, `{b}`, …)
- **Param ranges:** bounds appropriate to the tier (and grade)
- **Constraint rules:** relationships the generator must enforce so params always yield a clean, sensible answer
- **Answer formula:** the exact computation from params → correct_answer, mechanical not judged by feel
- **Distractor formulas:** mechanical too — each wrong option is a defined mutation of the correct computation, not hand-picked

### Worked example — Grade 5, Strand 6, Age Problems, Average tier

Full worked template lives in the [Grade 5 doc](mtap-grade5-expansion-bow.md#worked-example) — kept there since it's the grade-specific reference implementation, not duplicated here.

### Stress test — where the template broke, and the fix

Ran three deliberately different archetypes through the schema before trusting it (all against Grade 5 content, since it was the only grade drafted at the time). Findings already folded into the schema/checklist above; kept here as the record of *why*.

1. **Reading/Interpreting Data (Easy)** — broke immediately: the archetype's whole premise is a rendered table/graph, and the schema had nowhere to hold that. → added the optional `visual` field.
2. **Composite-figure Perimeter/Area (Average)** — same break, confirmed not a one-off: any archetype with a spatial component needs `visual.type: "diagram"`. Constraint-solving for clean integer answers worked fine unmodified.
3. **Two-Mover Motion Problem, head start (Difficult)** — pure numeric, confirmed "solve for one variable last to force a clean answer" generalizes beyond Age Problems. But surfaced a real bug: a distractor formula can, for some param draws, land on the same numeric value as another option. → added checklist item 11.

Net result: the **computational core** (params → mechanical answer formula → mechanical distractor formulas → constraint-solve last variable) held up across all three tests unmodified. The two real gaps were both things the schema silently assumed rather than the underlying design — cheap to fix before scaling to more archetypes and more grades, expensive to retrofit after generating hundreds of items.

---

## Next steps — recommended chronological build order

Research/design phase (strands, archetypes, template spec, contest-prep requirements, technique library) is complete for all 5 grades. Below is the build sequence, ordered by dependency and risk — proving the pipeline on a small slice before committing to the full ~91-archetype scale-up, rather than building everything in parallel from an unvalidated design.

1. **DONE — table schema written.** [supabase/migrations/20260828130000_add_mtap_expansion_content_schema.sql](../supabase/migrations/20260828130000_add_mtap_expansion_content_schema.sql): `mtap_expansion_content` (base, RLS-locked, no direct SELECT for `authenticated`) + `mtap_expansion_content_public` (pre-answer-safe view, reviewed rows only) — mirrors this project's existing `content_questions`/`content_questions_public` pattern. Includes `technique`, `time_budget_seconds`, `visual`, `question_code` (the grade-prefixed id scheme), and every other field from the canonical schema above. **Not yet applied to the live database** — written and ready to review, deploy on your go-ahead.
2. **Decide script-vs-LLM generation per archetype *type*, not per archetype individually.** Purely formulaic archetypes (GCF/LCM, coin problems, motion, most of Strand 1 across grades) → deterministic script, since their answer/distractor formulas are already fully mechanical. Narrative-variance archetypes (custom-operation puzzles, phrasing-heavy word problems) → LLM constrained by the spec. A short categorization pass, not new research.
3. **Pilot ONE full strand end-to-end before scaling.** Recommended: Grade 5 Strand 6 (age/coin/clock/lever/mixture/motion/work) — text-only (no `visual` field, so it doesn't block on QuestModule rendering work), already has one fully-worked template to extend, and its "explicitly derived from Grade 4" methodology is the most interesting case to validate at volume. Write full generation specs for its ~8 archetypes, generate a real batch, and specifically verify the per-draw distinctness check (checklist item 11) actually catches collisions at scale the way it did by hand three separate times during design.
4. **Build the minimal UI the pilot needs**: DB wiring, basic unlock/gating for that one strand, question rendering — deliberately not visual-question rendering yet, since the pilot strand doesn't need it.
5. **Scale generation specs across the remaining ~83 archetypes**, now using a validated pipeline instead of a theoretical one. Batch by technique family where practical (e.g. every "Alternate elimination and retention" archetype shares a solving shape).
6. **Build the UI pieces the pilot deliberately deferred**, once content that needs them actually exists: visual-question rendering (`visual.markdown_table` / `visual.image_url` in `QuestModule.tsx`, reusing the existing lesson-markdown and Logic Labyrinth `<img>` patterns), the Speed Round timer + free-response input mode, and full unlock/gating across all grades.
7. **Tune mastery thresholds' speed component with real solve-time data** — genuinely can't be set correctly before real usage exists, so this is last among the design work, not skippable earlier.
8. **Purchase/entitlement flow + marketing copy**, last — deliberately deferred earlier in this project; now unblocked because there's real content to sell and describe honestly (including the scope-honesty point: state plainly that this prepares for the written elimination round, not oral/team final rounds).
