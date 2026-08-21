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
    "correct_option_id": "d",
    "difficulty_tier": 2
  },
  {
    "puzzle_prompt_text": "In a group of 30 students, 18 like Math and 15 like Science. 8 like both subjects. How many like neither?",
    "options_array": [
      { "id": "a", "label": "3" },
      { "id": "b", "label": "5" },
      { "id": "c", "label": "7" },
      { "id": "d", "label": "8" }
    ],
    "correct_option_id": "b",
    "difficulty_tier": 3
  }
]
```

- `options_array`: exactly 4 items, ids `"a"`–`"d"`, all distinct labels.
- `correct_option_id`: matches one id.
- `difficulty_tier`: `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | One clear step; well-known sequence (prime numbers, Fibonacci, perfect squares); simple analogy |
| 2 | Two-step reasoning; chain syllogism; 3–4 clue ordering; geometric-then-arithmetic mixed sequence; Venn with 2 sets |
| 3 | Multi-step deduction; complex Venn (inclusion-exclusion formula); coded-word problems; inverse reasoning; contrapositive; probability reasoning |

## Grade 5 Puzzle Types

**Number and fraction sequences**
- Tier 1: primes (2, 3, 5, 7, 11, 13, __); Fibonacci; perfect squares (1, 4, 9, 16, 25, __)
- Tier 2: ×2 then −1 alternating; triangular numbers (1, 3, 6, 10, 15, __); n² + 1; geometric ×3
- Tier 3: second-difference-constant sequences; fractional geometric sequences (1/2, 1/4, 1/8, __)

**Analogy (curriculum-connected)**
- Tier 1: science pairs (producer : ecosystem :: author : literature); historical pairs (Rizal : reform :: Bonifacio : revolution)
- Tier 2: abstract pairs (cause : effect :: evidence : conclusion); grammar pairs (noun : pronoun :: verb : auxiliary)
- Tier 3: multi-domain chains (cell : tissue :: letter : word :: word : ___?)

**Syllogistic / categorical reasoning**
- Tier 1: two-premise syllogism; valid → conclude; invalid → "cannot be determined"
- Tier 2: chain of three premises; negative syllogism (No A are B; X is A → X is not B)
- Tier 3: contrapositive reasoning; identifying the fallacy in an argument

**Multi-clue ordering and scheduling**
- Tier 2: 4-person ordering with 3 comparative + 1 negative clue
- Tier 3: scheduling (time slots, circular arrangements, graph-coloring described in text)

**Venn / set reasoning**
- Tier 2: 2-set Venn; find "both", "only A", "neither"
- Tier 3: inclusion-exclusion formula: |A ∪ B| = |A| + |B| − |A ∩ B|; find any unknown element

**Coded problems**
- Tier 3: letter-to-number codes (A=1, B=2, …); decode or encode a 4–5-letter word or compute the sum

**Proportional / rate reasoning**
- Tier 2: "A pond doubles weekly. At week 10 it is full. When was it half full?"
- Tier 3: "Two pipes fill a tank in X and Y hours. How long together?" — expressed as MCQ

## Quality Rules
- Every puzzle solvable from text alone; no diagram.
- One unique valid answer — no ambiguous rules.
- Distractors: the most tempting errors (false conversion, off-by-one, choosing the complement instead of the answer).
- Language: 10–11-year-old academic level; short, precise phrasing.
- For Venn problems: provide all three numbers (|A|, |B|, |A∩B|) and ask for "neither" or one of the exclusive sets.
- For coded problems: always state the code key in the prompt.

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 5, Term 1. Distribute roughly 25 % tier 1 / 40 % tier 2 / 35 % tier 3. Return only the JSON array. No commentary.
