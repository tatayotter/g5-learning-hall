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
    "correct_option_id": "b"
  },
  {
    "puzzle_prompt_text": "Pen is to Write as Ruler is to ___?",
    "options_array": [
      { "id": "a", "label": "Draw"    },
      { "id": "b", "label": "Measure" },
      { "id": "c", "label": "Erase"   },
      { "id": "d", "label": "Count"   }
    ],
    "correct_option_id": "b"
  }
]
```

- `options_array`: exactly 4 items, ids `"a"` through `"d"`, all labels distinct.
- `correct_option_id`: must match one id.

## Grade 3 Puzzle Types

**Number sequences**
- Mix simple +3/+4/+6/×2 (doubling) sequences (e.g., 5, 10, 15, 20, __) with alternating add patterns (+2, +4, +2, +4), ×3 geometric, and square numbers (1, 4, 9, 16, __), plus the occasional mixed rule (e.g., ×2 then +1 alternating) or triangle-number sequence (1, 3, 6, 10, 15, __)

**Letter / code sequences**
- Mix alphabetical skip-1 (A, C, E, G, __) with double-letter pairs (AA, CC, EE, __), reverse skip, and the occasional letter + number pattern (A1, B2, C3, __)

**Odd one out**
- Mix obvious category mismatches (e.g., dog, cat, eagle, chair) with subtler property differences within a category (e.g., all triangles but one is equilateral) and the occasional puzzle needing cross-category knowledge (e.g., all are capital cities except one)

**Analogies**
- Mix object → function (pen → write) and animal → sound (dog → bark) with part → whole (finger → hand) and science-concept analogies (ice → water as wood → fire), plus the occasional abstract one (colony → bee as pack → wolf; cause → effect)

**Deductive / ordering puzzles**
- Mix 2-clue ordering ("Ana is older than Ben. Ben is older than Cris. Who is youngest?") with 3-clue or negation puzzles ("Pedro is not 1st or 3rd. Ana is 2nd. Who is 1st?")

**Set / category logic**
- "All rectangles have 4 right angles. A square has 4 right angles. Is a square a rectangle?" (Yes, with explanation in options)

## Quality Rules
- Every puzzle solvable from text alone — no diagram.
- All four options must be plausible; correct answer should not be obvious by elimination.
- Wrong options for sequences: common arithmetic errors (off-by-one, applying wrong rule).
- Deductive clues: no ambiguity; exactly one logically valid conclusion.
- Language level: 8–9-year-old; simple vocabulary, short prompts.
- Avoid double-negatives in the puzzle text.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 3, Term 1. Return only the JSON array. No commentary.
