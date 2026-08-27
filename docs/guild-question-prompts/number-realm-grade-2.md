# Number Realm — Grade 2 Question Generation Prompt

## Guild Mechanic
Students solve a math problem and type their answer. Three answer layouts exist: `standard` (a text box), `fraction` (separate numerator / denominator inputs), and `time` (HH:MM picker).

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "problem_prompt": "5 + 8 = ?",
    "expected_layout": "standard",
    "correct_standard_ans": "13"
  },
  {
    "problem_prompt": "1/4 + 1/4 = ?",
    "expected_layout": "fraction",
    "correct_numerator": 1,
    "correct_denominator": 2
  },
  {
    "problem_prompt": "What time is half past 6?",
    "expected_layout": "time",
    "correct_standard_ans": "6:30"
  }
]
```

### Layout rules
| `expected_layout` | Required answer field(s) | Notes |
|---|---|---|
| `"standard"` | `correct_standard_ans` (string) | Numbers, money (₱25), days, etc. |
| `"fraction"` | `correct_numerator` (integer) + `correct_denominator` (integer) | Store in **simplified** form (e.g., 2/4 → 1/2) |
| `"time"` | `correct_standard_ans` in `"H:MM"` format | e.g., `"3:00"`, `"6:30"`, `"9:15"` |

## Grade 2 Math Topics (DepEd Term 1)

**Numbers (1–1 000)**
- Reading, writing, place value of 2–3 digit numbers
- Comparing and ordering numbers; rounding to nearest ten/hundred
- Odd and even numbers; skip counting (2s, 5s, 10s)

**Operations**
- Addition and subtraction within 1 000 (with and without regrouping)
- Introduction to multiplication: 2×, 5×, 10× tables; equal groups model
- Simple division as sharing (introductory)
- Money problems in Philippine pesos (₱) — adding and subtracting amounts

**Geometry**
- 2D shapes: sides and corners of triangles, squares, rectangles, circles
- Perimeter of rectangles and squares (counting unit sides)

**Measurement & Time**
- Reading clock: o'clock, half past, quarter past, quarter to
- Elapsed time problems (whole-hour increments)
- Length in cm and m (measuring and comparing)

**Fractions**
- Concept of equal parts; fractions ½, ⅓, ¼ using models
- Adding and subtracting like fractions with denominators 2, 3, 4

## Quality Rules
- Every `problem_prompt` must be self-contained — no external diagram reference.
- Use `₱` symbol for money problems.
- Time answers: always `"H:MM"` (no leading zero for hours: `"9:15"` not `"09:15"`).
- Fraction answers: always simplify (2/4 → `correct_numerator: 1, correct_denominator: 2`).
- Word problems: keep context Filipino and relatable (names: Ana, Juan, Lito, Maria; settings: school, market, garden).
- Avoid calculator-needed numbers; all answers should be reachable mentally or with simple paper work.
- Distribute layouts roughly: 60 % standard / 20 % fraction / 20 % time.

## Generation Instruction
Generate [N] Number Realm problems for Grade 2, Term 1. Return only the JSON array. No commentary.
