# Logic Labyrinth — Grade 2 Question Generation Prompt

## Guild Mechanic
Students read a logic puzzle or pattern and pick one of four labelled options. No images — all puzzles must be solvable from the text alone.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "puzzle_prompt_text": "What comes next? 2, 4, 6, 8, __",
    "options_array": [
      { "id": "a", "label": "9"  },
      { "id": "b", "label": "10" },
      { "id": "c", "label": "11" },
      { "id": "d", "label": "12" }
    ],
    "correct_option_id": "b",
    "difficulty_tier": 1
  },
  {
    "puzzle_prompt_text": "Cat is to Kitten as Dog is to ___?",
    "options_array": [
      { "id": "a", "label": "Puppy" },
      { "id": "b", "label": "Cub"   },
      { "id": "c", "label": "Chick" },
      { "id": "d", "label": "Foal"  }
    ],
    "correct_option_id": "a",
    "difficulty_tier": 2
  }
]
```

- `options_array` must have **exactly 4** items with ids `"a"`, `"b"`, `"c"`, `"d"` in order.
- All four labels must be distinct.
- `correct_option_id` must match one of the ids exactly.
- `difficulty_tier` must be `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | Simple pattern or odd-one-out; one clear step; immediately obvious to most G2 students |
| 2 | Two-step reasoning; simple analogy; slightly less obvious pattern rule |
| 3 | Multi-step reasoning; logical deduction from 2–3 clues; harder analogy; non-linear pattern |

## Grade 2 Puzzle Types

**Number sequences** — What comes next? (arithmetic progressions, skip-counting by 2/5/10, decreasing by 1/2)
- Tier 1: simple +1, +2, +5, +10 sequences
- Tier 2: -1 counting-down, ×2 doubling, missing-middle-term
- Tier 3: non-obvious pattern rule (e.g., Fibonacci-like for small numbers, triangle numbers)

**Letter / alphabet sequences** — What comes next? (alphabetical order, every-other-letter)
- Tier 1: ABC...
- Tier 2: alternating (A, C, E...), reverse alphabet
- Tier 3: double-letter pairs (AA, BB, CC...), skip-2 patterns

**Odd one out** — Which does NOT belong?
- Category: fruits vs vegetables; animals vs objects; colors vs shapes; months vs days of the week
- Tier 1: one item from a completely different category
- Tier 2: one item that shares the category but differs on a key property

**Simple analogies** — A is to B as C is to ___?
- Tier 1: animal → baby (cat → kitten), body part → sense (eye → see)
- Tier 2: tool → action (pen → write), place → professional (school → teacher)
- Tier 3: abstract relations (cause → effect, problem → solution)

**Deductive reasoning** — Short 2–3 sentence clue sets
- Tier 2: "Maria is taller than Ana. Ana is taller than Lita. Who is shortest?"
- Tier 3: "All fruits have seeds. A mango is a fruit. What must be true?"

**Word / shape patterns** — Visual text patterns (described in text)
- "△ □ △ □ △ ___?" → options: △, □, ○, ◇

## Quality Rules
- Puzzles must be 100 % solvable from the text — no image required.
- All four options must be plausible; the correct answer should not be obvious by elimination.
- Wrong options should be the most common wrong guesses for that type of puzzle.
- Keep language at a 7–8-year-old level; short sentences; no technical vocabulary.
- Avoid ambiguous phrasing (e.g., if a pattern could have two valid continuations, reword it).
- Deductive puzzles: keep to 2 premises maximum at Tier 2, 3 at Tier 3.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 2, Term 1. Distribute roughly 40 % tier 1 / 40 % tier 2 / 20 % tier 3. Return only the JSON array. No commentary.
