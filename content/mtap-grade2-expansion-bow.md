# MTAP Grade 2 Expansion Pack — Strands & Archetypes

**Status:** fifth and final grade drafted — completes the Grades 2-6 sweep. Notable for an inverted finding versus Grade 3: **Ratio & Proportion is confirmed present at Grade 2** despite being confirmed *absent* at Grade 3, an odd-looking but evidence-based non-monotonic result worth trusting over intuition here.
**Shared spec:** self-paced structure rationale, sourcing policy, mastery-threshold design, and the canonical Question Template Spec all live in [mtap-expansion-overview.md](mtap-expansion-overview.md) — this doc holds only Grade 2's strand/archetype list.
**Evidence base:** 5 independent real documents (2 pdfcoffee + 1 math-inic raw-text fetch + 1 depedtambayan raw-text fetch + 1 metadata-only dead end) — the deepest evidence base of any grade in this pack. See the [overview's findings table](mtap-expansion-overview.md#cross-grade-findings--verified-against-real-question-text-tier-3) for exact quotes.

---

## A finding worth flagging up front: source answer keys are not infallible

Two separate real sources in this pack's research turned out to have their own answer-key errors — not extraction mistakes on this project's part, errors in the original materials themselves. One math-inic Grade 4 source explicitly noted "No exact answer. For the given answer to be correct, the problem should be [reworded]..." A Grade 2 depedtambayan source similarly gives "3" as the answer to "In 6 years, Alex will be twice his current age. How old is Alex now?" — but solving `a + 6 = 2a` gives `a = 6`, not 3; there is no reading of that problem statement that produces 3. Rather than silently "fix" the historical citation or force a worked example to match a source's wrong answer, the [worked example below](#worked-example) is built on the clean, independently-verified algebra instead, with this discrepancy noted rather than hidden. **Practical implication for content generation:** never treat a scraped reviewer's stated answer as ground truth without independently recomputing it — this pack's own Question Template Spec checklist (item 1: "single verifiable correct answer... derived by actually computing, never eyeballed") exists partly because the *source material itself* isn't reliably self-consistent, not only because generated content might drift.

---

## Structure: Strand → Archetype → Tier

8 strands (independently derived for this grade), each broken into problem archetypes at 3 difficulty tiers (Easy → Average → Difficult), mastery-gated per the [threshold design in the overview](mtap-expansion-overview.md#mastery-thresholds--scaffolded-design-applies-per-archetype-per-grade). A capstone Mixed Trainer Track caps the grade.

---

### Strand 1 — Number Sense
- **Place value, order of operations, comparison** — real quotes: "3 × 10 + 7 × 100 + 4," "what is the place value of 8 in 7,835?," "123 ___ 132" (insert >, =, <)
- **Roman numerals** — real quote: "what number is CDLVII?"
- **Digit-property counting puzzles** — real quote: "how many two-digit numbers are there in which the tens digit is greater than the units digit?" — a counting/combinatorics flavor, distinct from the reversed-digit relationship type seen at higher grades.
- **Calendar/day-of-week patterns** — real quote: "New Year's Day 2020 falls on a Wednesday. What day occurs 5 times in January 2020?"

### Strand 2 — Fractions & Decimals
- Fraction comparison — real quote: "which of the following fractions is nearest to 2?"
- Fraction of a quantity — real quote: "how many more is 2/3 of 96 than 1/4 of 84?"

### Strand 3 — Ratio & Proportion
- **Confirmed present** — real quote: "for every 3 oranges, there are 5 apples. If there are 15 oranges..." — genuine ratio-scaling reasoning, unlike Grade 3 where this same strand was confirmed absent. Treat this as a real finding, not a research inconsistency: the two grades' MTAP content simply differ here.

### Strand 4 — Patterns & Algebra
- **Arithmetic sequences** — real quote: "what is the next number in the pattern 9, 15, 21, 27, 33?"
- **Two-unknowns sum/difference puzzles** — real quotes: "the sum of two numbers is 27 and their difference is 7," "the product of 9 and another number is 135," "if you add 15 to my number and then multiply the sum by 2, you get 66"
- **Simultaneous-constraint "alternate elimination" puzzles** — real quote: "there are 15 tables in a snack bar. Some tables can seat 6 people while some can seat only 4 people. If a maximum of 78 people can be seated, how many 6-people tables are there?" — the classic "chickens and rabbits" family, confirmed present as early as this grade.

### Strand 5 — Geometry & Measurement
- Area & perimeter — real quotes: "area of a rectangle with width 6 cm and length 8 cm," "each side is 25 cm long, how much lace does she need" (perimeter framed as a materials question)
- Length & division into groups — real quotes: "he cut it into 2 pieces, if one piece is 2 meters longer...," "he put 12 of them in each box, how many boxes does he need"

### Strand 6 — Statistics
- **Averages** — real quote: "what is the average of 34, 37, and 40?"
- **Data/graph reading** — real quote: "in which day were there 500 apples picked?" (bar-graph interpretation) — confirms this strand exists a full three grade-levels earlier than the original (wrong) Tier-1 hypothesis claimed.

### Strand 7 — Classic Word-Problem Archetypes
- **Age problems, genuinely algebraic** — real quote: "in 6 years, Alex will be twice his current age. How old is Alex now?" (see the answer-key discrepancy note above — the archetype is real, the source's stated answer is not trustworthy as-is).
- **Coin problems** — real quote: "changed ½ of a ₱200-bill into ₱10-coins and the other half to ₱5-coins."
- **Clock & elapsed time** — real quote: "it is 9:00 o'clock at the moment, what time would it be in 26 hours?"
- **Rate/speed (single-mover primitive)** — real quote: "a farmer can walk 5 kilometers an hour. How many kilometers in 2½ hours?" — simpler than the two-mover motion problems confirmed at higher grades; no meeting-point or head-start complexity yet.
- **Additive comparison problems** ("N more than")** — real quotes: "Allan has 12 more marbles than Alex," "Pete picked 14 more than Lito," "Mica has 7 dolls and Maria has 6 more than Mica's" — distinct from Grade 3's *multiplicative* comparison ("times as many"); this grade's version is purely additive.
- **Position/counting-in-a-line problems** — real quote: "she is 14th in line and there are 12 behind her" (find total).
- **Fractional-spending-chain problems** — real quote: "spent half of her money... spent another [fraction] of money she still has" — successive fractions applied to a shrinking amount, the money-flavored sibling of Grade 3's successive-fraction-of-remaining pattern.
- **Wage/rate-to-total money problems** — real quote: "at ₱45 an hour, how much does she earn a week" (given hours/day and days/week).
- **Lever, mixture, digit-relationship (reversed-digit): NOT found across 4 real sources checked.** Not confirmed present at this grade.

### Strand 8 — Mixed Trainer Track (capstone)
- Shuffled, timed sets drawn from all strands at a matching tier, majority-easy weighting.

---

## Per-archetype generation specs

Each entry: the parametric shape and how Easy → Average → Difficult scaffold onto each other. Schema/checklist: [Question Template Spec](mtap-expansion-overview.md#question-template-spec).

### Strand 1 — Number Sense

**Place value, order of operations, comparison**
- Easy: state the place value of a single digit, or compare two numbers directly.
- Average: a two-operation expression combining multiplication and addition (real confirmed "3×10+7×100+4" pattern).
- Difficult: a three-term expanded-form-style expression requiring careful order-of-operations tracking.

**Roman numerals**
- Easy: convert a simple Roman numeral (≤3 symbols) to Arabic form.
- Average: convert a more complex Roman numeral (real confirmed "CDLVII" pattern, using subtractive notation).
- Difficult: a small arithmetic operation on two Roman numerals.

**Digit-property counting puzzles**
- Easy: count how many single-digit or small-range numbers satisfy a simple digit condition.
- Average: count two-digit numbers satisfying a digit-comparison condition (real confirmed "tens digit greater than units digit" pattern).
- Difficult: a compound condition (e.g. tens digit greater than units digit AND the number is even).

**Calendar/day-of-week patterns**
- Easy: given a date's day of the week, find the day of the week a few days later.
- Average: find which day of the week occurs most often in a given month (real confirmed pattern) given the 1st's day.
- Difficult: a two-month version, or working backward from a stated day-count to find the 1st's day.

### Strand 2 — Fractions & Decimals

**Fraction comparison**
- Easy: compare two simple fractions with the same denominator.
- Average: compare fractions to a benchmark value (real confirmed "nearest to 2" pattern), unlike denominators.
- Difficult: order three or more fractions.

**Fraction of a quantity**
- Easy: direct fraction-of-a-number.
- Average: compare two different fractions of two different quantities (real confirmed "2/3 of 96 vs 1/4 of 84" pattern) — requires computing both before comparing.
- Difficult: a three-way split of one quantity into stated fractions, find the remainder.

### Strand 3 — Ratio & Proportion

**Ratio scaling**
- Easy: given a small ratio (e.g. 3:5) and one quantity, scale to find the other directly.
- Average: given the ratio and a total, find each part (real confirmed "for every 3 oranges, 5 apples, if 15 oranges..." pattern).
- Difficult: the ratio is stated indirectly through a word problem, requiring it to be extracted before scaling.

### Strand 4 — Patterns & Algebra

**Arithmetic sequences**
- Easy: find the next term of a simple sequence.
- Average: find a specific position's term without listing every term.
- Difficult: a sequence with a two-step rule.

**Two-unknowns sum/difference puzzles**
- Easy: sum and difference given directly, find both numbers (real confirmed "sum 27, difference 7" pattern).
- Average: one relationship stated as a compound operation (real confirmed "add 15 to my number, multiply by 2, get 66" pattern) — requires reversing the operation chain.
- Difficult: a product-based relationship instead of sum/difference (real confirmed "product of 9 and another number is 135" pattern) — genuinely different solving approach (division, not elimination).

**Simultaneous-constraint puzzles**
- Easy: two categories, small total, solvable by simple trial.
- Average: the real confirmed "15 tables, 6-seat and 4-seat, max 78 people" pattern — solved via "alternate elimination and retention" (assume all one type, then correct for the difference).
- Difficult: three categories, or the constraint is a range ("at most") rather than an exact total.

### Strand 5 — Geometry & Measurement

**Area & perimeter**
- Easy: direct area or perimeter of a rectangle or square.
- Average: perimeter framed as a materials/cost question (real confirmed "how much lace does she need" pattern).
- Difficult: a shape divided into two parts, find one part's dimension given the whole.

**Length & division into groups**
- Easy: direct division into equal groups, find the number of groups.
- Average: a length divided into two unequal pieces with a stated difference (real confirmed "cut into 2 pieces, one is 2m longer" pattern).
- Difficult: combine both — a total length divided into unequal groups where the group count must also be found.

### Strand 6 — Statistics

**Averages**
- Easy: direct average of 3 small values (real confirmed pattern).
- Average: reverse-solve for a missing value given the average and the rest.
- Difficult: a value is added or removed and the average changes (matches the pattern independently confirmed at Grade 4 and Grade 5 — included here as a natural extension, not independently G2-sourced at this specific tier).

**Data/graph reading**
- Easy: direct lookup from a bar graph (real confirmed "which day were 500 apples picked" pattern).
- Average: a computation across two or more bars (difference, total).
- Difficult: infer a missing bar's value from a stated total.

### Strand 7 — Classic Word-Problem Archetypes

**Age problems**
- Easy: direct "N years from now, age will be..." statement, find the current age (see worked example below — built on verified math, not the source's stated answer).
- Average: reverse — given the current age, find the age at a future/past point under a stated multiple relationship.
- Difficult: two people, ages related both now and at a future point simultaneously.

**Coin problems**
- Easy: single denomination, direct count × value.
- Average: a whole amount split by a stated fraction into two denominations (real confirmed "½ into ₱10-coins, other half into ₱5-coins" pattern) — requires a fraction-of-amount step before the coin-count step.
- Difficult: three denominations, or a stated count relationship between two denominations.

**Clock & elapsed time**
- Easy: direct elapsed-time addition within a 12-hour span.
- Average: elapsed time crossing a 24-hour boundary (real confirmed "9:00, what time in 26 hours" pattern) — requires recognizing the extra full day.
- Difficult: a chain of two elapsed-time steps.

**Rate/speed (single-mover)**
- Easy: direct rate × time (real confirmed "5 km/hr for 2½ hours" pattern).
- Average: reverse — given distance and rate, find time, or given distance and time, find rate.
- Difficult: a rate given in one unit, time given in another, requiring a conversion step before computing.

**Additive comparison problems**
- Easy: direct "N more than" statement, find the larger quantity.
- Average: reverse — given the larger quantity and the difference, find the smaller.
- Difficult: chained comparisons across three people (A has N more than B, B has M more than C, find A given C).

**Position/counting-in-a-line problems**
- Easy: given a position from the front, find the number behind (real confirmed "14th in line, 12 behind" pattern — find total).
- Average: reverse — given the total and the number behind, find the position from the front.
- Difficult: two lines or groups combined, with a stated overlap or relationship between positions.

**Fractional-spending-chain problems**
- Easy: one fraction spent, find the remainder.
- Average: two successive fractions, each applied to what remains after the previous one (real confirmed "spent half, then another [fraction] of what's left" pattern).
- Difficult: three successive fractions, or the reverse — given the final remainder, find the original amount.

**Wage/rate-to-total money problems**
- Easy: direct rate × time = total (real confirmed "₱45/hour" pattern, given hours worked).
- Average: rate given per hour, total time given across multiple days (hours/day × days/week), find total pay.
- Difficult: a rate that changes partway (e.g. overtime rate after a threshold).

---

## Worked example {#worked-example}

Strand 7, Age Problems, Easy tier — deliberately chosen because this is the archetype whose real source had a **wrong stated answer** (see the flag at the top of this doc). The template below is built on independently-verified algebra, not the source's "3."

```
Skeleton: "In {years} years, {name} will be {mult} times {name}'s current
           age. How old is {name} now?"

Params:   mult ∈ {2, 3}, years ∈ {4, 5, 7, 8, 9, 10} (NOTE: 6 is deliberately
          excluded — see the collision note below).

Answer formula:  a = years / (mult − 1)
                  (from a + years = mult × a → a×(mult−1) = years)

Distractor formulas (each a named plausible slip):
  d1 = years / mult              // divided by mult instead of (mult−1) —
                                  // forgot that "years" only accounts for
                                  // the PART of the growth, not the whole
                                  // multiple
  d2 = years + mult               // added mult instead of using it as a
                                  // multiplier — treats the relationship
                                  // like an additive comparison problem
                                  // instead of a multiplicative one
  d3 = years − mult               // subtracted instead of solving the
                                  // proportional relationship

CAUGHT IN ACCURACY PASS: an earlier draft of d2 was years×(mult−1), which
collides with the correct answer exactly whenever mult=2 (since then
mult−1=1, making d2 = years×1 = years = a, identical to the correct
answer's formula for that case) — the same "deterministic identity when a
parameter hits a specific value" bug found in the Grade 4 and Grade 6
worked examples. Replaced with years+mult, verified not to collide with
the correct answer for any value of mult or years in range. A second,
separate check found d3 DOES collide with the correct answer specifically
when mult=3 AND years=6 (verified algebraically: at those values,
correct = 6/2 = 3 and d3 = 6−3 = 3) — this is why years=6 is excluded from
the param range above, rather than left to a per-draw check alone, since
the exact failure value was identifiable and cheap to just remove.

Scaffold note: this is the Easy tier — no prior tier to scaffold from
               within this pack's Strand 7. It IS the foundation Grade 5's
               (explicitly disclosed, see that doc) harder age-problem
               tiers are modeled to build on eventually, in spirit if not
               in a direct generation-time dependency.
```

---

## Technique assignments

Per the [overview's Technique Library](mtap-expansion-overview.md#technique-library--named-reusable-shortcut-methods).

| Archetype | Technique | Note |
|---|---|---|
| Place value, order of operations, comparison | Completing the whole / "dagdag-bawas" | Both directly sourced from the G2 raw-text fetch itself, for fast mental addition within this archetype's Easy tier. |
| Roman numerals | `null` | Place-value decomposition of the numeral, not a separate shortcut. |
| Digit-property counting puzzles | `null` (systematic case-counting by tens-digit) | The real confirmed solution counts case-by-case (tens digit 1→1 number, tens digit 2→2 numbers, ...) — a direct method, already the fastest approach, not a shortcut over something slower. |
| Calendar/day-of-week patterns | Modular arithmetic (mod 7) | Not directly quoted in this pack's sources but the only genuinely faster method than counting days one by one — same treatment as the Clock-angle formula entry in the shared library. |
| Fraction comparison | `null` | Direct comparison after common-denominator or benchmark conversion. |
| Fraction of a quantity | `null` | Direct computation. |
| Ratio scaling | By proportionately | Directly sourced from this exact archetype's real citation. |
| Arithmetic sequences | Arithmetic nth-term formula | |
| Two-unknowns sum/difference puzzles | Twice-bigger/twice-smaller from sum and difference | Directly matches this archetype's own real citations. |
| Simultaneous-constraint puzzles | Alternate elimination and retention | Directly sourced from this exact archetype's real citation (the 15-table seating puzzle) — this is one of the two archetypes the technique's library entry is named for. |
| Area & perimeter | `null` | Direct formula application. |
| Length & division into groups | `null` | Direct arithmetic. |
| Averages | Using a base | Same technique family as the higher grades' averages archetypes. |
| Data/graph reading | `null` | Direct lookup/computation. |
| Age problems | `null` for this grade's Easy-tier direct form (see the [worked example](#worked-example) — straightforward substitution is already the fastest method at this simple a level) | |
| Coin problems | Alternate elimination and retention (for the count/value system sub-cases at higher tiers); `null` for direct Easy-tier computation | |
| Clock & elapsed time | `null` | Direct time arithmetic, incl. the 24-hour-boundary case. |
| Rate/speed (single-mover) | `null` | Direct rate×time computation. |
| Additive comparison problems | `null` | Direct arithmetic. |
| Position/counting-in-a-line problems | `null` | Direct arithmetic. |
| Fractional-spending-chain problems | Working backward through a chain | Same family as Grade 3's fraction-of-remaining and function-machine archetypes. |
| Wage/rate-to-total money problems | `null` | Direct rate×time computation. |

---

## What's still open

- **Strand 6's Difficult tier (Averages)** is an inferred extension of the Grade 4/5-confirmed pattern, not independently G2-sourced.
- **Lever/mixture/reversed-digit "not found"** rests on 4 sources — solid, on par with Grade 6's confident-absence standard, but stated as "not found" rather than "confirmed absent" for consistency with how this pack phrases negative findings that weren't the subject of a dedicated closing search (unlike Grade 5's probability, which was).
- Only the Age Problems/Easy template above is fully worked. The other archetypes need the same skeleton/params/constraints/formula treatment before real generation starts.
- **This completes the Grades 2-6 strand/archetype research and drafting sweep.** See the [overview](mtap-expansion-overview.md) for what's next: the `mtap_expansion_content` table schema, filling out the remaining generation specs, and — eventually, deliberately deferred — the purchase/entitlement flow.
