# Logic Labyrinth — Grade 3 Question Generation Prompt

## Guild Mechanic
Students read a logic puzzle or pattern and pick one of four labelled options. All puzzles must be solvable from text alone — no images.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "puzzle_prompt_text": "What comes next? 3, 6, 12, 24, __",
    "options_array": [
      { "id": "a", "label": "36" },
      { "id": "b", "label": "48" },
      { "id": "c", "label": "30" },
      { "id": "d", "label": "42" }
    ],
    "correct_option_id": "b",
    "difficulty_tier": 2
  },
  {
    "puzzle_prompt_text": "Pen is to Write as Ruler is to ___?",
    "options_array": [
      { "id": "a", "label": "Draw"    },
      { "id": "b", "label": "Measure" },
      { "id": "c", "label": "Erase"   },
      { "id": "d", "label": "Count"   }
    ],
    "correct_option_id": "b",
    "difficulty_tier": 1
  }
]
```

- `options_array`: exactly 4 items, ids `"a"` through `"d"`, all labels distinct.
- `correct_option_id`: must match one id.
- `difficulty_tier`: `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | One clear step; common analogy; simple arithmetic sequence |
| 2 | Two steps; slightly non-obvious rule; analogy with less-familiar relationship; 2-clue deduction |
| 3 | Multi-step; 3-clue ordering/deduction; non-linear sequence (squares, cubes, Fibonacci); categorical analogy with a twist |

## Grade 3 Puzzle Types

**Number sequences**
- Tier 1: +3, +4, +6, ×2 (doubling); e.g., 5, 10, 15, 20, __
- Tier 2: alternating add patterns (+2, +4, +2, +4); ×3 geometric; square numbers (1, 4, 9, 16, __)
- Tier 3: mixed rule (e.g., ×2 then +1 alternating); triangle numbers (1, 3, 6, 10, 15, __)

**Letter / code sequences**
- Tier 1: alphabetical skip-1 (A, C, E, G, __)
- Tier 2: double-letter pairs (AA, CC, EE, __); reverse skip
- Tier 3: letter + number pattern (A1, B2, C3, __)

**Odd one out**
- Tier 1: obvious category mismatch (e.g., dog, cat, eagle, chair)
- Tier 2: subtle property difference within a category (e.g., all triangles but one is equilateral and the others are not)
- Tier 3: requires cross-category knowledge (e.g., all are capital cities except one)

**Analogies**
- Tier 1: object → function (pen → write), animal → sound (dog → bark)
- Tier 2: part → whole (finger → hand), science concept analogies (ice → water as wood → fire)
- Tier 3: abstract (colony → bee as pack → wolf; cause → effect)

**Deductive / ordering puzzles**
- Tier 2: 2-clue ordering ("Ana is older than Ben. Ben is older than Cris. Who is youngest?")
- Tier 3: 3-clue or negation ("Pedro is not 1st or 3rd. Ana is 2nd. Who is 1st?")

**Set / category logic**
- Tier 2–3: "All rectangles have 4 right angles. A square has 4 right angles. Is a square a rectangle?" (Yes, with explanation in options)

## Quality Rules
- Every puzzle solvable from text alone — no diagram.
- All four options must be plausible; correct answer should not be obvious by elimination.
- Wrong options for sequences: common arithmetic errors (off-by-one, applying wrong rule).
- Deductive clues: no ambiguity; exactly one logically valid conclusion.
- Language level: 8–9-year-old; simple vocabulary, short prompts.
- Avoid double-negatives in the puzzle text.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 3, Term 1. Distribute roughly 30 % tier 1 / 45 % tier 2 / 25 % tier 3. Return only the JSON array. No commentary.
