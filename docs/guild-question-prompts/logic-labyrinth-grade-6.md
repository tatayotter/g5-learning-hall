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
    "correct_option_id": "a",
    "difficulty_tier": 3
  },
  {
    "puzzle_prompt_text": "All democracies hold elections. Country X holds elections. What can we conclude?",
    "options_array": [
      { "id": "a", "label": "Country X is definitely a democracy"          },
      { "id": "b", "label": "Country X is not a democracy"                 },
      { "id": "c", "label": "Country X may or may not be a democracy"      },
      { "id": "d", "label": "All countries that hold elections are free"   }
    ],
    "correct_option_id": "c",
    "difficulty_tier": 3
  }
]
```

- `options_array`: exactly 4 items, ids `"a"`–`"d"`, all distinct.
- `correct_option_id`: matches one id.
- `difficulty_tier`: `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | Single step; well-known sequence or direct analogy; basic categorical syllogism |
| 2 | Two-step reasoning; 4-clue ordering; complex analogy; Venn with 2 sets; exponential patterns |
| 3 | Multi-step; contrapositive and logical fallacies; 3-set Venn; LCM-based reasoning; probability; scheduling |

## Grade 6 Puzzle Types

**Advanced sequences**
- Tier 1: factorial-like (2, 6, 24, 120, __); alternating signs (+3, −1, +3, −1)
- Tier 2: n² − n; exponential then arithmetic; fraction sequences (reciprocals of primes)
- Tier 3: second differences + ratio; nested patterns (each term is sum of previous two squared)

**Analogy (cross-domain, G6 curriculum)**
- Tier 1: governance (bill : law :: hypothesis : theory); science (atom : molecule :: cell : tissue)
- Tier 2: economics (supply : demand :: tax : revenue); history (colonizer : resistance :: oppressor : ___?)
- Tier 3: compound relations (photosynthesis : chloroplast :: respiration : mitochondria :: replication : ___?)

**Syllogistic and formal logic**
- Tier 2: valid syllogisms; identifying the converse, inverse, contrapositive
- Tier 3: affirming the consequent (fallacy); denying the antecedent (fallacy); identifying which conclusion validly follows from 3 premises

**Multi-clue ordering and scheduling**
- Tier 2: 5-person ordering with 4 clues
- Tier 3: circular seating arrangements; grid logic with row-and-column constraints

**Set / Venn reasoning**
- Tier 2: 2-set Venn with inclusion-exclusion
- Tier 3: 3-set Venn (|A ∪ B ∪ C| = |A| + |B| + |C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|); find any element

**Number theory**
- Tier 2: LCM applied to find when two events coincide; GCF applied to tiling/grouping problems
- Tier 3: largest number divisible by multiple divisors within a range; prime factorization to count factors

**Probability and combinatorics (introductory)**
- Tier 3: "How many 2-item combinations can you choose from 5 distinct items?" expressed as MCQ

**Coded and cipher problems**
- Tier 3: letter-to-number or shift-cipher; decode or encode; compute a sum or product from code values

## Quality Rules
- Every puzzle solvable from text alone.
- One unique valid answer; rule must be deterministic.
- For logic fallacy questions: the correct answer identifies whether the conclusion validly follows, not whether the premises are factually true.
- For Venn problems: state all known set sizes and intersections explicitly.
- For LCM/GCF puzzles: word the context (e.g., "two buses leave at intervals of X and Y minutes") rather than asking for bare LCM.
- Language: 11–12-year-old academic level; concise and unambiguous.
- Distractors: the most tempting errors (affirming the consequent, off-by-one in LCM, forgetting to subtract the intersection in Venn).

## Generation Instruction
Generate [N] Logic Labyrinth puzzles for Grade 6, Term 1. Distribute roughly 20 % tier 1 / 40 % tier 2 / 40 % tier 3. Return only the JSON array. No commentary.
