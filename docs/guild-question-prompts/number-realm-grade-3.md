# Number Realm — Grade 3 Question Generation Prompt

## Guild Mechanic
Students solve a math problem and type their answer using one of three layouts: `standard` (text box), `fraction` (numerator / denominator inputs), or `time` (HH:MM picker).

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "problem_prompt": "347 + 486 = ?",
    "expected_layout": "standard",
    "correct_standard_ans": "833",
    "difficulty_tier": 2
  },
  {
    "problem_prompt": "A rectangle is 8 cm long and 5 cm wide. What is its area?",
    "expected_layout": "standard",
    "correct_standard_ans": "40",
    "difficulty_tier": 2
  },
  {
    "problem_prompt": "1/3 + 1/3 = ?",
    "expected_layout": "fraction",
    "correct_numerator": 2,
    "correct_denominator": 3,
    "difficulty_tier": 1
  },
  {
    "problem_prompt": "School starts at 7:00 AM. Lunch is 2 hours and 30 minutes later. What time is lunch?",
    "expected_layout": "time",
    "correct_standard_ans": "9:30",
    "difficulty_tier": 3
  }
]
```

### Layout rules
| `expected_layout` | Required field(s) | Notes |
|---|---|---|
| `"standard"` | `correct_standard_ans` (string) | Numbers, money (₱), area in cm² or m², mass in g or kg |
| `"fraction"` | `correct_numerator` + `correct_denominator` (integers) | Always simplify |
| `"time"` | `correct_standard_ans` as `"H:MM"` | e.g., `"9:30"`, `"11:00"` |

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | Single-step; direct application of one skill (e.g., a single multiplication fact, simple fraction addition) |
| 2 | Two-step or moderate numbers; area/perimeter formula; multi-digit multiplication; word problems |
| 3 | Multi-step word problems; combining two skills; division with remainders; bar-graph reading + computation |

## Grade 3 Math Topics (DepEd BOW)

**Term 1 — Numbers, Area, Geometry**
- Numbers up to 10 000: place value, reading/writing, rounding (nearest 10, 100, 1 000), comparing/ordering
- Ordinal numbers up to 100th
- Area of squares and rectangles: using unit tiles; formula A = l × w (in cm² and m²)
- Geometry: points, lines, line segments, rays; parallel, intersecting, perpendicular lines

**Term 2 — Measurement, Operations, Statistics**
- Mass in grams, kilograms, milligrams; capacity in liters, milliliters
- Money: reading/writing Philippine currency up to ₱10 000
- Addition and subtraction of numbers up to 10 000 (with regrouping); estimation
- Bar graphs: constructing, interpreting, solving word problems from data
- Probability language: certain, impossible, likely, unlikely
- Multiplication: 6×, 7×, 8×, 9× tables; 2–4 digit × 1 digit (with regrouping); estimation of products

**Term 3 — Patterns, Division, Fractions, Symmetry**
- Number patterns (repeating, increasing, decreasing)
- Division as inverse of multiplication; 2–4 digit ÷ 1 digit; division with remainder
- Fractions: representing fractions ≥ 1; adding and subtracting **similar** fractions using models
- Line symmetry: identifying and drawing; completing symmetric figures

## Quality Rules
- Every `problem_prompt` must be self-contained.
- Money: use `₱` symbol.
- Area/perimeter problems: state the unit (cm², m²).
- For bar-graph problems: describe the graph data in the prompt text itself (no image reference).
- Fraction answers: always simplify (e.g., 4/8 → `1/2`).
- Time: `"H:MM"` format, no leading zero on hour.
- Filipino context for names and settings.
- Distribute layouts roughly: 65 % standard / 20 % fraction / 15 % time.

## Generation Instruction
Generate [N] Number Realm problems for Grade 3, Term 1. Distribute roughly 30 % tier 1 / 45 % tier 2 / 25 % tier 3. Return only the JSON array. No commentary.
