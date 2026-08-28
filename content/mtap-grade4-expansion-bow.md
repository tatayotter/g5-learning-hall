# MTAP Grade 4 Expansion Pack — Strands & Archetypes

**Status:** second grade drafted, second-most-verified after Grade 5. Every archetype below traces to a real quoted question from at least one of 3 independent real documents, except Patterns (flagged, see below).
**Shared spec:** self-paced structure rationale, sourcing policy, mastery-threshold design, and the canonical Question Template Spec all live in [mtap-expansion-overview.md](mtap-expansion-overview.md) — this doc holds only Grade 4's strand/archetype list, per the "each grade gets its own independently-derived strands" decision there.
**Evidence base:** 3 independent real documents (2 pdfcoffee + 1 math-inic) — see the full cross-grade findings table in the [overview](mtap-expansion-overview.md#cross-grade-findings--verified-against-real-question-text-tier-3) for exact quotes and source-by-source breakdown.

---

## Structure: Strand → Archetype → Tier

7 strands (independently derived for this grade — not Grade 5's strand list reused), each broken into problem archetypes at 3 difficulty tiers (Easy → Average → Difficult), mastery-gated per the [threshold design in the overview](mtap-expansion-overview.md#mastery-thresholds--scaffolded-design-applies-per-archetype-per-grade). A capstone Mixed Trainer Track caps the grade once its strands are cleared.

---

### Strand 1 — Number Sense
- **Place value & digit-counting puzzles** — real quotes: "the value of 3 in 93 086," "how many numbers from 40 to 70 contain the digit 5" (a combinatorics-flavored digit puzzle distinct from Grade 5's reversed-digit `10t+u` type)
- **Rounding & estimation** — "round 23,503 to the nearest thousand," "round each addend to the nearest thousand" (round-then-operate, not just round-alone)
- **Divisibility rules & remainders** — "what is the remainder when 7,893 is divided by 26," plus the alternating-digit-sum divisibility-by-11 trick
- **GCF/LCM** — "GCF of 36, 24, 48," "LCM of 36, 27, 54," plus a real LCM-*cycle* word problem ("Maria eats every 3 hours, Jane every 4 hours — when do they next eat together")

### Strand 2 — Fractions, Decimals, Ratio & Proportion, Percentage
- Fraction/mixed-number operations and conversion ("change 8 7/12 to an improper fraction")
- **Ratio & proportion** — real quotes: "ratio of adults to kids 5∶2," "ratio of 2:3... sum of the numbers," "two numbers have a ratio of 3:5 and one number is 16 more than the other"
- **Percentage & discount** — "a pair of shoes marked ₱450 was sold at a discount of 15%," "the jeans has a discount of 12%," "winning percentage" framing (wins/total games)

### Strand 3 — Patterns
- **Sequence / nth-term patterns** — now confirmed with a real quote from a 4th source, a named 2019 MMC Grade 4 Divisionals document: *"Find the sum of the numbers in the 20th triple: (1,4,7), (2,6,9), (3,8,11), (4,10,13), ..."* [answer: 107] — an arithmetic-sequence-of-triples pattern at the Difficult tier. (Previously flagged as inferred-from-continuity only; closed in a follow-up pass. That same source also cross-validated several other archetypes in this doc word-for-word — see [overview](mtap-expansion-overview.md) for the source note.)

### Strand 4 — Geometry & Measurement
- Perimeter (including reverse problems: "perimeter of a regular hexagon of side 12 2/3 meters")
- Area, including reverse area→side problems
- **Angles** — real quote: "two supplementary angles are in the ratio 2:3. Find the bigger angle" (angles + ratio combined — a natural bridge archetype between Strand 2 and Strand 4)

### Strand 5 — Statistics
- **Averages** — real quote: "a basketball team scores an average of 53 points per game in its first 4 games and an average of 52 points per game in its first 5 games. How many points did the team score in its 5th game?" — this exact reverse/discard-and-recompute average pattern is the confirmed G4 shape, distinct from Grade 5's simpler "average of a list" starting point.

### Strand 6 — Classic Word-Problem Archetypes
- **Age problems** — real quote: "Maria is two more than twice the age of her brother John. If John is 6 years old, how old is Maria?"
- **Lever/balance problems** — real quote (2nd G4 source): "two pieces of silver together weigh 55 grams... an additional weight of 11 grams is placed with the smaller piece" — confirms lever/balance reasoning at G4, cross-validating the Grade 3 finding of the same archetype.
- **Rate/motion problems** — real quotes: "a cyclist covered 50 kilometers at a speed of 12.5 km/hr. How long did it take?" and "the water in Angat Dam goes up 12 cm in 30 minutes — how many centimeters does the Dam go up every minute" (a rate-of-change framing, not just distance/speed/time)
- **Custom-defined-operation puzzles** — real quote: "he writes 3@2 = 3×3−2×2. Using John's technique, what is the value of 6@4?" — a distinctive G4 archetype not confirmed at any other grade checked: a symbol is defined by an arbitrary rule, then applied to a new pair of numbers.

### Strand 7 — Mixed Trainer Track (capstone)
- Shuffled, timed sets drawn from all strands at a matching tier, majority-easy weighting, matching the real elimination round's tiering feel.

---

## Per-archetype generation specs

Each entry: the parametric shape and how Easy → Average → Difficult scaffold onto each other. Schema/checklist these must satisfy: [Question Template Spec](mtap-expansion-overview.md#question-template-spec).

### Strand 1 — Number Sense

**Place value & digit-counting puzzles**
- Shape: either a direct place-value read, or a counting puzzle over a number range with a digit condition.
- Easy: direct place-value read ("what is the value of the digit N in [number]").
- Average: counting puzzle over a small range ("how many numbers from 1 to 30 contain the digit 2").
- Difficult: counting puzzle with a compound condition (contains digit N but not digit M; or a range spanning a digit-count boundary like 90-110).

**Rounding & estimation**
- Easy: round a single number to a stated place.
- Average: round two addends *before* summing, compare to the true sum (the real confirmed pattern: "round each addend to the nearest thousand").
- Difficult: a multi-step estimation where rounding-then-computing gives a different answer than computing-then-rounding — the child must know which order the question wants.

**Divisibility rules & remainders**
- Easy: direct remainder computation (a ÷ b, state the remainder).
- Average: apply a named divisibility rule (e.g. the alternating-sum-of-digits rule for 11) to check divisibility without dividing.
- Difficult: combine a divisibility rule with a search ("what is the smallest number greater than X divisible by 11").

**GCF/LCM**
- Easy: direct "find the GCF/LCM of A and B."
- Average: an LCM-cycle word problem — two repeating events, find when they next coincide (the real confirmed pattern).
- Difficult: three numbers, or GCF and LCM needed together (e.g. simplify a ratio via GCF, then use LCM to solve a syncing question built on that ratio).

### Strand 2 — Fractions, Decimals, Ratio & Proportion, Percentage

**Fraction/mixed-number operations**
- Easy: single conversion (mixed ↔ improper) or single operation, like denominators.
- Average: two-step, unlike denominators, or a conversion-then-operate chain.
- Difficult: three+ terms or a reverse problem (given the result, find a missing fraction).

**Ratio & proportion**
- Easy: direct ratio scaling ("ratio is A:B, one part is X, find the other").
- Average: ratio inferred from a real-world payment/mixture scenario, then scaled (the real confirmed "adults:kids 5:2, total paid, find number of adults" pattern).
- Difficult: "one number is N more than the other" combined with a ratio — requires setting up and solving from the ratio *and* the difference simultaneously (the real confirmed "ratio 3:5, one number 16 more than the other" pattern).

**Percentage & discount**
- Easy: direct percent-of-a-number.
- Average: discount problem (marked price, percent off, find sale price).
- Difficult: percent framed as a ratio of outcomes (win/loss percentage, "how many of the remaining games must be won to reach X% of the season") — the real confirmed harder pattern.

### Strand 3 — Patterns

**Sequence / nth-term patterns**
- Easy: arithmetic sequence, find the next term.
- Average: find the nth term.
- Difficult: a compound structure — real confirmed pattern: three parallel arithmetic sequences grouped into triples, where the *sums* of each triple themselves form a second-order arithmetic sequence ("find the sum of the numbers in the 20th triple"). Solving requires first noticing the inner pattern (each triple's own arithmetic structure), then the outer pattern (triple-sums form their own sequence) — a genuine two-layer pattern-recognition step, confirmed harder than a simple two-step rule.

### Strand 4 — Geometry & Measurement

**Perimeter & area (incl. reverse problems)**
- Easy: single regular shape, formula plug-in, including shapes with fractional side lengths (the real confirmed pattern used a hexagon with side `12 2/3 m`).
- Average: reverse problem — given the perimeter/area, find a missing side.
- Difficult: composite figure, or a reverse problem requiring a fraction/mixed-number side length to be solved for.

**Angles**
- Easy: direct angle-sum or angle-type identification.
- Average: supplementary/complementary pair where the two angles are described by a ratio (the real confirmed "supplementary angles in ratio 2:3" pattern) — deliberately built on the Strand 2 ratio skill.
- Difficult: a chain of angle relationships (e.g. three angles on a line, two related by ratio, solve for all three).

### Strand 5 — Statistics

**Averages**
- Easy: direct average of a small list.
- Average: given two different average/count-of-games snapshots (avg of first 4 games, avg of first 5 games), find the value that changed between them — the real confirmed G4 pattern, not the simpler "just average this list" starting point Grade 5 uses. This is deliberately a step up from Grade 5's Easy tier — a design note worth remembering when both grades' Statistics strands are compared.
- Difficult: three snapshots, or the reverse (given the change, find one of the original values).

### Strand 6 — Classic Word-Problem Archetypes

**Age problems**
- Easy: direct present-age relationship ("A is N more than twice B's age; B is given; find A").
- Average: reverse of Easy — given A, solve for B.
- Difficult: relationship holds at a *different* time point (past/future), requiring the child to track two time references at once.

**Lever/balance problems**
- Shape: two weights, a balance point, and a change (added/moved weight) — `weight × distance = weight × distance`, or a total-weight-plus-difference setup as in the real confirmed example.
- Easy: two weights, total and difference given, solve for each (mirrors the real "55 grams total, 11 grams added to the smaller piece" pattern, which is actually a sum/difference algebra problem wearing a lever costume — worth noting this G4 example is *simpler* than a true torque-balance lever problem).
- Average: an actual distance-based balance (`w1×d1 = w2×d2`), solve for one weight or distance.
- Difficult: three points on the lever, or the fulcrum position itself unknown.

**Rate/motion problems**
- Easy: single mover, direct speed-distance-time (one unknown of the three) — real confirmed pattern: "cyclist covered 50 km at 12.5 km/hr, how long."
- Average: rate-of-change framing — a quantity changes by X over time Y, find the per-unit rate (real confirmed dam-water-level pattern).
- Difficult: combine both — a rate-of-change scenario where the question asks for a projected future value, not just the current rate.

**Custom-defined-operation puzzles**
- Shape: a symbol `@` (or similar) is defined by an arbitrary formula involving two operands, demonstrated with one worked example, then applied to a new pair.
- Easy: direct substitution into a simple defined operation (e.g. `a@b = 2a + b`).
- Average: the defined operation is asymmetric or has a subtraction/multiplication mix (real confirmed pattern: `a@b = 3a − 2b`), and the question reverses it — given the result and one operand, find the other.
- Difficult: the defined operation is applied twice, chained (`(a@b)@c`), or the definition itself must be inferred from two worked examples before being applied.

---

## Worked example

Strand 6, Custom-defined-operation puzzle, Average tier — chosen because it's the most distinctive Grade 4 archetype found, not seen at any other grade checked, and a good test that the [Question Template Spec](mtap-expansion-overview.md#question-template-spec) generalizes past "standard" word-problem shapes.

```
Skeleton: "For any two numbers, {a}@{b} = {p}×{a} − {q}×{b}. Given that
           {x}@{k} = {result}, what is the value of {k}?"

Params:   p ∈ [2, 4], q ∈ [2, 3] (p ≠ q, so the operation isn't symmetric-looking —
          NOTE: q must exclude 1, see the d3 collision below),
          x ∈ [4, 12], k solved for, not drawn directly.
Constraint: pick k ∈ [2, 10] first (a clean small integer), compute
            result = p×x − q×k, THEN present the question with x and result
            given and k as the unknown — this ordering (solve forward, ask
            backward) is what makes it "Average" rather than "Easy," and
            guarantees k always comes out to the clean integer it started as.

Answer formula:  k = (p×x − result) / q

Distractor formulas (each a named plausible slip):
  d1 = (p×x + result) / q          // added instead of subtracting result
  d2 = (result − p×x) / q          // sign flipped on the whole numerator
  d3 = (p×x − result) × q          // multiplied by q instead of dividing

CAUGHT IN ACCURACY PASS: since (p×x − result) = k×q by the answer formula
rearranged, d3 = (k×q)×q = k×q². If q=1, d3 = k — a silent collision with
the correct answer, exactly the failure mode checklist item 11 exists to
catch. This is why q's range above is [2,3], not [1,3] as an earlier draft
had it — excluding q=1 makes the collision structurally impossible rather
than relying on a per-draw redraw-on-collision check to catch it every time.

Scaffold note: relies on the Easy-tier skill of direct forward substitution
               into a defined operation — Average adds the "run the defined
               operation backward, solve for the missing operand" step,
               which is exactly the reverse-equation skill Strand 2's ratio
               Average tier and Strand 6's Age Average tier also build,
               just applied to a novel (invented, not standard-arithmetic)
               operation.
```

---

## Technique assignments

Per the [overview's Technique Library](mtap-expansion-overview.md#technique-library--named-reusable-shortcut-methods).

| Archetype | Technique | Note |
|---|---|---|
| Place value & digit-counting puzzles | `null` (systematic case-counting for the combinatorics sub-type) | The real confirmed "digit 1 in 1-100" solution counts by place (units/tens/hundreds) separately — a direct method, not a shortcut over a slower one. |
| Rounding & estimation | Completing the whole | Round-then-adjust, same family as fast mental addition. |
| Divisibility rules & remainders | Digit-sum divisibility rules | Directly sourced from this exact archetype's real citation (÷11 alternating-sum). |
| GCF/LCM | Digit-sum divisibility rules (elimination) then direct factorization | |
| Fraction/mixed-number operations | `null` | Standard procedure. |
| Ratio & proportion | By proportionately | Directly sourced from this exact archetype's real citation. |
| Percentage & discount | `null` generally; Reverse-percent restoration for the "restore original price" sub-case | |
| Patterns (sequences) | Arithmetic nth-term formula | |
| Perimeter & area (incl. reverse) | `null` | Direct formula/reverse-solve. |
| Angles | `null` generally; distribute-the-difference-equally reasoning for the confirmed supplementary-ratio sub-case | Real source solved the isosceles-triangle angle problem this way (E3) — worth noting as a technique even though not yet in the shared library, since it's grade-specific enough not to warrant a full library entry. |
| Averages | Using a base | Directly sourced from this exact archetype's real citation (the basketball-average problem this whole technique entry is named for). |
| Age problems | Twice-bigger/twice-smaller when sum/difference-framed; direct substitution otherwise | |
| Lever/balance problems | By addition and by subtraction (elimination) | The real confirmed example ("55 grams total, 11 grams added to smaller piece") is a sum/difference system, solvable the same way as the guava/apple problem. |
| Rate/motion problems | `null` | Direct rate formula. |
| Custom-defined-operation puzzles | `null` | Ad-hoc definition per question — nothing to shortcut; direct substitution/reverse-solve is the only method, honestly. |

---

## What's still open

- Every archetype in this doc now traces to a real Tier-3 quote — the last open item (Strand 3 Patterns) was closed with a 4th source. No known unverified claims remain in this document.
- Only the Custom-operation/Average template above is fully worked. The other archetypes across all 7 strands need the same skeleton/params/constraints/answer-formula/distractor-formula treatment before real generation starts — same open item Grade 5 has, at a less-far-along stage since Grade 4 is newer.
- Grades 2, 3, 6 strand/archetype docs still don't exist yet — see [overview Next Steps](mtap-expansion-overview.md#next-steps-not-yet-done).
