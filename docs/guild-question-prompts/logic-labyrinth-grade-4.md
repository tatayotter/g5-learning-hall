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
    "correct_option_id": "b"
  },
  {
    "puzzle_prompt_text": "All birds have wings. Penguins are birds. What must be true?",
    "options_array": [
      { "id": "a", "label": "Penguins can fly"          },
      { "id": "b", "label": "Penguins have wings"       },
      { "id": "c", "label": "All winged animals are birds" },
      { "id": "d", "label": "Penguins are not birds"   }
    ],
    "correct_option_id": "b"
  }
]
```

- `options_array`: exactly 4 items, ids `"a"`–`"d"`, all labels distinct.
- `correct_option_id`: matches one id exactly.

## Grade 4 Puzzle Types

**Number sequences**
- Mix geometric ×2/×3, arithmetic +7/+9, and perfect-squares-up-to-100 sequences with two-rule alternating patterns (e.g., +3, ×2, +3, ×2) and reciprocal fractions (1/2, 1/4, 1/8), plus the occasional Fibonacci variant, triangular-number difference, or pattern-in-differences (second difference is constant)

**Letter / code sequences**
- Mix skip-2 sequences (A, D, G, J, __) and letter+number codes (Z1, Y2, X3, __) with the occasional two-pattern interleaved sequence (ABCBCDC...)

**Analogies (cross-domain, curriculum-connected)**
- Mix science (photosynthesis : plants :: respiration : ___?) and math (numerator : fraction :: numerator : ___?) analogies with historical (Rizal : reformist :: Bonifacio : ___?) and geography (Luzon : island group :: Manila : ___?) ones, plus the occasional abstract relation (law : legislation :: rule : ___?)

**Syllogistic reasoning**
- Mix two-premise syllogisms (All A are B. X is A. → X is B.) and common false-conversion traps with chain syllogisms (3 premises) and negative syllogisms (No A are B. X is A. → X is not B.)

**Multi-clue ordering and deduction**
- Mix 3-person ordering with 2 comparative clues and 4-person ordering with 3 clues including negatives; scheduling puzzles

**Set / Venn reasoning**
- "In a class of 30, 18 like Math and 15 like Science. 8 like both. How many like neither?"

**Word problems with logical structure**
- "A code assigns A=1, B=2, … Z=26. What does the code 5-1-7-12-5 spell?"

## Quality Rules
- Every puzzle solvable from text alone.
- For syllogisms: supply all premises in the puzzle text; one clear valid conclusion.
- For sequences: the rule must be deterministic (only one valid continuation).
- Distractors should be the most tempting wrong answers (common reasoning errors, off-by-one, false conversion).
- Language: 9–10-year-old level; academic but clear; short prompts.
- Avoid double-negatives.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 4, Term 1. Return only the JSON array. No commentary.
