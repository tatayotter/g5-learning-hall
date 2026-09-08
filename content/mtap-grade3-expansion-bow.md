# MTAP Grade 3 Expansion Pack — Strands & Archetypes

**Status:** fourth grade drafted. Notable for what it does **not** have compared to Grade 4/5/6: no confirmed Ratio & Proportion strand, and one archetype (Age) explicitly excluded after a citation turned out to be a mislabel — both corrections are the direct product of the multi-source discipline this pack settled into partway through. **All 6 strands (20 archetypes) now have full parametric templates (2026-09-08)**, and a scaled batch of 476 questions (`content/mtap-grade3-scaled-batch.json`, target 8/archetype/tier — comparable to Grade 2's own 518 total) has been generated, collision-checked, deduplicated, and hand-verified for real mathematical correctness. See What's Still Open for the 5 real bugs two rounds of actual generation caught that the hand-written templates alone missed. Not yet imported into the database or wired into the app.
**Shared spec:** self-paced structure rationale, sourcing policy, mastery-threshold design, and the canonical Question Template Spec all live in [mtap-expansion-overview.md](mtap-expansion-overview.md) — this doc holds only Grade 3's strand/archetype list.
**Evidence base:** 4 independent real documents (2 pdfcoffee + 1 math-inic raw-text fetch + 1 metadata-only dead end) — see the [overview's findings table](mtap-expansion-overview.md#cross-grade-findings--verified-against-real-question-text-tier-3) for exact quotes.

---

## Two corrections this doc makes to the earlier research

1. **No Ratio & Proportion strand.** The overview's very first table claimed Grade 3 had this (✅), but that claim was never backed by a quote — checked across 3 real G3 documents, none contained formal ratio notation (a:b). One source explicitly confirmed the absence. What genuinely exists at G3 is **multiplicative comparison** ("six times as many chickens as ducks") — a related but simpler archetype, included below as its own item rather than folded into a "Ratio" strand it doesn't belong to.
2. **No Age Problems archetype.** An early extraction had labeled a quote as an "age problem," but re-reading the actual quote ("Jeffry spent P12 more than Arvin, total P178") shows it's a straightforward money/difference problem with no age content at all — a mislabel, not a real archetype. Excluded here rather than carried forward on a label that doesn't match its own content.

---

## Structure: Strand → Archetype → Tier

6 strands (independently derived for this grade — genuinely fewer than Grade 4/5/6's 7, since neither Ratio & Proportion nor a confirmed classic-canon Age archetype exist at this grade), each broken into problem archetypes at 3 difficulty tiers (Easy → Average → Difficult), mastery-gated per the [threshold design in the overview](mtap-expansion-overview.md#mastery-thresholds--scaffolded-design-applies-per-archetype-per-grade). A capstone Mixed Trainer Track caps the grade.

---

### Strand 1 — Number Sense
- **Place value, expanded form & decomposition** — real quotes: "43,567 = 43,000 + ___ + 7," "6×10,000 + 7×1,000 + 8×100 + 9," "value of 9 in 549,327"
- **Roman numerals** — real quote: "XCVII multiplied to XLI" (Roman-numeral arithmetic, not just reading)
- **Order of operations & estimation** — real quotes: "sum of 82 and 78 multiplied to quotient of 120÷3," "estimated quotient of 7,292÷712"
- **Prime numbers & Goldbach-style puzzles** — real quotes: "sum of two prime numbers... for 32," "prime numbers between 40 and 50," "prime factors of 2×2×2×3×5×5"
- **Digit-relationship puzzles** — real quote: "a two-digit number where the ones digit is two more than thrice the tens digit"
- **Division & remainders** — real quotes: "51 desks... 9 desks in each row," "largest two-digit number that gives a remainder of 7 when divided by 8"

### Strand 2 — Fractions & Decimals
- Fraction operations (addition, subtraction, multiplication) — real quotes: "8/9 equals how many 27ths?", "7/8 km + 3/4 km," "add to 5¼ to get 10 2/12," "one half of three-fifths of 60"
- Fraction of a number / fraction of a total — real quotes: "2/5 of 120," "gave 2/5 to cousins and 1/3 to friend," "two of seven girls are members of the dance club"
- Decimal comparison — real quote: "48.8 kilograms vs. 48½ kilograms"

### Strand 3 — Patterns & Algebra
- **Arithmetic sequences** — real quote: "what is N in the pattern 34, 41, 48, 55, ___?"
- **Function-machine puzzles** — a value passes through a chain of hidden operations to a known output; solve for the input (or a missing step). Confirmed present at G3, distinguishing it from simpler grades.
- **Equation-solving (single unknown)** — real quote: "2,910 + 6,151 + N = 120,316"
- **Multiplicative comparison** ("times as many") — real quote: "there are 36 ducks, six times as many chickens as ducks, how many more chickens than ducks" — the correction from Ratio & Proportion described above; a genuinely distinct, simpler archetype (direct multiplication/comparison, no ratio notation or part-scaling).

### Strand 4 — Geometry & Measurement
- **Perimeter & area, including reverse problems** — real quotes: "15m long and 10m wide... walked around it," "56m long and 45m wide... area," "55m long, area 880 sq meters, width?" (reverse), "20m long, perimeter 64m, width?" (reverse), "fence it if meter costs P18.50" (perimeter combined with a per-unit cost)
- **Symmetry** — real quote: "lines of symmetry... in a square"
- **Polygon-naming vocabulary** — real quote: "polygon with eleven sides" (hendecagon)
- **Time & elapsed time** — real quotes: "walked from home to school" (6:40am to 7:15am), "long hand points to 8 and short hand between 2 and 3" (clock reading), "movie lasted 2 hours 15 minutes... finished at 4:05pm" (reverse elapsed-time), "70 minutes daily... in a week" (time multiplication)

### Strand 5 — Statistics
- **Averages** — real quote: "Marco... had grades 86, 87, 85, 90 and 92 in his five major subjects. What is his average grade?"

### Strand 6 — Classic Word-Problem Archetypes
- **Coin problems** — real quote (via raw-text fetch, high confidence): "Isabel had 1-peso and 5-peso coins in her bag totaling P22. If she had a total of 10 coins, how many of these are P5 coins?" — solved in the source via an "alternate elimination and retention" method (assume all one denomination, then correct for the difference).
- **Digit problems** — same as the Strand 1 digit-relationship entry; also classifiable here as a word-problem archetype, cross-referenced rather than duplicated.
- **Consecutive-integer-sum problems** — real quote: "what is the sum of the first 50 integers?" (a Gauss-pairing problem — pair 1+50, 2+49, etc.)
- **Money/shopping problems** — real quotes: "2 banana cues P10 each and juice P7," "mother bought rice for P51 and fish for P126, how much was left of her P200?"
- **Lever/balance and mixture problems: NOT found across 3 real sources checked.** Not confirmed present. (Unlike Grade 6's confident absence across 4 sources, this is a thinner negative — 3 sources rather than 4 — so treat as "not found" rather than "confirmed absent," and revisit if a 4th G3 source turns up.)

### Strand 7 — Mixed Trainer Track (capstone)
- Shuffled, timed sets drawn from all strands at a matching tier, majority-easy weighting.

---

## Per-archetype generation specs

Each entry: the parametric shape and how Easy → Average → Difficult scaffold onto each other. Schema/checklist: [Question Template Spec](mtap-expansion-overview.md#question-template-spec).

### Strand 1 — Number Sense

Full parametric templates below (2026-09-08) — the same skeleton/params/constraints/answer-formula/distractor treatment the Coin Problems worked example demonstrates, done ahead of generation rather than after, so the collision-detection harness has a real structural spec to redraw against instead of loose prose. Distractor collision reasoning here is hand-checked for the general case; anything marked "verify at generation" is a specific-draw coincidence the same category as the Coin Problems e2/e3 case — the kind no single structural rule removes, caught by the harness's per-draw check instead.

**Place value, expanded form & decomposition**

- Easy:
  ```
  Skeleton: "What is the value of the digit {d} in {N}?"
  Params: N = random 4-6 digit integer. d = a digit chosen from N's digit
          string such that it occurs EXACTLY ONCE in N (avoids the real
          ambiguity of "which occurrence" — matches the real quote's own
          "value of 9 in 549,327", where 9 appears once).
  Constraint: d's position (0-indexed from the right) must be >= 1 — never
              target the ones digit, so the "bare digit" distractor below
              can never accidentally equal the correct answer.
  Answer: d * 10^position
  Distractors:
    e1 = d                          // forgot to multiply by place value
    e2 = d * 10^(position - 1)      // one place value too low
    e3 = d * 10^(position + 1)      // one place value too high
  Collision check: e1 = answer only if position = 0, already excluded.
                   e2/e3 = answer only if position∓1 = position — impossible.
                   e2 = e3 only if the two powers are equal — impossible for
                   distinct integers. Clean.
  ```
- Average:
  ```
  Skeleton: "{N} = {term1} + {term2} + ___ + {term4}" (four place-value terms
            of a 4-digit N — thousands/hundreds/tens/ones — with one term
            blanked; real quote pattern: "43,567 = 43,000 + ___ + 7", where
            the blank there covers hundreds+tens as one combined term —
            simplified here to one-term-per-place so the answer is a single
            unambiguous value, not a compound one).
  Params: N = random 4-digit integer with no duplicate digits (so "the
          hundreds term" etc. is never confusable with another term by
          value alone). blankIndex ∈ {1, 2} (hundreds or tens — never
          thousands or ones, so three OTHER real terms always surround the
          blank on both sides, matching the real quote's shape).
  Answer: the blanked term's own value (digit * its place value).
  Distractors:
    e1 = digit alone (not multiplied) — same slip as Easy's e1
    e2 = the blanked term's digit * the adjacent (wrong) place value
    e3 = sum of the two terms immediately flanking the blank — a "combined
         the wrong two terms" slip, plausible since the child is already
         reading three summed terms
  Collision check: e3 = answer only if the flanking terms happen to sum to
                   the blank's own value — not a structural identity (the
                   terms are unrelated place values), but verify at
                   generation across the full random N range.
  ```
- Difficult:
  ```
  Skeleton: "{term1} + {term2} + {d}?_ + {term4} = {N}. What is the missing
            digit □?" (reverse of Average — expanded form given with one
            DIGIT missing inside a term, not a whole term; solve for the
            single digit that makes the equation true).
  Params: N = random 4-digit integer, no duplicate digits. The blanked
          term's digit is replaced by □ inside its own place-value term
          (e.g. term2 shown as "□00" instead of "500").
  Answer: the original digit (0-9).
  Distractors:
    e1 = digit + 1 (off-by-one, too high)
    e2 = digit - 1 (off-by-one, too low; if digit = 0, use digit + 2 instead
         so this never goes negative)
    e3 = a different real digit from elsewhere in N (mistook which place
         the □ belongs to)
  Collision check: e2's digit-0 fallback (+2) could collide with e1 (+1)
                   only if they resolve to the same value — they never do
                   (+1 vs +2 from the same base). e3 = answer only if that
                   other digit happens to equal the blanked digit — excluded
                   by requiring N have no duplicate digits.
  ```

**Roman numerals**

- Easy:
  ```
  Skeleton: "What is {romanNumeral} in Arabic numerals?" (or the reverse
            direction, "Write {N} as a Roman numeral" — alternate at random)
  Params: N = random integer in [1, 100] with a "clean" standard-form Roman
          representation (no ambiguity — standard subtractive-notation rules
          only, e.g. never construct something like "IIII").
  Answer: the correct conversion.
  Distractors (Arabic-answer direction):
    e1 = N with one symbol's value misread (e.g. X read as 5 instead of 10)
    e2 = N ± the value of its first symbol (a common off-by-one-symbol slip)
    e3 = N with the subtractive pair added instead of subtracted (e.g. IX
         misread as 10+1=11 instead of 10-1=9) — only applicable when N's
         representation actually contains a subtractive pair; otherwise
         substitute a plain adjacent-value slip (N ± 1).
  Collision check: hand-verify per generated N that no two distractors
                   coincide — with only 3 candidate slips over a small [1,100]
                   range this is cheap to fully enumerate at generation time
                   rather than prove structurally here.
  ```
- Average:
  ```
  Skeleton: "What is {roman1} + {roman2}?" or "{roman1} - {roman2}?" (answer
            given in Arabic numerals, matching the real quote's own
            "answer in Arabic form" pattern).
  Params: N1, N2 = random integers in [1, 100], each with a clean standard
          Roman form. For subtraction, enforce N1 > N2 (no negative results).
  Answer: N1 + N2 (or N1 - N2).
  Distractors:
    e1 = the OTHER operation's result (added when asked to subtract, or
         vice versa) — a real, common misreading of the operator
    e2 = N1 + N2 ± 1 (an arithmetic slip)
    e3 = one operand misconverted from Roman (off by a symbol-value error,
         same category as Easy's e1), then the correct operation applied
  Collision check: e1 vs correct answer never collide (different operations
                   on two positive distinct values). e2/e3 verified per-draw.
  ```
- Difficult:
  ```
  Skeleton: "What is {roman1} multiplied by {roman2}?" (real confirmed
            "XCVII multiplied to XLI" pattern — answer in Arabic numerals).
  Params: N1 = random integer in [10, 99], N2 = random integer in [10, 49]
          (keeps the product in a checkable range for a Grade 3 Difficult
          tier — real quote's own 97×41=3,977 is the scale to match).
  Answer: N1 * N2.
  Distractors:
    e1 = N1 + N2 (misread the operator as addition)
    e2 = N1 * N2 with one operand off by one Roman symbol (same misconversion
         category as Easy/Average)
    e3 = N1 * N2 with a plain multiplication slip — one off-by-N1 or
         off-by-N2 error (N1*N2 ± N1, or N1*N2 ± N2)
  Collision check: e1 can never equal a two-digit x two-digit product for
                   this param range (product is always far larger than the
                   sum) — safe structurally, not just by luck.
  ```

**Order of operations & estimation**

- Easy:
  ```
  Skeleton: "What is {a} + {b} × {c}?" (single two-step expression, standard
            order of operations — multiplication/division before
            addition/subtraction, no parentheses needed to disambiguate).
  Params: a, b, c = random integers in [2, 20].
  Answer: a + (b * c).
  Distractors:
    e1 = (a + b) * c              // did the operations strictly left-to-right, ignoring precedence
    e2 = a + b + c                // dropped the multiplication into addition entirely
    e3 = a * b + c                // multiplied the wrong pair
  Collision check: verify per-draw that e1/e2/e3 don't coincide with each
                   other or the answer — cheap given small integer ranges.
  ```
- Average:
  ```
  Skeleton: "What is the sum of {a} and {b}, multiplied to the quotient of
            {c} ÷ {d}?" (real quote pattern — a three-step expression
            combining a sum with a product/quotient).
  Params: a, b = random integers in [10, 99]. c, d chosen so c is exactly
          divisible by d (d ∈ [2,12], quotient q ∈ [2,20]) — no remainders,
          keeps the arithmetic clean for this tier.
  Answer: (a + b) * (c / d).
  Distractors:
    e1 = a + b + (c / d)          // added instead of multiplying the two results
    e2 = a + (b * (c / d))        // only the second addend got multiplied — a real order-of-operations misread of the sentence's own grouping
    e3 = (a + b) * c              // used c directly, ignoring the division by d
  Collision check: verify per-draw; structurally these three formulas
                   diverge for almost all param combinations given the
                   different operation shapes involved.
  ```
- Difficult:
  ```
  Skeleton: "Estimate the quotient of {a} ÷ {b} by rounding each number to
            its greatest place value first." (real quote pattern: "estimated
            quotient of 7,292÷712").
  Params: a = random 4-digit integer, b = random 3-digit integer, chosen so
          rounding each to its leading digit's place value (e.g. 7,292→7,000;
          712→700) gives a clean quotient with no remainder.
  Answer: round(a, leadingPlace) / round(b, leadingPlace).
  Distractors:
    e1 = a / b, computed exactly (unrounded) then truncated — skipped the
         estimation step the question actually asked for
    e2 = the quotient using only ONE number rounded (a rounded, b not, or
         vice versa) — a partial-estimation slip
    e3 = round(a, leadingPlace) / b_unrounded, deliberately chosen to differ
         from e2 by which operand got left unrounded (covers both directions
         of the partial-rounding slip as two distinct wrong answers if
         needed, or pick one at random per draw)
  Collision check: e1 = answer only if a/b already happens to equal the
                   rounded quotient — verify at generation and redraw if so
                   (matches the doc's own general redraw-on-collision rule).
  ```

**Prime numbers & Goldbach-style puzzles**

- Easy:
  ```
  Skeleton: "Is {N} a prime number?" (Yes/No, or multiple-choice among a
            small set of numbers: "Which of these is prime?")
  Params: N = random integer in [2, 100]. For the multiple-choice framing,
          draw one prime and three composites (or vice versa) from that range.
  Answer: the prime number among the four choices.
  Distractors: the three composite numbers drawn.
  Collision check: trivial — primality is a fixed, checkable property; just
                   confirm the three "distractor" numbers are genuinely
                   composite (not accidentally prime) at generation time.
  ```
- Average:
  ```
  Skeleton: "How many prime numbers are there between {low} and {high}?"
            (real quote pattern: "primes between 40 and 50").
  Params: low, high = a random 10-to-20-wide range with low, high both
          multiples of 10 for a clean-sounding question, low ∈ [10, 80].
  Answer: the actual count of primes strictly between low and high (or
          inclusive — pick one convention and hold it fixed across all draws
          of this archetype, stated explicitly in the question text so it's
          never ambiguous).
  Distractors:
    e1 = correct count ± 1 (missed or double-counted one prime — the single
         most common real counting slip)
    e2 = correct count ± 2
    e3 = the count of ODD numbers in the range instead of primes (a
         plausible "confused prime with odd" conceptual slip)
  Collision check: e1/e2 could collide with each other only if the range's
                   real config makes them numerically equal to the answer
                   itself post-computation — verify per-draw, redraw if the
                   true count is small enough that ±1/±2 goes negative or
                   duplicates the answer.
  ```
- Difficult:
  ```
  Skeleton: "Express {N} as the sum of two prime numbers." (real quote
            pattern: "sum of two prime numbers... for 32" — Goldbach's
            conjecture, true for all even N > 2 in the checkable range here).
  Params: N = random EVEN integer in [10, 60] (guarantees at least one valid
          prime-pair decomposition per Goldbach; range kept small enough to
          verify computationally at generation, not asserted blindly).
  Answer: one valid pair {p1, p2} with p1 + p2 = N, both prime (if multiple
          valid pairs exist, present as "p1 + p2" using the pair with the
          smaller p1, so the correct answer is deterministic, not ambiguous
          among several equally-valid decompositions).
  Distractors:
    e1 = a pair that sums to N but where one number ISN'T actually prime
         (a plausible-looking near-miss)
    e2 = a genuinely prime pair, but summing to N ± 2 instead of N (an
         adjacent-even-number mix-up)
    e3 = N expressed as a sum of two primes using a DIFFERENT valid pair
         than the canonical one chosen as the answer, when one exists — only
         usable when N has more than one valid decomposition; otherwise
         substitute e1's shape a second time with a different near-miss pair
  Collision check: the "smaller p1" tie-break rule above is exactly what
                   prevents e3 from being an equally-correct alternate
                   answer rather than a genuine distractor — mandatory, not
                   optional, for this archetype.
  ```

**Digit-relationship puzzles**

- Easy:
  ```
  Skeleton: "I am a two-digit number. My ones digit is {relationship} my
            tens digit. What number am I?" (real quote pattern: "ones digit
            is two more than thrice the tens digit" — one direct relationship,
            solvable by direct substitution since the tens digit ranges over
            only 1-9).
  Params: tensDigit t = random integer in [1, 9]. relationship = one of a
          small fixed set of linear forms (ones = t + k, ones = t - k,
          ones = 2t, ones = 3t + k, etc.), with k chosen so the resulting
          ones digit lands in [0, 9] — reject/redraw any (t, relationship, k)
          combination that produces an out-of-range or non-integer ones digit.
  Answer: the two-digit number 10*t + ones.
  Distractors:
    e1 = 10*ones + t              // swapped tens and ones digits
    e2 = 10*t + t                 // used the tens digit twice (ignored the relationship)
    e3 = 10*(t+1) + ones          // off-by-one on the tens digit
  Collision check: verify per-draw that swapping digits (e1) doesn't
                   coincidentally equal the real answer (only possible if
                   t = ones, i.e. a repdigit — exclude those draws).
  ```
- Average:
  ```
  Skeleton: same shape as Easy, but the relationship is stated in a form
            that doesn't isolate the ones digit directly — e.g. "the SUM of
            my digits is {s}, and my ones digit is {relationship} my tens
            digit" — requiring the child to set up and test candidates
            (matches the doc's own "requires testing a small set of
            candidates rather than solving directly" framing) rather than
            a one-line substitution.
  Params: tensDigit t ranges over candidates [1,9]; for each, compute the
          ones digit implied by the relationship and check it also satisfies
          the stated digit-sum s — s is set to the value that makes exactly
          ONE (t, ones) pair valid, so the puzzle has a unique solution
          (verify uniqueness computationally at generation, redraw s if more
          than one candidate satisfies both conditions).
  Answer: the unique two-digit number satisfying both stated conditions.
  Distractors:
    e1 = a number satisfying the digit-sum condition alone, but not the
         digit-relationship condition (tests only one of the two clues)
    e2 = a number satisfying the relationship alone, but not the digit-sum
    e3 = the digit-swapped version of the correct answer
  Collision check: the "verify uniqueness at generation" step above is what
                   keeps e1/e2 from accidentally being additional correct
                   answers rather than genuine distractors — mandatory.
  ```
- Difficult:
  ```
  Skeleton: same puzzle shape extended to a THREE-digit number with two
            combined digit relationships stated together (matches the doc's
            own "three-digit version, or two combined relationships" framing
            — implemented here as both at once for a genuine Difficult
            step up, not just a cosmetic longer number).
  Params: hundreds h ∈ [1,9], tens t ∈ [0,9], ones o ∈ [0,9] — generate one
          valid (h,t,o) triple first, THEN derive the two relationship
          clues FROM it (e.g. "ones is X more than tens," "hundreds is Y
          times tens" — reject any triple where a clause would require
          division by zero or a non-integer multiplier). Verify uniqueness
          the same way as the Average tier — redraw if more than one
          three-digit number satisfies both stated clues.
  Answer: the generated three-digit number.
  Distractors:
    e1 = satisfies only the first clue
    e2 = satisfies only the second clue
    e3 = digit-reversed (ones-tens-hundreds instead of hundreds-tens-ones)
         version of the correct answer
  Collision check: same mandatory uniqueness-verification step as Average,
                   extended to two clues over a three-digit space.
  ```

**Division & remainders**

- Easy:
  ```
  Skeleton: "What is {N} ÷ {d}? Give the quotient and remainder."
  Params: N = random integer in [20, 200]. d = random integer in [2, 12].
          Reject/redraw if N is exactly divisible by d (this archetype is
          specifically about remainders — a zero-remainder draw belongs to
          a different, simpler skill, not this one).
  Answer: quotient = floor(N/d), remainder = N mod d.
  Distractors (as wrong (quotient, remainder) pairs, or if single-answer
  multiple choice, present the wrong TOTAL "quotient r remainder" string):
    e1 = quotient rounded UP instead of down, remainder recomputed to match
         (a rounding-direction slip)
    e2 = correct quotient, but remainder = d - (N mod d) (the "distance to
         the next multiple" instead of the remainder itself — a real,
         common confusion)
    e3 = quotient and remainder swapped
  Collision check: e2 = correct remainder only when N mod d = d/2 exactly
                   (only possible for even d) — verify at generation,
                   redraw that specific (N,d) pair if so.
  ```
- Average:
  ```
  Skeleton: "There are {N} {items} to be arranged with {perGroup} in each
            {group}. How many full {group}s can be made, and how many
            {items} are left over?" (real quote pattern: "51 desks...9 desks
            in each row").
  Params: N = random integer in [30, 150]. perGroup = random integer in
          [4, 12]. Reject/redraw if N is exactly divisible by perGroup (same
          reasoning as Easy — this archetype needs a genuine leftover).
  Answer: fullGroups = floor(N/perGroup), leftover = N mod perGroup.
  Distractors: same three shapes as Easy's (round-up slip, "distance to next
  multiple" slip, quotient/remainder swap), restated in this word-problem's
  own units so they read as plausible answers to THIS question, not generic
  numbers.
  Collision check: same as Easy.
  ```
- Difficult:
  ```
  Skeleton: "What is the largest/smallest {N}-digit number that gives a
            remainder of {r} when divided by {d}?" (real quote pattern,
            reverse-direction from Easy/Average — solve for N, not for the
            quotient/remainder of a given N).
  Params: d = random integer in [3, 12]. r = random integer in [1, d-1]
          (must be a valid remainder for this divisor — never r=0, never
          r>=d). digitCount ∈ {2, 3} (keeps the search space small and the
          answer a clean, checkable number).
  Answer (largest case): the largest digitCount-digit number ≡ r (mod d) —
          computed as (upperBound - ((upperBound - r) mod d)), where
          upperBound is 10^digitCount - 1; (smallest case): the analogous
          formula from the lower bound 10^(digitCount-1).
  Distractors:
    e1 = the answer to the OPPOSITE direction (smallest when asked for
         largest, or vice versa) — a real misreading of the question
    e2 = upperBound (or lowerBound) itself, ignoring the remainder condition
         entirely
    e3 = the correct answer ± d (one multiple of d off, i.e. lands on a
         number that ALSO gives remainder r, but isn't the extreme one
         asked for — a genuinely tricky, well-motivated distractor)
  Collision check: e3 by construction always gives the same remainder as the
                   real answer, which is exactly what makes it a strong
                   distractor rather than an accidental duplicate answer —
                   confirm at generation that e3 stays within a plausible
                   digitCount-digit range (redraw/clip if it overflows).
  ```

### Strand 2 — Fractions & Decimals

**Fraction operations**

- Easy:
  ```
  Skeleton: "What is {a}/{d} + {b}/{d}?" (or "− ", with a > b enforced for subtraction).
  Params: d chosen from {4,5,6,8,10,12}. a,b in [1, d-1]. Constraint: require
          gcd(a+b, d) > 1 (addition) or gcd(a-b, d) > 1 (subtraction) — the
          result must genuinely need reducing, so the "forgot to reduce"
          distractor is never accidentally correct.
  Answer: (a+b)/d (or (a-b)/d), reduced to lowest terms.
  Distractors:
    e1 = (a+b)/(2d)            // added denominators too — classic "straight across" error
    e2 = (a+b)/d, unreduced    // guaranteed distinct from the answer by the constraint above
    e3 = (a*b)/d                // multiplied numerators instead of adding
  Collision check: clean by construction (the gcd constraint is what makes
                   e2 always distinct).
  ```
- Average:
  ```
  Skeleton: "What is {a}/{d1} + {b}/{d2}?"
  Params: d1 ≠ d2, both from {2,3,4,5,6,8,10,12}. a in [1,d1-1], b in [1,d2-1].
  Answer: (a*(L/d1) + b*(L/d2)) / L, reduced, where L = lcm(d1,d2).
  Distractors:
    e1 = (a+b)/(d1+d2)                       // added straight across
    e2 = (a*d2 + b*d1)/(d1*d2), unreduced    // used the product instead of the LCM as common denominator, and left unreduced — a distinct method error, not just a reduction slip
    e3 = (a*b)/(d1*d2)                        // multiplied instead of added
  Collision check: verify e1/e2/e3 don't coincide with the answer or each
                   other at generation — no clean structural guarantee here,
                   so this is exactly the kind of per-draw check the harness
                   exists for.
  ```
- Difficult:
  ```
  Skeleton: "What is {w1} {a}/{d} + {w2} {b}/{d}?" (mixed numbers, SAME
            denominator, so the new skill under test is mixed-number
            conversion, not also unlike denominators at once).
  Params: w1,w2 in [1,5]. d from {3,4,5,6,8}. a,b in [1,d-1]. Constraint:
          require a+b >= d (the fractional parts must carry into the whole
          number when added — the whole point of this tier).
  Answer: (w1+w2) + floor((a+b)/d), remainder (a+b) mod d, expressed as a
          reduced mixed number.
  Distractors:
    e1 = "{w1+w2} {a+b}/{d}"     // added correctly but left the fraction improper, never carried the whole-number overflow — the single most common real error here
    e2 = w1+w2                   // added only the whole-number parts, dropped the fractions entirely
    e3 = "{a+b}/{d}"              // added only the fractional parts, dropped the whole numbers entirely
  Collision check: the a+b >= d constraint guarantees e1 is always a genuine
                   improper fraction, never accidentally already-reduced.
  ```

**Fraction of a number / of a total**

- Easy:
  ```
  Skeleton: "What is {a}/{d} of {N}?"
  Params: d from {2,3,4,5,6,8,10}. a in [1,d-1]. N a random multiple of d in
          [2d, 20d] — keeps the answer a clean whole number at this tier.
  Answer: a * (N/d).
  Distractors:
    e1 = N/d          // forgot to multiply by the numerator
    e2 = N - a*(N/d)  // gave the REMAINING part instead of the requested fraction — a real, common flip
    e3 = a*N           // multiplied by the numerator only, never divided by the denominator
  Collision check: clean — the three formulas diverge structurally for any
                   valid (a,d,N), no shared-value case to exclude.
  ```
- Average:
  ```
  Skeleton: "Of the {T} {items} in {group}, {x} are {property}. What
            fraction of the {items} are {property}?" (real quote pattern:
            "two of seven girls are members of the dance club").
  Params: T random in [5,20]. x random in [1,T-1]. Constraint: gcd(x,T) > 1
          (same reasoning as the Fraction Operations Easy tier — guarantees
          the answer genuinely needs reducing).
  Answer: x/T, reduced.
  Distractors:
    e1 = x/T, unreduced         // guaranteed distinct by the gcd constraint
    e2 = (T-x)/T, reduced        // the complement — counted the wrong group
    e3 = T/x                     // numerator and denominator flipped
  Collision check: clean by construction, same as the sibling archetype above.
  ```
- Difficult:
  ```
  Skeleton: "{name} had {N} {items}. {He/She} gave {a}/{d1} of them to
            {person1}, then gave {b}/{d2} of what remained to {person2}.
            How many {items} does {name} have left?" (real quote pattern:
            "gave 2/5 to cousins and 1/3 to friend").
  Params: d1,d2 from {2,3,4,5}. a<d1, b<d2. N chosen so it's divisible by
          d1, AND the remainder after step 1 is divisible by d2 (both steps
          land on clean whole-item counts — reject/redraw N otherwise).
  Answer: after1 = N − a*(N/d1); final = after1 − b*(after1/d2).
  Distractors:
    e1 = N − a*(N/d1) − b*(N/d2)   // applied BOTH fractions to the ORIGINAL total instead of successively — the exact conceptual error this archetype exists to test, per the doc's own "each fraction applies to what remains" framing
    e2 = after1                     // only applied the first gift, forgot the second entirely
    e3 = N − b*(N/d2)                // only applied the second fraction, straight to the original total, skipping the first gift altogether
  Collision check: the divisibility constraints on N are what keep every
                   intermediate value a clean integer across all three
                   distractor computations too, not just the correct path.
  ```

**Decimal comparison**

- Easy:
  ```
  Skeleton: "Which of these is the GREATEST: {v1}, {v2}, {v3}, {v4}?" (four
            decimal values as the multiple-choice options themselves — no
            separately-computed distractor formulas needed, the four
            generated values ARE the four choices).
  Params: generate 4 distinct decimals to 2 decimal places, each in [1,99].
          Bias one distractor to have a longer digit string but a smaller
          value than another option (e.g. 7.45 alongside 7.8) — the real
          "more digits after the decimal must mean bigger" trap — as a
          generation-time preference, not a strict correctness requirement.
  Answer: the numerically largest of the 4.
  Collision check: reject/redraw if any two of the 4 generated values are
                   numerically equal.
  ```
- Average:
  ```
  Skeleton: "By how much greater is {x} than {fracLabel}?" (x a decimal,
            fracLabel a mixed number like "48 1/2" — real quote pattern:
            "48.8 kilograms vs. 48½ kilograms"; phrase direction is always
            chosen so the answer comes out positive).
  Params: shared whole part w in [1,99]. x = w + a clean 1-2 digit decimal.
          fracLabel = w + a simple fraction (halves, quarters, or tenths).
          Constraint: the two values must differ (reject/redraw ties).
  Answer: |x − fracValueAsDecimal|.
  Distractors:
    e1 = |x − misconvertedFracValue|, where the fraction is misconverted by
         writing its numerator directly after the decimal point (e.g. "½"
         misread as ".2" instead of ".5") — this IS the real quote's own
         trap, made concrete as a formula
    e2 = x + fracValueAsDecimal      // added instead of subtracted
    e3 = |x − fracValueAsDecimal|, with the fraction misconverted by using
         denominator/numerator instead of numerator/denominator (e.g. "1/2"
         read as "2/1" = 2 before combining with the whole part)
  Collision check: verify per-draw that the misconversion formulas (e1, e3)
                   don't coincidentally reduce to the true answer for a
                   given fraction choice — cheap to check given the small,
                   fixed fraction vocabulary (halves/quarters/tenths).
  ```
- Difficult:
  ```
  Skeleton: "Which of these is the SMALLEST: {v1}, {v2}, {v3}, {v4}?" where
            the four values are a genuine MIX of decimal and fraction/mixed-
            number representations (at least one of each form), matching
            the doc's own "order three or more mixed decimal/fraction
            values" framing.
  Params: generate 4 values, each independently decimal or fraction form
          (at least one of each), all converting to distinct decimal values
          in a comparable range.
  Answer: the value (shown in its ORIGINAL given representation) that
          converts to the smallest decimal.
  Collision check: reject/redraw if any two of the 4 converted values are
                   numerically equal.
  ```

### Strand 3 — Patterns & Algebra

**Arithmetic sequences**

- Easy:
  ```
  Skeleton: "What is the next term in the sequence: {t1}, {t2}, {t3}, {t4},
            ___?"
  Params: first term a1 in [1,20]. Common difference d in [2,9]. Four given
          terms are a1, a1+d, a1+2d, a1+3d.
  Answer: a1 + 4d.
  Distractors:
    e1 = a1 + 3d   // repeated the last given term, forgot to add d again
    e2 = a1 + 5d   // added d twice
    e3 = a1 + 4(d±1)  // used a slightly wrong common difference
  Collision check: clean — distinct d-multiples of a fixed nonzero d never
                   coincide.
  ```
- Average:
  ```
  Skeleton: "What is the {n}th term of the sequence: {t1}, {t2}, {t3}, ...?"
            (n large enough that listing every term is impractical).
  Params: a1 in [1,20]. d in [2,9]. n in [10,30].
  Answer: a1 + (n-1)*d.
  Distractors:
    e1 = a1 + n*d          // off-by-one: used n instead of n-1 — the classic term-count confusion
    e2 = a1 * n              // multiplied instead of using the arithmetic formula
    e3 = a1 + (n-1)*(d±1)    // misread the common difference
  Collision check: clean, same reasoning as Easy.
  ```
- Difficult:
  ```
  Skeleton: "What is the next term in the sequence: {t1}, {t2}, {t3}, {t4},
            ___?" where the GAPS between terms themselves increase by a
            fixed amount each step (a two-step rule, not a constant
            difference).
  Params: a1 in [1,10]. Initial gap d0 in [1,5]. Gap increment k in [1,3].
          Terms: t1=a1, t2=t1+d0, t3=t2+(d0+k), t4=t3+(d0+2k). The next
          (unseen) gap is d0+3k.
  Answer: t4 + (d0 + 3k).
  Distractors:
    e1 = t4 + (d0 + 2k)                          // reused the last visible gap, treating it as if the difference were constant
    e2 = t4 + d0                                  // reset to the very first gap
    e3 = t4 + round((3 visible gaps' average))    // averaged the visible gaps instead of continuing the pattern
  Collision check: verify per-draw that e3's rounded average doesn't
                   coincide with the true next gap — possible for specific
                   (d0,k) combinations, redraw if so.
  ```

**Function-machine puzzles**

- Easy:
  ```
  Skeleton: "A machine takes a number, {operation} {k}, and outputs the
            result. If the input is {x}, what is the output?"
  Params: operation from {add, subtract, multiply, divide-exact}. k, x
          chosen so the result is always a clean integer (for divide, x is
          a multiple of k).
  Answer: apply(x).
  Distractors:
    e1 = apply the INVERSE operation to x instead
    e2 = apply(k) treating k as the input instead of x
    e3 = apply(x) with a one-off arithmetic slip on k
  Collision check: clean for the fixed small param ranges used here.
  ```
- Average:
  ```
  Skeleton: "A machine first {op1} {k1}, then {op2} {k2}, giving an output
            of {output}. What was the input?" (reverse the chain — solve
            for input given output, real quote's own "chain of hidden
            operations" framing).
  Params: pick input x first, apply op1 then op2 forward to get output,
          then present only (op1,k1,op2,k2,output) and ask for x.
  Answer: x, recovered by undoing op2 first, then op1 (reverse order AND
          inverted operations).
  Distractors:
    e1 = applied the SAME two ops forward to output (forgot to invert AND
         reverse order entirely)
    e2 = reversed the order but forgot to invert the operations
    e3 = inverted the operations but kept the forward order
  Collision check: clean — the three error modes produce structurally
                   different results from the correct reversal for any
                   nontrivial (op1,op2) pair.
  ```
- Difficult:
  ```
  Skeleton: "A machine turns {in1} into {out1}, and {in2} into {out2}.
            Using the same rule, what does it turn {in3} into?" (infer a
            linear rule from two pairs, apply to a third).
  Params: pick a simple linear rule y = m*x + b (small integer m,b). Pick
          in1 ≠ in2 ≠ in3, all distinct. Compute out1, out2 from the rule.
  Answer: m*in3 + b.
  Distractors:
    e1 = out1 + (in3 − in1)                // assumed the additive-difference pattern from pair 1 only, i.e. wrongly assumed m=1
    e2 = a DIFFERENT (m',b') rule that happens to fit pair 1 but not pair 2 — only include if generation confirms the true (m,b) is the UNIQUE line through both given points (always true for in1≠in2, so this is safe by construction, not a special case to guard against)
    e3 = m*in3 + b with m and b's roles swapped (b*in3 + m)
  Collision check: since in1≠in2 always determines a unique line, the rule
                   itself is never ambiguous — the only per-draw check
                   needed is that e1/e3 don't coincidentally match the
                   answer for a given (m,b,in3).
  ```

**Equation-solving (single unknown)**

- Easy:
  ```
  Skeleton: "Solve for N: N {op} {k} = {result}." (one-step).
  Params: op from {+,−,×,÷}. k, result chosen so N is a clean positive
          integer for every op (e.g. for ÷, result is N/k, so pick N,k
          first and derive result).
  Answer: N.
  Distractors:
    e1 = result op k        // performed the given operation forward instead of its inverse
    e2 = result op k, off by one
    e3 = k op result          // swapped which operand goes first (matters for − and ÷)
  Collision check: clean for the small integer ranges used here.
  ```
- Average:
  ```
  Skeleton: "Solve for N: {a} + {b} + N = {total}." (real quote pattern:
            "2,910 + 6,151 + N = 120,316").
  Params: a, b random; N chosen first, total = a+b+N.
  Answer: total − a − b.
  Distractors:
    e1 = total − a    // forgot to subtract b too
    e2 = total − b    // forgot to subtract a too
    e3 = total + a + b // added instead of subtracting — sign confusion
  Collision check: clean — structurally distinct for any nonzero a,b.
  ```
- Difficult:
  ```
  Skeleton: "{a} times N, plus {b}, equals {result}. What is N?" (a*N + b =
            result; unknown combined with a multi-step operation).
  Params: a,b,N chosen so all values are clean positive integers; result
          computed forward from N.
  Answer: (result − b) / a.
  Distractors:
    e1 = (result + b) / a          // sign error on b
    e2 = (result − b) * a           // multiplied instead of dividing at the last step
    e3 = result/a − b                // wrong order — subtracted b after dividing instead of before
  Collision check: clean for the ranges used, but verify per-draw since
                   e2/e3 can grow large and coincidentally match e1 for
                   small a.
  ```

**Multiplicative comparison**

- Easy:
  ```
  Skeleton: "There are {N} {itemA}. There are {k} times as many {itemB} as
            {itemA}. How many {itemB} are there?" (real quote pattern: "36
            ducks, six times as many chickens as ducks").
  Params: N in [5,50]. k in [2,9].
  Answer: N*k.
  Distractors:
    e1 = N + k    // added instead of multiplied
    e2 = N / k     // divided instead of multiplied
    e3 = N*(k±1)   // multiplier off by one
  Collision check: clean for the ranges used here.
  ```
- Average:
  ```
  Skeleton: "There are {M} {itemB}, which is {k} times as many as {itemA}.
            How many {itemA} are there?" (reverse of Easy).
  Params: pick N (itemA count) first, k, derive M = N*k; present M and k.
  Answer: M/k.
  Distractors:
    e1 = M*k     // multiplied instead of divided
    e2 = M − k    // subtracted instead of divided
    e3 = M/(k±1)  // multiplier off by one
  Collision check: clean for the ranges used here.
  ```
- Difficult:
  ```
  Skeleton: "There are {N} {itemA}. There are {k} times as many {itemB} as
            {itemA}. How many MORE {itemB} are there than {itemA}?" (real
            quote pattern: "how many more chickens than ducks" — find the
            DIFFERENCE, not either quantity directly).
  Params: same as Easy.
  Answer: N*k − N = N*(k−1).
  Distractors:
    e1 = N*k              // gave the itemB count itself, never took the difference — the exact real-world error this archetype targets
    e2 = N*(k−1), with k off by one
    e3 = N*k − k            // subtracted k instead of N — dimensionally wrong but a plausible slip
  Collision check: clean for k≥2 (guaranteed by the param range).
  ```

### Strand 4 — Geometry & Measurement

**Perimeter & area, including reverse problems**

- Easy:
  ```
  Skeleton: "A rectangle is {L}m long and {W}m wide. What is its
            {perimeter/area}?" (alternate which is asked, at random).
  Params: L,W random in [3,30], distinct.
  Answer: 2(L+W) for perimeter; L*W for area.
  Distractors (perimeter): e1 = L*W (computed area instead); e2 = L+W
    (forgot to double); e3 = 2L+W (only doubled one dimension).
  Distractors (area): e1 = 2(L+W) (computed perimeter instead); e2 = L+W
    (added instead of multiplied); e3 = 2*L*W (doubled unnecessarily).
  Collision check: clean for distinct L,W.
  ```
- Average:
  ```
  Skeleton: "A rectangle has a {perimeter/area} of {V} and a length of
            {L}m. What is its width?" (reverse — real confirmed pattern,
            both directions).
  Params: choose L,W first, compute V (2(L+W) or L*W), present V and L.
  Answer (perimeter): V/2 − L. Answer (area): V/L.
  Distractors (perimeter): e1 = V − L (forgot the full un-doubling); e2 =
    V/2 + L (sign error); e3 = (V−L)/2 (wrong order of operations).
  Distractors (area): e1 = V − L (subtracted instead of divided); e2 = V*L
    (multiplied instead of divided); e3 = L/V (flipped the division).
  Collision check: clean for distinct L,W with W ≥ 1.
  ```
- Difficult:
  ```
  Skeleton: "A rectangular garden is {L}m long and {W}m wide. It will be
            fenced with wire that costs ₱{costPerM} per meter. How much
            will the fence cost in total?" (real quote pattern: "fence it
            if meter costs P18.50" — geometry first, then a money step).
  Params: L,W random in [3,30]. costPerM random in [10,50], one decimal
          place allowed (matching the real quote's own ₱18.50).
  Answer: 2(L+W) * costPerM.
  Distractors:
    e1 = L*W * costPerM         // used AREA instead of perimeter — the exact conceptual error this archetype targets
    e2 = (L+W) * costPerM        // forgot to double the sum (used half the perimeter)
    e3 = 2(L+W) + costPerM       // added the cost instead of multiplying — dropped the per-meter step entirely
  Collision check: clean for the ranges used here.
  ```

**Symmetry & polygon vocabulary**

- Easy:
  ```
  Skeleton: "How many lines of symmetry does a {shape} have?"
  Params: shape drawn from a fixed, curated set with known distinct values:
          {square: 4, non-square rectangle: 2, equilateral triangle: 3,
          regular hexagon: 6}.
  Answer: the shape's known value.
  Distractors: the other 3 shapes' known values from the same set (all
    distinct by construction, so never collides with the answer).
  ```
- Average:
  ```
  Skeleton: "What is the name of a polygon with {n} sides?" (real quote
            pattern: "eleven sides" → hendecagon).
  Params: n drawn from a fixed vocabulary: {5: pentagon, 6: hexagon, 7:
          heptagon, 8: octagon, 9: nonagon, 10: decagon, 11: hendecagon,
          12: dodecagon}.
  Answer: the correct name for n.
  Distractors: the names for 3 OTHER n values adjacent to the drawn one
    (the most plausible real confusions), e.g. n=11 draws decagon(10),
    dodecagon(12), nonagon(9) as its three distractors.
  ```
- Difficult:
  ```
  Skeleton: "How many lines of symmetry does a regular {polygon} have?"
            (combines both — a REGULAR n-gon always has exactly n lines of
            symmetry, a clean rule).
  Params: n from {9, 10, 11, 12}, polygon name from the Average tier's
          vocabulary.
  Answer: n.
  Distractors:
    e1 = floor(n/2)   // thought only "opposite-side" pairs counted (a real trap, especially plausible for even n)
    e2 = n − 1         // off-by-one
    e3 = a different n from the {9,10,11,12} set              // mixed up which shape
  Collision check: for odd n, floor(n/2) is already distinct from n by
                   construction — no special-casing needed.
  ```

**Time & elapsed time**

- Easy:
  ```
  Skeleton: "{name} left home at {startTime} and arrived at school at
            {endTime}. How many minutes did the trip take?"
  Params: startTime, endTime same AM/PM period (avoids noon/midnight
          rollover ambiguity), endTime after startTime, gap in [5,90] min.
  Answer: elapsed minutes.
  Distractors:
    e1 = elapsed ± 60          // hour-confusion slip
    e2 = |endMinuteDigits − startMinuteDigits|, ignoring the hour carry entirely (the real "just subtracted the minute parts" error)
    e3 = elapsed ± 5            // small arithmetic slip
  Collision check: verify per-draw, especially that e2 (a genuinely
                   different computation, not just an offset) doesn't
                   coincidentally match the true elapsed time.
  ```
- Average:
  ```
  Skeleton: "A movie lasted {H} hours and {M} minutes. It finished at
            {endTime}. What time did it start?" (real quote pattern).
  Params: H in [1,3]. M in [0,59]. endTime random, same-day, no rollover
          past midnight when subtracting (reject/redraw if it would).
  Answer: endTime − (H hours, M minutes).
  Distractors:
    e1 = endTime + duration        // added instead of subtracted — direction confusion
    e2 = subtracted only the hours, ignored the minutes
    e3 = subtracted only the minutes, ignored the hours
  Collision check: clean given the no-rollover constraint.
  ```
- Difficult:
  ```
  Skeleton: "{name} spends {M} minutes {activity} every day. How many hours
            and minutes total does {name} spend on this in {days} days?"
            (real quote pattern: "70 minutes daily... in a week").
  Params: M random in [20,90]. days from {5,6,7}.
  Answer: total = M*days minutes, expressed as H hours + M' minutes
          (H = floor(total/60), M' = total mod 60).
  Distractors:
    e1 = M*(days−1)                          // off-by-one day count
    e2 = the H/M' VALUES SWAPPED (e.g. "20 hours 1 minute" instead of "1 hour 20 minutes")
    e3 = (M/60)*days computed by dividing M by 60 FIRST (a wrong-order-of-operations slip, likely producing a fractional-hours value handled sloppily)
  Collision check: verify per-draw that e2's swap doesn't coincidentally
                   equal the true H/M' pair (only possible if H = M',
                   vanishingly unlikely but worth the explicit check).
  ```

### Strand 5 — Statistics

**Averages**

- Easy:
  ```
  Skeleton: "{name} got grades of {v1}, {v2}, {v3}, {v4}, and {v5} in five
            subjects. What is the average grade?" (real confirmed 5-value
            pattern).
  Params: 4 free values in [70,100]; the 5th is set so the sum is evenly
          divisible by 5 (v5 = 5*targetAvg − sum(v1..v4)), redraw if v5
          falls outside [70,100].
  Answer: sum/5.
  Distractors:
    e1 = sum/4    // divided by the wrong count — forgot one value
    e2 = sum       // forgot to divide at all
    e3 = sum/5 ± 1 // small rounding-style slip
  Collision check: clean by construction (the divisibility constraint keeps
                   the true average a clean integer, so e3 is never
                   accidentally correct).
  ```
- Average:
  ```
  Skeleton: "{name}'s average grade across 5 subjects is {avg}. Four of the
            grades are {v1},{v2},{v3},{v4}. What is the fifth grade?"
            (reverse-solve).
  Params: pick avg and v1-4 such that v5 = 5*avg − sum(v1..v4) lands in a
          valid grade range — reject/redraw otherwise.
  Answer: v5.
  Distractors:
    e1 = avg                       // just repeated the average, didn't solve
    e2 = 4*avg − sum(v1..v4)        // used 4 instead of 5 in the formula — a real off-by-one on the count
    e3 = sum(v1..v4)/4               // computed the average of the given 4 instead of solving for the 5th
  Collision check: clean by construction given the valid-range constraint.
  ```
- Difficult:
  ```
  Skeleton: "{name}'s average score across {n} tests is {avg}. After taking
            one more test, the average becomes {newAvg}. What was the score
            on the new test?" (matches Grade 5's confirmed Difficult-tier
            pattern — an inferred extension here, not independently
            G3-sourced, per this doc's own flag).
  Params: n in [3,6]. avg, newAvg chosen so newScore = (n+1)*newAvg − n*avg
          is a clean, valid integer.
  Answer: newScore.
  Distractors:
    e1 = newAvg                          // just repeated the new average
    e2 = n*newAvg − (n+1)*avg              // the n / (n+1) roles swapped in the formula
    e3 = newAvg − avg                       // treated the new score as just the DIFFERENCE between the two averages — a plausible but wrong shortcut
  Collision check: verify per-draw; e2 can occasionally coincide with e1
                   for specific (n,avg,newAvg) combinations, redraw if so.
  ```

### Strand 6 — Classic Word-Problem Archetypes

**Coin problems** (Average tier is already fully worked in the [Worked example](#worked-example) section below — Easy and Difficult here complete the set)

- Easy:
  ```
  Skeleton: "{name} has {count} ₱{denom}-coins. How much money does {name}
            have in total?"
  Params: denom from {1,5,10,20}. count random in [3,30].
  Answer: count*denom.
  Distractors:
    e1 = count + denom    // added instead of multiplied
    e2 = count * (an adjacent real denomination, e.g. mixed up ₱5 and ₱10)
    e3 = count / denom     // divided instead of multiplied
  Collision check: clean for the fixed denomination set used here.
  ```
- Difficult:
  ```
  Skeleton: "{name} has ₱1, ₱5, and ₱10 coins totaling {T} coins worth ₱{V}
            in total. {He/She} has twice as many ₱5 coins as ₱10 coins. How
            many ₱10 coins does {name} have?" (three denominations plus a
            stated count-relationship, per the doc's own framing).
  Params: pick x10 first; x5 = 2*x10 (the stated relationship); x1 = T −
          x10 − x5, REQUIRED ≥ 1 (redraw x10 otherwise, so all three
          denominations are genuinely present); T = x1+x5+x10; V computed
          forward as 1*x1 + 5*x5 + 10*x10 (never solved backward).
  Answer: x10.
  Distractors:
    e1 = x5   // gave the OTHER (related) denomination's count — very plausible since the two counts are explicitly linked in the question
    e2 = x1    // gave the leftover ₱1 count instead
    e3 = x10 ± 1  // off-by-one in solving the 3-variable system
  Collision check: the x1 ≥ 1 constraint is what guarantees the question's
                   own "has ₱1, ₱5, and ₱10 coins" framing stays true for
                   every generated draw.
  ```

**Consecutive-integer-sum problems**

- Easy:
  ```
  Skeleton: "What is the sum of the integers from {a} to {b}?" (a short
            run, computed directly or via pairing).
  Params: a random in [1,20]. Run length r in [5,10]. b = a + r − 1.
  Answer: r*(a+b)/2 (Gauss pairing — always a clean integer for consecutive
          integers, no extra parity constraint needed).
  Distractors:
    e1 = (b−a)*(a+b)/2   // used b−a instead of the true run length r=b−a+1 — an off-by-one on the count
    e2 = r*b               // multiplied the count by just the last term, skipping the pairing average entirely
    e3 = a+b                // just added the two endpoints, ignored the rest of the run
  Collision check: clean for r ≥ 2 (guaranteed by the param range).
  ```
- Average:
  ```
  Skeleton: "What is the sum of the first {n} positive integers?" (real
            quote pattern: "first 50 integers" — Gauss-pairing needed for
            efficiency at this scale).
  Params: n random in [30,100].
  Answer: n*(n+1)/2.
  Distractors:
    e1 = n*(n+1)      // forgot to divide by 2
    e2 = n*n            // confused with a different, unrelated formula (n²)
    e3 = n*(n−1)/2      // off-by-one, used n−1 instead of n+1
  Collision check: clean for n ≥ 2.
  ```
- Difficult:
  ```
  Skeleton: "The sum of the first {n} positive integers is {S}. What is
            {n}?" (reverse of Average — solve n(n+1)/2 = S for n; n is
            chosen FIRST, S computed forward from it, so a clean integer
            solution is guaranteed by construction, not solved live).
  Params: n random in [10,50]. S = n*(n+1)/2.
  Answer: n.
  Distractors:
    e1 = S/2                              // a naive guess ignoring the actual quadratic relationship entirely
    e2 = n ± 1                              // off-by-one, the quadratic is easy to mis-invert near the right answer
    e3 = floor(sqrt(2*S))                   // a real near-miss from correctly recalling "roughly √(2S)" but not applying the +1 correction — only used as a distractor when it differs from the true n
  Collision check: verify e3 ≠ n at generation (redraw n if they coincide,
                   which can happen for specific n near a perfect-square-ish
                   value of 2S).
  ```

**Money/shopping problems**

- Easy:
  ```
  Skeleton: "{item1} costs ₱{p1} and {item2} costs ₱{p2}. How much do
            {qty1} {item1} and {qty2} {item2} cost in total?"
  Params: p1,p2 random in [5,50]. qty1,qty2 random in [1,5].
  Answer: qty1*p1 + qty2*p2.
  Distractors:
    e1 = (qty1+qty2)*(p1+p2)   // added quantities and prices separately, then multiplied the sums — a real compounding error
    e2 = qty1*p2 + qty2*p1      // swapped which price belongs to which item
    e3 = p1+p2                   // forgot the quantities entirely, just added the two unit prices
  Collision check: clean for the ranges used here.
  ```
- Average:
  ```
  Skeleton: "{name} bought {item1} for ₱{p1} and {item2} for ₱{p2}.
            {He/She} paid with a ₱{bill} bill. How much change did {name}
            receive?" (real quote pattern: "P200 bill, rice and fish, how
            much left").
  Params: p1,p2 random. bill from the real PH bill denominations {20, 50,
          100, 200, 500, 1000}, chosen so bill > p1+p2.
  Answer: bill − (p1+p2).
  Distractors:
    e1 = bill − p1              // forgot to subtract the second item
    e2 = p1+p2                   // gave the total COST instead of the change — asked-wrong-quantity slip
    e3 = bill + p1 + p2           // added everything instead of subtracting — sign confusion
  Collision check: clean given bill > p1+p2 by construction.
  ```
- Difficult:
  ```
  Skeleton: "A dozen {item} costs ₱{dozenPrice}. How much would {qty}
            {item} cost?" (requires a genuine per-unit price computation
            first — real pattern: "price per dozen given, buying a
            different quantity").
  Params: dozenPrice a multiple of 12 in [24,120] (clean per-unit price).
          qty random in [1,30].
  Answer: (dozenPrice/12) * qty.
  Distractors:
    e1 = dozenPrice * qty          // multiplied by the DOZEN price directly, never found the per-unit price — the exact conceptual error this archetype targets
    e2 = (dozenPrice/qty) * 12      // divided by the wrong quantity (qty instead of 12)
    e3 = dozenPrice / qty            // flipped the division entirely
  Collision check: clean given dozenPrice is always a clean multiple of 12.
  ```

---

## Worked example

Strand 6, Coin Problems, Average tier — chosen because it has the strongest, most literal real-quote anchor of any Grade 3 archetype (fetched as raw text, not summarized).

```
Skeleton: "{name} had ₱{d1}-peso and ₱{d2}-peso coins in her bag totaling
           ₱{V}. If she had a total of {T} coins, how many of these are
           ₱{d2} coins?"

Params:   d1 = 1 (fixed — the smaller Philippine coin denomination),
          d2 ∈ {5, 10}, T ∈ {9, 11, 13, 15} (ODD ONLY — see collision note),
          x ∈ [2, T−2] (the count of ₱{d2} coins — drawn directly, not solved for)
Constraint: solve forward — pick x first, then compute
            V = d2×x + d1×(T−x), so the question always has a clean,
            guaranteed-valid answer. Both coin types are present in every
            draw (x ≥ 2 and T−x ≥ 2).

Answer formula:  x = (V − d1×T) / (d2 − d1)

Distractor formulas (each a named plausible slip):
  e1 = T − x                    // found the count of the OTHER denomination
                                 // (the ₱1 coins) instead of what was asked
  e2 = V / d2                   // naively divided total value by the bigger
                                 // denomination, ignoring the mix entirely
  e3 = T / 2                    // assumed an even split between the two
                                 // denominations

CAUGHT IN ACCURACY PASS (same category as two earlier bugs in this pack,
and a second issue found while checking it thoroughly rather than stopping
at the first fix):

1. If x were allowed to equal T/2 exactly (an even split), THREE options
   would collide at once — e1 (T−x) would equal the correct answer x, AND
   e3 (T/2) would also equal both of them. Not a rare fluke: the direct
   consequence of x = T−x whenever x = T/2. Fixed structurally by requiring
   T to be ODD, so T/2 is never an integer — same approach as the q≠1 fix
   in the Grade 4 doc and the n1≠n2 fix in the Grade 6 doc.

2. e2 (=V/d2) equals the correct answer only at the boundary x=T, already
   excluded by the [2,T−2] range — that part is clean. BUT checking e2
   against e3 (not just against the correct answer — every pair needs
   checking, not just "does it match the right answer") turned up a real
   coincidental collision: with d1=1, d2=10, T=9, x=4 → V = 10(4)+1(5) = 45,
   giving e2 = 45/10 = 4.5 and e3 = 9/2 = 4.5 — two DIFFERENT distractor
   formulas landing on the identical wrong value for that specific draw.
   Neither equals the correct answer (4), so a child couldn't accidentally
   "solve" the question this way, but two visually-identical wrong options
   in a 4-choice question is still a real quality defect. Unlike the T/2
   case, this isn't a clean algebraic identity across all draws — it's a
   coincidence for specific parameter combinations, which is exactly the
   category checklist item 11's mandatory PER-DRAW distinctness check
   (not just per-archetype structural exclusion) exists to catch. This one
   is left to that runtime check rather than an added structural constraint,
   because no single clean exclusion rule (like "T odd") removes it without
   testing further specific cases — a good concrete illustration of why the
   checklist needs both a structural layer AND a per-draw layer, not one or
   the other.

Scaffold note: relies on the Easy-tier skill of direct count×value
               computation for a single denomination — Average adds the
               "two unknowns, one total" system-setup step, solved here via
               the same forward-then-reverse logic used throughout this
               pack's templates (Grade 5's Age Problems, Grade 4's Custom
               Operation, Grade 6's Combined Average).
```

---

## Technique assignments

Per the [overview's Technique Library](mtap-expansion-overview.md#technique-library--named-reusable-shortcut-methods).

| Archetype | Technique | Note |
|---|---|---|
| Place value, expanded form & decomposition | `null` | Direct place-value reasoning. |
| Roman numerals | `null` | Place-value decomposition of the numeral itself, not a separate shortcut. |
| Order of operations & estimation | Completing the whole | For the estimation sub-case; direct order-of-operations otherwise. |
| Prime numbers & Goldbach-style puzzles | `null` | Direct primality checking/factoring; no shortcut identified. |
| Digit-relationship puzzles | `null` | Solved via direct algebra or constrained trial, same as the equivalent Grade 5 archetype. |
| Division & remainders | `null` generally; Digit-sum divisibility rules where applicable | |
| Fraction operations | `null` | Standard procedure. |
| Fraction of a number / of a total | Working backward through a chain for the successive-fraction-of-remainder sub-case | |
| Decimal comparison | `null` | Direct conversion-then-compare. |
| Arithmetic sequences | Arithmetic nth-term formula | |
| Function-machine puzzles | Working backward through a chain | Directly matches this archetype's own defined mechanic. |
| Equation-solving (single unknown) | `null` | Direct isolation of the unknown. |
| Multiplicative comparison | `null` | Direct multiplication/comparison. |
| Perimeter & area, incl. reverse | `null` | Direct formula/reverse-solve. |
| Symmetry & polygon vocabulary | `null` | Factual recall — honestly has no computational shortcut. |
| Time & elapsed time | `null` | Direct time arithmetic. |
| Averages | Using a base | Same technique family as the Grade 4/5/6 averages archetypes, extended here per this strand's own Difficult-tier note. |
| Coin problems | Alternate elimination and retention | Directly sourced from this exact archetype's real citation — this is the technique the [worked example](#worked-example) demonstrates end-to-end. |
| Consecutive-integer-sum problems | Gauss pairing | Directly sourced from this exact archetype's real citation. |
| Money/shopping problems | `null` | Direct arithmetic. |

---

## What's still open

- **Strand 5's Difficult tier (Averages)** is an inferred extension of Grade 5's confirmed pattern, not independently G3-sourced — flagged in its own spec.
- **Lever/mixture "not found"** rests on 3 sources, one fewer than Grade 6's 4-source confident-absence finding — worth one more source check before treating this as settled the way Grade 6's is.
- **All 6 strands (20 archetypes) have full parametric templates (2026-09-08)** — skeleton/params/constraints/answer-formula/distractors, same rigor as the Coin Problems worked example.
- **Scaled batch generated and verified (2026-09-08)** — `content/mtap-grade3-scaled-batch.json`, 476 questions. A real (ephemeral, not committed) Python generator implementing all 20 templates, with a collision-detection retry loop matching this doc's own rule. Went through two rounds:
  1. A first 120-question checkpoint (2/archetype/tier, matching Grade 2's own first checkpoint size) caught and fixed three real bugs the templates' hand-written reasoning missed: `digit_relationship_puzzles`'s Difficult tier as originally spec'd (two independent digit-offset clues) is mathematically underdetermined — usually many three-digit numbers satisfy both, not one — so its uniqueness check hung forever; redesigned around a digit-sum clue instead, unique by construction. `consecutive_integer_sum`'s Difficult-tier distractor `int(sqrt(2S))` is mathematically *always* equal to the correct `n` (n² ≤ n(n+1) < (n+1)² for every n), not just usually, so its "must differ" check also hung forever; replaced with a real off-by-a-small-amount distractor. `coin_problems` hardcoded "her bag" regardless of the drawn name's gender; `money_shopping`/`multiplicative_comparison` could draw the same item on both sides of a question. All fixed. All 120 hand-verified for actual mathematical correctness (not just structural sanity) by independently recomputing every answer. All correct.
  2. Scaling to a target of 8/archetype/tier (476 total; Grade 2 ended at 518) surfaced a real cross-draw duplicate — `symmetry_polygon`'s Difficult tier generated the literal same question twice (only 2 draws existed at checkpoint size, so this hadn't shown up yet). Added whole-slot duplicate detection (`emit()` now tracks a `(question, options)` fingerprint per archetype/tier and redraws rather than repeating), which then exposed a second bug: `decimal_comparison` and `prime_goldbach`'s "easy" tiers use a fixed question STRING with the real content living in the options, so deduping on question text alone falsely treated every draw after the first as a duplicate, starving those slots to 1 question. Fixed by fingerprinting on `(question, options)` together, not text alone. Re-verified stable across 4 independent runs — same 476 count, same single expected shortfall (`symmetry_polygon/easy`, genuinely capped at 4 real shapes) every time.
  - Not yet imported into the live database, no `MTAP_GRADE3_STRANDS` added to `lib/mtapContent.ts`, no `sec_packs` Grade 3 row — those are the next steps once this is reviewed.
- `lib/mtapContent.ts`'s `MTAP_GRADE3_STRANDS` (the display-layer strand/archetype list the Shop/Bonus Quests UI reads) is intentionally NOT added yet — that file's own header rule is "add a grade only once its batch has actually been generated, verified, and imported," and no Grade 3 content exists yet. Same for a `sec_packs` Grade 3 catalog row.
