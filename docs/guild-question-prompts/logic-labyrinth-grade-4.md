# Logic Labyrinth — Grade 4 Question Generation Prompt

## Guild Mechanic
Students read a logic puzzle or pattern and pick one of four labelled options. All puzzles solvable from text alone — no images.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "puzzle_prompt_text": "What is the missing number? 2, 6, 18, 54, __, 486",
    "options_array": [
      { "id": "a", "label": "108" },
      { "id": "b", "label": "162" },
      { "id": "c", "label": "200" },
      { "id": "d", "label": "270" }
    ],
    "correct_option_id": "b",
    "difficulty_tier": 2
  },
  {
    "puzzle_prompt_text": "All birds have wings. Penguins are birds. What must be true?",
    "options_array": [
      { "id": "a", "label": "Penguins can fly"          },
      { "id": "b", "label": "Penguins have wings"       },
      { "id": "c", "label": "All winged animals are birds" },
      { "id": "d", "label": "Penguins are not birds"   }
    ],
    "correct_option_id": "b",
    "difficulty_tier": 2
  }
]
```

- `options_array`: exactly 4 items, ids `"a"`–`"d"`, all labels distinct.
- `correct_option_id`: matches one id exactly.
- `difficulty_tier`: `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | One step; common analogy; straightforward sequence rule; simple categorical odd-one-out |
| 2 | Two steps; geometric/multiplicative sequences; syllogistic reasoning; 3-clue ordering; cross-domain analogy |
| 3 | Multi-step; complex deduction from 3–4 clues; inverse reasoning; set membership; two-variable problems |

## Grade 4 Puzzle Types

**Number sequences**
- Tier 1: geometric ×2 / ×3; arithmetic +7, +9; perfect squares up to 100
- Tier 2: two-rule alternating (e.g., +3, ×2, +3, ×2); reciprocal fractions (1/2, 1/4, 1/8)
- Tier 3: Fibonacci variants; triangular-number differences; pattern-in-differences (second difference is constant)

**Letter / code sequences**
- Tier 2: A, D, G, J, __ (skip 2); letter+number code (Z1, Y2, X3, __)
- Tier 3: two-pattern interleaved (ABCBCDC...)

**Analogies (cross-domain, curriculum-connected)**
- Tier 1: science (photosynthesis : plants :: respiration : ___?); math (numerator : fraction :: numerator : ___?)
- Tier 2: historical (Rizal : reformist :: Bonifacio : ___?); geography (Luzon : island group :: Manila : ___?)
- Tier 3: abstract relations (law : legislation :: rule : ___?)

**Syllogistic reasoning**
- Tier 2: two-premise syllogisms (All A are B. X is A. → X is B.); common false-conversion traps
- Tier 3: chain syllogisms (3 premises); negative syllogisms (No A are B. X is A. → X is not B.)

**Multi-clue ordering and deduction**
- Tier 2: 3-person ordering with 2 comparative clues
- Tier 3: 4-person ordering with 3 clues including negatives; scheduling puzzles

**Set / Venn reasoning**
- Tier 3: "In a class of 30, 18 like Math and 15 like Science. 8 like both. How many like neither?"

**Word problems with logical structure**
- Tier 3: "A code assigns A=1, B=2, … Z=26. What does the code 5-1-7-12-5 spell?"

## Quality Rules
- Every puzzle solvable from text alone.
- For syllogisms: supply all premises in the puzzle text; one clear valid conclusion.
- For sequences: the rule must be deterministic (only one valid continuation).
- Distractors should be the most tempting wrong answers (common reasoning errors, off-by-one, false conversion).
- Language: 9–10-year-old level; academic but clear; short prompts.
- Avoid double-negatives.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 4, Term 1. Distribute roughly 25 % tier 1 / 45 % tier 2 / 30 % tier 3. Return only the JSON array. No commentary.
