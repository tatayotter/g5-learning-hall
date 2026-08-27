# Logic Labyrinth — Grade 6 Question Generation Prompt

## Guild Mechanic
Students read a logic puzzle or pattern and pick one of four labelled options. All puzzles must be solvable from text alone — no images.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "puzzle_prompt_text": "A number is simultaneously divisible by 4, 6, and 9 and is less than 100. What is the largest such number?",
    "options_array": [
      { "id": "a", "label": "72"  },
      { "id": "b", "label": "84"  },
      { "id": "c", "label": "90"  },
      { "id": "d", "label": "96"  }
    ],
    "correct_option_id": "a"
  },
  {
    "puzzle_prompt_text": "All democracies hold elections. Country X holds elections. What can we conclude?",
    "options_array": [
      { "id": "a", "label": "Country X is definitely a democracy"          },
      { "id": "b", "label": "Country X is not a democracy"                 },
      { "id": "c", "label": "Country X may or may not be a democracy"      },
      { "id": "d", "label": "All countries that hold elections are free"   }
    ],
    "correct_option_id": "c"
  }
]
```

- `options_array`: exactly 4 items, ids `"a"`–`"d"`, all distinct.
- `correct_option_id`: matches one id.

## Grade 6 Puzzle Types

**Advanced sequences**
- Mix factorial-like (2, 6, 24, 120, __) and alternating-sign (+3, −1, +3, −1) sequences with n² − n, exponential-then-arithmetic, and fraction sequences (reciprocals of primes), plus the occasional second-differences-plus-ratio or nested pattern (each term is sum of previous two squared)

**Analogy (cross-domain, G6 curriculum)**
- Mix governance (bill : law :: hypothesis : theory) and science (atom : molecule :: cell : tissue) pairs with economics (supply : demand :: tax : revenue) and history (colonizer : resistance :: oppressor : ___?) ones, plus the occasional compound relation (photosynthesis : chloroplast :: respiration : mitochondria :: replication : ___?)

**Syllogistic and formal logic**
- Mix valid syllogisms and converse/inverse/contrapositive identification with affirming-the-consequent and denying-the-antecedent fallacies, plus the occasional puzzle asking which conclusion validly follows from 3 premises

**Multi-clue ordering and scheduling**
- Mix 5-person ordering with 4 clues with circular seating arrangements and grid logic with row-and-column constraints

**Set / Venn reasoning**
- Mix 2-set Venn with inclusion-exclusion with 3-set Venn (|A ∪ B ∪ C| = |A| + |B| + |C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|); find any element

**Number theory**
- Mix LCM applied to find when two events coincide and GCF applied to tiling/grouping problems with the occasional largest-number-divisible-by-multiple-divisors or prime-factorization-to-count-factors puzzle

**Probability and combinatorics (introductory)**
- "How many 2-item combinations can you choose from 5 distinct items?" expressed as MCQ

**Coded and cipher problems**
- Letter-to-number or shift-cipher; decode or encode; compute a sum or product from code values

## Quality Rules
- Every puzzle solvable from text alone.
- One unique valid answer; rule must be deterministic.
- For logic fallacy questions: the correct answer identifies whether the conclusion validly follows, not whether the premises are factually true.
- For Venn problems: state all known set sizes and intersections explicitly.
- For LCM/GCF puzzles: word the context (e.g., "two buses leave at intervals of X and Y minutes") rather than asking for bare LCM.
- Language: 11–12-year-old academic level; concise and unambiguous.
- Distractors: the most tempting errors (affirming the consequent, off-by-one in LCM, forgetting to subtract the intersection in Venn).

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 6, Term 1. Return only the JSON array. No commentary.
