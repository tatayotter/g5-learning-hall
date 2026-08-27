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
    "correct_option_id": "b"
  },
  {
    "puzzle_prompt_text": "Cat is to Kitten as Dog is to ___?",
    "options_array": [
      { "id": "a", "label": "Puppy" },
      { "id": "b", "label": "Cub"   },
      { "id": "c", "label": "Chick" },
      { "id": "d", "label": "Foal"  }
    ],
    "correct_option_id": "a"
  }
]
```

- `options_array` must have **exactly 4** items with ids `"a"`, `"b"`, `"c"`, `"d"` in order.
- All four labels must be distinct.
- `correct_option_id` must match one of the ids exactly.

## Grade 2 Puzzle Types

**Number sequences** — What comes next? (arithmetic progressions, skip-counting by 2/5/10, decreasing by 1/2)
- Mix simple +1/+2/+5/+10 sequences, -1 counting-down, ×2 doubling, missing-middle-term puzzles, and the occasional non-obvious pattern rule (e.g., Fibonacci-like for small numbers, triangle numbers)

**Letter / alphabet sequences** — What comes next? (alphabetical order, every-other-letter)
- Mix plain ABC... sequences, alternating (A, C, E...) and reverse-alphabet patterns, and the occasional double-letter pair (AA, BB, CC...) or skip-2 pattern

**Odd one out** — Which does NOT belong?
- Category: fruits vs vegetables; animals vs objects; colors vs shapes; months vs days of the week
- Mix puzzles where the odd item is from a completely different category with harder ones where it shares the category but differs on a key property

**Simple analogies** — A is to B as C is to ___?
- Mix animal → baby (cat → kitten) and body part → sense (eye → see) analogies with tool → action (pen → write) and place → professional (school → teacher) ones, plus the occasional abstract relation (cause → effect, problem → solution)

**Deductive reasoning** — Short 2–3 sentence clue sets
- e.g., "Maria is taller than Ana. Ana is taller than Lita. Who is shortest?" or "All fruits have seeds. A mango is a fruit. What must be true?"

**Word / shape patterns** — Visual text patterns (described in text)
- "△ □ △ □ △ ___?" → options: △, □, ○, ◇

## Quality Rules
- Puzzles must be 100 % solvable from the text — no image required.
- All four options must be plausible; the correct answer should not be obvious by elimination.
- Wrong options should be the most common wrong guesses for that type of puzzle.
- Keep language at a 7–8-year-old level; short sentences; no technical vocabulary.
- Avoid ambiguous phrasing (e.g., if a pattern could have two valid continuations, reword it).
- Deductive puzzles: keep to 2–3 premises, depending on how much the puzzle needs.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 2, Term 1. Return only the JSON array. No commentary.
