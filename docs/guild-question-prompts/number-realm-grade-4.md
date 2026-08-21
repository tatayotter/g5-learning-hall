# Number Realm — Grade 4 Question Generation Prompt

## Guild Mechanic
Students solve a math problem and type their answer using one of three layouts: `standard` (text box), `fraction` (numerator / denominator inputs), or `time` (HH:MM picker).

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "problem_prompt": "What is 3/4 + 5/8?",
    "expected_layout": "fraction",
    "correct_numerator": 11,
    "correct_denominator": 8,
    "difficulty_tier": 3
  },
  {
    "problem_prompt": "A rectangle has a perimeter of 36 cm and a width of 7 cm. What is its length?",
    "expected_layout": "standard",
    "correct_standard_ans": "11",
    "difficulty_tier": 3
  },
  {
    "problem_prompt": "Express 3/4 as a decimal.",
    "expected_layout": "standard",
    "correct_standard_ans": "0.75",
    "difficulty_tier": 2
  }
]
```

### Layout rules
| `expected_layout` | Required field(s) | Notes |
|---|---|---|
| `"standard"` | `correct_standard_ans` (string) | Numbers, decimals, money, area in cm²/m², angle in degrees |
| `"fraction"` | `correct_numerator` + `correct_denominator` | Simplify when possible; improper fractions OK for G4 |
| `"time"` | `correct_standard_ans` as `"H:MM"` | Use sparingly — only for elapsed-time problems |

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | Single-step; direct formula or fact (e.g., finding area of a rectangle, converting a fraction to decimal with a denominator of 10 or 100) |
| 2 | Two-step; moderate numbers; finding equivalent fractions; add/subtract dissimilar fractions with simple LCDs; reading angles; simple word problems |
| 3 | Multi-step word problems; combining two skills (e.g., fraction + area); unlike fractions with larger LCDs; working backwards from perimeter/area |

## Grade 4 Math Topics (DepEd BOW)

**Term 1 — Numbers up to 1 000 000 & Multiplication**
- Reading, writing, place value of numbers up to 1 000 000; rounding to nearest 10 000 and 100 000
- Comparing and ordering large numbers; composing/decomposing by place value
- Adding and subtracting up to 1 000 000 with regrouping; estimation
- Multiplying multi-digit numbers by 1- and 2-digit numbers (distributive property, regrouping)
- Multi-step word problems with addition, subtraction, and multiplication; money contexts

**Term 2 — Fractions**
- Proper fractions, improper fractions, mixed numbers — visualizing, converting
- Equivalent fractions; reducing to lowest terms; comparing and ordering unlike fractions
- Adding and subtracting similar fractions; adding and subtracting dissimilar fractions
- Adding and subtracting mixed numbers; solving word problems

**Term 3 — Geometry: Angles and Quadrilaterals**
- Angles: right, acute, obtuse; measuring and drawing angles with a protractor
- Classifying quadrilaterals: square, rectangle, parallelogram, trapezoid, rhombus
- Perimeter and area of rectangles and squares; solving word problems
- Lines of symmetry in quadrilaterals and plane figures

**Term 4 — Decimals and Data**
- Decimals to hundredths; relating to fractions (denominator 10 and 100)
- Comparing and ordering decimals; adding and subtracting decimals
- Single line graphs: reading, constructing, interpreting

## Quality Rules
- Every `problem_prompt` must be self-contained — no external diagram needed.
- State units clearly in the prompt (cm, m, cm², m², degrees).
- For angle problems: describe the angle type in text ("An acute angle measures ___ degrees").
- Fraction simplification: keep improper fractions when that is the natural result (e.g., 11/8 is fine at G4).
- Philippine contexts for word problems (₱, local names, local settings).
- Distribute layouts roughly: 65 % standard / 30 % fraction / 5 % time.

## Generation Instruction
Generate [N] Number Realm problems for Grade 4, Term 1. Distribute roughly 25 % tier 1 / 45 % tier 2 / 30 % tier 3. Return only the JSON array. No commentary.
