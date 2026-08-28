# MTAP Grade 5 Expansion Pack — Strands & Archetypes

**Status:** reference implementation — most complete of the four grades in this pack. Template stress-tested against this grade's content.
**Shared spec:** self-paced structure rationale, sourcing policy, mastery-threshold design, and the canonical Question Template Spec all live in [mtap-expansion-overview.md](mtap-expansion-overview.md) — this doc holds only Grade 5's strand/archetype list, per the "each grade gets its own independently-derived strands" decision there.
**Research trail:** [[project_mtap_grade5_expansion_research]].

**⚠ Resolved evidence gap — read before generating Strand 6 content.** An accuracy pass found that Strand 6's canon (age, consecutive-number, coin, clock, lever, mixture, motion, work) and Strand 1's reversed-digit sub-archetype were never individually Tier-3-verified as appearing in a real Grade 5 document — carried from the first, weakest search pass and never retrofitted. A dedicated closing pass then tried 8+ more real sources (pdfcoffee multiple sets, scribd, educatorsfiles, depedtambayanph, quizalize, targeted searches) specifically hunting for Grade-5 clock/coin/mixture questions — every lead dead-ended on metadata-only pages or found nothing MTAP-attributable. Rather than leave this as an open "probably true" claim, or keep searching indefinitely, **the resolution is a disclosed methodological choice, not a citation**:

> **Strand 6's archetypes for Grade 5 are explicitly generated as harder-tier extensions of the Grade-4-verified versions of the same archetypes** (see [Grade 4 Strand 6](mtap-grade4-expansion-bow.md)), not presented as independently-sourced Grade 5 content. Concretely: Grade 4's confirmed Age, Lever, Rate/Motion, and Work-adjacent patterns are the anchor; Grade 5's Easy tier for each archetype should be calibrated to sit at or above Grade 4's Difficult tier for the same archetype, per the cross-grade scaffolding principle already used everywhere else in this pack ([overview](mtap-expansion-overview.md#mastery-thresholds--scaffolded-design-applies-per-archetype-per-grade)). This is honest about what it is — a defensible design decision building on verified content one grade down, not a claim that these exact questions were found in a real Grade 5 document, because they weren't.

This resolution applies to Strand 6 in full and to Strand 1's reversed-digit sub-archetype (which has a direct Grade 3 anchor: "ones digit is two more than thrice tens digit"). Every other strand in this document (Number Sense's other sub-archetypes, Fractions/Ratio, Patterns, Geometry, Statistics) rests on its own Tier-3 Grade 5 evidence and is unaffected by this note.

---

## Structure: Strand → Archetype → Tier

7 strands, each broken into **problem archetypes** (the recurring "shape" of MTAP questions), each archetype offered at 3 difficulty tiers matching MTAP's own elimination-round tiering: **Easy → Average → Difficult**. A child unlocks Average only after a mastery threshold on Easy, same idea for Difficult — see [mastery threshold design](mtap-expansion-overview.md#mastery-thresholds--scaffolded-design-applies-per-archetype-per-grade).

A final **Mixed Trainer Track** (all strands shuffled, timed, tiered) simulates the actual elimination-round experience once the strand tracks are cleared — the "compete" use case.

---

### Strand 1 — Number Sense
- **Place value & digit problems** — reversed-digit relationships (classic `10t + u` setup), digit-sum puzzles
- **Primes, factors, multiples** — GCF/LCM word problems, prime identification
- **Rounding & comparing** — whole numbers, decimals, fractions on a shared number line

### Strand 2 — Fractions, Decimals, Ratio & Proportion
- Operations on fractions/mixed numbers/decimals (multi-step)
- Ratio & proportion word problems
- Rate problems (unit price, scaling)

### Strand 3 — Patterns & Algebra
- Sequence / nth-term patterns (arithmetic, simple geometric, figural)
- Missing-number equations, simple one-step algebra dressed as puzzles

### Strand 4 — Geometry & Measurement
- Perimeter, area, volume (including composite figures)
- Angles (including clock-hand angle problems — see Strand 6)
- Unit conversion chains

### Strand 5 — Statistics
- Reading/interpreting tables, bar graphs, pictographs
- Averages (including "average changes when a value is added/removed" — a real confirmed MTAP pattern)
- ~~Basic probability~~ — **removed.** Checked 3 independent real Grade 5 documents (incl. a 2002-2015 multi-year competition collection) plus a dedicated search: zero probability questions found. This archetype was never real MTAP-5 content, just an assumption from the original weak-evidence pass. Probability looks like a genuine Grade 6 introduction instead — see [overview](mtap-expansion-overview.md).

### Strand 6 — Classic Word-Problem Archetypes
*(This is the strand that makes it feel like "real MTAP" — these are generic algebra word-problem archetypes, not MTAP-proprietary, but MTAP leans on them heavily.)*
- **Age problems** — "X years ago/from now" relationships
- **Consecutive-number problems** — sum/product of consecutive integers
- **Coin/money problems** — mixed denominations, total value
- **Clock problems** — angle between hands, elapsed time
- **Lever/balance problems** — `weight × distance = weight × distance` (seesaw-balance) reasoning; *discovered in the Grades 2-6 cross-grade research pass, added retroactively — see [overview](mtap-expansion-overview.md)*
- **Mixture problems** — combining quantities at different rates/concentrations
- **Motion/rate problems** — speed-distance-time, two movers
- **Work problems** — combined work rate

### Strand 7 — Mixed Trainer Track (capstone)
- Shuffled, timed sets drawn from all strands at a matching tier, structured like an actual elimination round (majority easy, some average, few difficult) — the "compete-readiness" simulator.

---

## Per-archetype generation specs

Each entry: the **parametric shape** (what's fixed vs. what varies) and how Easy → Average → Difficult scaffold onto each other. These are templates for generating original questions, not real question text. Schema/checklist these must satisfy: [Question Template Spec](mtap-expansion-overview.md#question-template-spec).

### Strand 1 — Number Sense

**Place value & digit problems**
- Shape: a 2- or 3-digit number defined by digit relationships (e.g. tens digit is N more than units digit); solve for the original number, or find it from a reversed/sum/difference clue.
- Easy: 2-digit, one direct relationship ("tens digit is twice the units digit, digits sum to 9 — find the number").
- Average: 2-digit, reversed-number relationship (`10t+u` vs `10u+t`, e.g. "reversing the digits increases the number by 27").
- Difficult: 3-digit, two combined relationships, or requires testing multiple candidates.

**Primes, factors, multiples (GCF/LCM)**
- Shape: two numbers (or an event-repetition context — "bells ring every X and Y minutes") → GCF or LCM word problem.
- Easy: direct "find the GCF/LCM of A and B" with small numbers (≤50).
- Average: wrapped in a context (packing into equal groups, two events syncing up).
- Difficult: three numbers, or requires GCF and LCM together (e.g. simplifying a ratio then finding a syncing point).

**Rounding & comparing**
- Shape: a set of whole numbers/decimals/fractions to order, round, or compare on a shared scale.
- Easy: same type (all decimals, or all fractions with common denominators).
- Average: mixed types (order a decimal, a fraction, and a whole number together).
- Difficult: requires rounding *before* comparing changes the order (a "trick" the Easy/Average tiers set up by making direct comparison the default habit).

### Strand 2 — Fractions, Decimals, Ratio & Proportion

**Fraction/decimal/mixed-number operations**
- Easy: single operation, like denominators or straightforward decimal alignment.
- Average: two-step (e.g. add then simplify, or convert-then-subtract), unlike denominators.
- Difficult: three+ terms or mixed operation types in one expression.

**Ratio & proportion**
- Easy: "if the ratio is A:B and one part is X, find the other" — direct scaling.
- Average: word problem requiring the ratio to be inferred from a scenario first, then scaled.
- Difficult: combined/compound ratios (three quantities, or ratio changes partway through the story).

**Rate problems**
- Easy: unit rate lookup (cost per item, direct division).
- Average: scaling a rate to a new quantity.
- Difficult: comparing two different rates to find which is better, or a rate that changes mid-problem.

### Strand 3 — Patterns & Algebra

**Sequence / nth-term patterns**
- Easy: arithmetic sequence, find the next term.
- Average: find the nth term (requires spotting the rule, not just continuing it) — this is exactly what Easy quietly trained.
- Difficult: figural/geometric pattern (visual growth) or a sequence with a two-step rule.

**Missing-number equations / simple algebra**
- Easy: one-step ("what number plus 8 equals 23").
- Average: two-step or the unknown appears twice ("a number, doubled, then minus 5, is 17").
- Difficult: framed as a story problem the child must translate into the equation themselves — Average already taught the equation mechanics, Difficult adds the translation step.

### Strand 4 — Geometry & Measurement

**Perimeter, area, volume**
- Easy: single regular shape, formula plug-in.
- Average: composite figure (two shapes combined) — built directly on the single-shape formulas from Easy.
- Difficult: reverse problem (given the area/volume, find a missing dimension) or composite with an irregular cutout.

**Angles**
- Easy: read/identify an angle type, or simple angle-sum (straight line, triangle).
- Average: multi-angle relationships (parallel lines, or clock-hand angle at an exact hour) — see also Strand 6 Clock Problems, which shares this mechanic.
- Difficult: clock-hand angle at a non-exact time (e.g. 3:40), which requires the proportional-movement idea Average didn't need.

**Unit conversion chains**
- Easy: single-step conversion within one system (cm to m).
- Average: two-step chain (mm to m to km), or converting within a word problem.
- Difficult: conversion combined with another operation (convert, then find area/perimeter).

### Strand 5 — Statistics

**Reading/interpreting data**
- Easy: direct lookup from a table/bar graph ("how many students chose X").
- Average: requires a computation across the data (total, difference, average of shown values).
- Difficult: requires inferring a missing value or combining two data displays.

**Averages**
- Shape: a set of values → find the average, or reverse-solve (find a missing value given the average). Directly modeled on a real confirmed MTAP-5 question type.
- Easy: direct average of a given small set ("find the average of 34, 37, 40").
- Average: reverse problem — given the average and all-but-one value, find the missing value.
- Difficult: a value is added or removed from the set and the average changes — solve for the new average or the removed/added value (this is the exact real pattern found: "average of 13 numbers is 57; two numbers, 78 and 102, are removed; find the new average").

*(Basic probability was removed from this strand — see note above. If probability content is wanted for the Grade 5 pack anyway, it should ship explicitly labeled as bonus/non-MTAP content, not presented as authentic MTAP-5 material.)*

### Strand 6 — Classic Word-Problem Archetypes

**Age problems**
- Easy: direct present-age relationship ("A is twice as old as B; A is 12; how old is B").
- Average: past/future framing ("in 5 years, A will be...").
- Difficult: relationship holds across two different time points simultaneously (classic "sum of ages" + "ratio in N years" combined).

**Consecutive-number problems**
- Easy: sum of two consecutive numbers given.
- Average: three consecutive numbers, or consecutive even/odd numbers.
- Difficult: product (not sum) of consecutive numbers, or a sum with a non-trivial total requiring the algebraic setup Average already introduced.

**Coin/money problems**
- Easy: single denomination, direct count × value.
- Average: two denominations, total value and total count both given.
- Difficult: three denominations, or a constraint on the relationship between counts (e.g. "twice as many 5-peso coins as 10-peso coins").

**Clock problems**
- Easy: elapsed time between two given clock readings.
- Average: angle between hands at an exact hour.
- Difficult: angle between hands at an arbitrary time (needs the minute-hand's continuous movement — the proportional-reasoning leap flagged in Strand 4 Angles).

**Lever/balance problems**
- Shape: two or more weights at given distances from a fulcrum; balance requires `w1 × d1 = w2 × d2` (or the sum on one side equals the sum on the other).
- Easy: two weights, one distance unknown, direct single-equation solve.
- Average: two weights, both distances given but the unknown is one of the weights, or three weights on one side balanced by a fourth.
- Difficult: multiple weights on both sides, or the fulcrum position itself is unknown — builds directly on the single-equation balance relationship Easy/Average already established.

**Mixture problems**
- Easy: combining two quantities of the same item at stated amounts (no rate/concentration).
- Average: combining two different concentrations/prices to find a resulting average.
- Difficult: solving for an unknown quantity needed to hit a target mixture — inverts the direction Average established.

**Motion/rate problems**
- Easy: single mover, direct speed-distance-time (one unknown of the three).
- Average: two movers, same direction or towards each other, meeting point/time.
- Difficult: two movers with a head start or a mid-journey speed change.

**Work problems**
- Easy: single worker's rate, time to finish a job.
- Average: two workers combined rate (classic "pipe fills a tank" setup).
- Difficult: workers join/leave partway through, or one worker's rate is defined relative to another's.

### Strand 7 — Mixed Trainer Track
- Not a new archetype set — draws from the above, weighted toward Easy/Average with a minority of Difficult items, timed, matching the real elimination round's tiering feel (majority easy, fewer average, fewest difficult).

---

## Worked example {#worked-example}

Strand 6, Age Problems, Average tier — full trace through the [Question Template Spec](mtap-expansion-overview.md#question-template-spec), illustrating the mechanics, not a bank entry.

```
Skeleton: "{name} is {a} years old. In {years} years, {name} will be {mult}
           times as old as {other} is now. How old is {other} now?"

Params:   a ∈ [10, 16], years ∈ [3, 8], mult ∈ [2, 3] (must not equal 1)
Constraint: other_age = (a + years) / mult must be a positive integer
            → generator solves for `years` last, picking the smallest valid
              value ≥3 that keeps other_age an integer, so params never
              produce a broken question.

Answer formula:  other_now = (a + years) / mult

Distractor formulas (each a named plausible slip):
  d1 = a / mult                      // forgot to add `years` before dividing
  d2 = (a + years) - mult            // subtracted instead of dividing
  d3 = (a - years) / mult            // wrong sign on the time shift

Scaffold note: relies on the Easy-tier skill of computing "age in N years"
               (a + years) directly — Average adds the "divide by a ratio"
               step on top of that already-mastered piece.
```

Feed this skeleton + constraints + formulas to a generator (script or LLM prompt) and it can produce unlimited distinct, pre-verified Age-Problems/Average questions — each one automatically satisfying the checklist, because the checklist is baked into the template's constraints rather than checked question-by-question after the fact.

---

## Technique assignments

Per the [overview's Technique Library](mtap-expansion-overview.md#technique-library--named-reusable-shortcut-methods) — every archetype's fastest known method, or an honest `null` where none exists.

| Archetype | Technique | Note |
|---|---|---|
| Place value & digit problems | `null` | No faster-than-systematic method identified for reversed-digit relationship problems — solved via direct algebra or constrained trial. |
| Primes, factors, multiples (GCF/LCM) | Digit-sum divisibility rules | Quick factor elimination before full factorization. |
| Rounding & comparing | `null` | Direct rounding procedure; no shortcut beyond it. |
| Fraction/decimal ops | `null` | Standard procedure. |
| Ratio & proportion | By proportionately | Build one ratio "unit," scale to the total. |
| Rate problems | By proportionately | Same family as ratio. |
| Sequence / nth-term patterns | Arithmetic nth-term formula (`a₁ + (n−1)d`) | Not in the shared library (too narrow/standard to warrant a full entry there) — avoids listing every term to reach the nth. |
| Missing-number equations | Working backward through a chain | Invert each operation in reverse order. |
| Perimeter, area, volume | `null` (Difference-of-squares shortcut for ring/composite-difference sub-cases only) | Most sub-cases are direct formula application. |
| Angles | Clock-angle formula (`\|30H−5.5M\|`) for the clock-hand sub-case; `null` otherwise | |
| Unit conversion chains | `null` | Systematic multiplication chain. |
| Reading/interpreting data | `null` | Direct lookup/computation. |
| Averages | Using a base | Assume a uniform value, correct only the deviation — matches this strand's own confirmed "discard-and-recompute" pattern. |
| Age problems | Twice-bigger/twice-smaller (when sum+difference framed) or Alternate elimination and retention | Two valid techniques depending on exact phrasing; either is faster than full substitution. |
| Consecutive-number problems | Gauss pairing | Directly sourced from this exact archetype's real citation. |
| Coin problems | Alternate elimination and retention | Directly sourced from this exact archetype's real citation (via the Grade 3/4 anchor this strand is derived from). |
| Clock problems | Clock-angle formula | |
| Lever/balance problems | `null` | The balance equation IS the direct method; no faster shortcut beyond setting it up correctly. |
| Mixture problems | Alternate elimination and retention | Assume uniform concentration, correct for the difference. |
| Motion/rate problems | `null` generally; relative-speed/closing-distance framing for two-mover sub-cases | Two-mover problems benefit from thinking in terms of the *closing* rate rather than each mover separately, though this isn't a named technique in the library. |
| Work problems | `null` generally; Using a base for reverse-solve sub-cases | Combined-rate setup is the direct method for most tiers. |

---

## What's still open

- Only this Age Problems/Average template is fully worked. The other 20 Grade 5 archetypes × 3 tiers (21 total, after Lever/balance problems was added) need the same skeleton/params/constraints/answer-formula/distractor-formula treatment before real generation starts.
- Whether generation happens via a deterministic script (numeric archetypes: digit problems, coin problems, motion/rate, GCF/LCM — all cleanly formulaic) vs. an LLM prompt constrained by the spec (archetypes with more narrative variance) is a per-archetype call, not one blanket answer.
- Grades 2-4 strand/archetype docs don't exist yet — see [overview Next Steps](mtap-expansion-overview.md#next-steps-not-yet-done).
