# Logic Labyrinth — Grade 5 Question Generation Prompt

## Guild Mechanic
Students read a logic puzzle or pattern and pick one of four labelled options. All puzzles must be solvable from text alone — no images.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "puzzle_prompt_text": "What comes next? 1, 1, 2, 3, 5, 8, 13, __",
    "options_array": [
      { "id": "a", "label": "18" },
      { "id": "b", "label": "19" },
      { "id": "c", "label": "20" },
      { "id": "d", "label": "21" }
    ],
    "correct_option_id": "d"
  },
  {
    "puzzle_prompt_text": "In a group of 30 students, 18 like Math and 15 like Science. 8 like both subjects. How many like neither?",
    "options_array": [
      { "id": "a", "label": "3" },
      { "id": "b", "label": "5" },
      { "id": "c", "label": "7" },
      { "id": "d", "label": "8" }
    ],
    "correct_option_id": "b"
  }
]
```

- `options_array`: exactly 4 items, ids `"a"`–`"d"`, all distinct labels.
- `correct_option_id`: matches one id.

## Grade 5 Puzzle Types

**Number and fraction sequences**
- Mix primes (2, 3, 5, 7, 11, 13, __), Fibonacci, and perfect squares (1, 4, 9, 16, 25, __) with ×2-then−1 alternating, triangular numbers (1, 3, 6, 10, 15, __), n² + 1, and geometric ×3 sequences, plus the occasional second-difference-constant or fractional geometric sequence (1/2, 1/4, 1/8, __)

**Analogy (curriculum-connected)**
- Mix science pairs (producer : ecosystem :: author : literature) and historical pairs (Rizal : reform :: Bonifacio : revolution) with abstract pairs (cause : effect :: evidence : conclusion) and grammar pairs (noun : pronoun :: verb : auxiliary), plus the occasional multi-domain chain (cell : tissue :: letter : word :: word : ___?)

**Syllogistic / categorical reasoning**
- Mix two-premise syllogisms (valid → conclude; invalid → "cannot be determined") with chains of three premises and negative syllogisms (No A are B; X is A → X is not B), plus the occasional contrapositive-reasoning puzzle or fallacy-identification question

**Multi-clue ordering and scheduling**
- Mix 4-person ordering with 3 comparative + 1 negative clue with scheduling puzzles (time slots, circular arrangements, graph-coloring described in text)

**Venn / set reasoning**
- Mix 2-set Venn puzzles (find "both", "only A", "neither") with inclusion-exclusion ones (|A ∪ B| = |A| + |B| − |A ∩ B|; find any unknown element)

**Coded problems**
- Letter-to-number codes (A=1, B=2, …); decode or encode a 4–5-letter word or compute the sum

**Proportional / rate reasoning**
- Mix "A pond doubles weekly. At week 10 it is full. When was it half full?" style puzzles with "Two pipes fill a tank in X and Y hours. How long together?" style ones — expressed as MCQ

## Quality Rules
- Every puzzle solvable from text alone; no diagram.
- One unique valid answer — no ambiguous rules.
- Distractors: the most tempting errors (false conversion, off-by-one, choosing the complement instead of the answer).
- Language: 10–11-year-old academic level; short, precise phrasing.
- For Venn problems: provide all three numbers (|A|, |B|, |A∩B|) and ask for "neither" or one of the exclusive sets.
- For coded problems: always state the code key in the prompt.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 5, Term 1. Return only the JSON array. No commentary.
