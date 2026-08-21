# Number Realm — Grade 6 Question Generation Prompt

## Guild Mechanic
Students solve a math problem and type their answer using one of three layouts: `standard` (text box), `fraction` (numerator / denominator inputs), or `time` (HH:MM picker).

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "problem_prompt": "A shirt costs ₱500. After a 20% discount and then a further 10% discount on the sale price, what is the final price?",
    "expected_layout": "standard",
    "correct_standard_ans": "360",
    "difficulty_tier": 3
  },
  {
    "problem_prompt": "What is the circumference of a circle with radius 7 cm? Use π = 22/7.",
    "expected_layout": "standard",
    "correct_standard_ans": "44",
    "difficulty_tier": 2
  },
  {
    "problem_prompt": "Express 2³ × 3² as a single number.",
    "expected_layout": "standard",
    "correct_standard_ans": "72",
    "difficulty_tier": 2
  }
]
```

### Layout rules
| `expected_layout` | Required field(s) | Notes |
|---|---|---|
| `"standard"` | `correct_standard_ans` (string) | Decimals, integers, area (cm²), volume (cm³/L), GCF, LCM, percent, circumference |
| `"fraction"` | `correct_numerator` + `correct_denominator` | Simplify; use for ratio and proportion results expressed as fractions |
| `"time"` | `correct_standard_ans` as `"H:MM"` | Only for rate × time word problems |

## Difficulty Tiers

| Tier | Description |
|---|---|
| 1 | Single-step; direct formula application (GCF/LCM, circumference, simple percent, exponential value) |
| 2 | Two-step; moderate word problems; volume of prism/cube; composite area; ratio/proportion; percent increase/decrease |
| 3 | Multi-step; chained discounts; area of circle + composite; pie-graph computation; real-world rate problems; combined GCF/LCM with context |

## Grade 6 Math Topics (DepEd BOW)

**Term 1 — Decimals, Fractions, and Transformations**
- Adding and subtracting decimals up to 4 decimal places; mental × ÷ by 0.1, 0.01, 10, 100, 1 000
- Multiplying and dividing fractions, whole numbers, and mixed numbers in all combinations
- Multi-step word problems combining fractions, decimals, and whole numbers
- Geometric transformations: translation, reflection, rotation; tessellation with triangles, squares, rectangles

**Term 2 — Ratio, Proportion, Percent, and Exponents**
- Ratio (part-whole and part-part); equivalent ratios; expressing one number as a fraction of another
- Solving proportion problems (tables, double number line, cross-multiplication)
- Percent ↔ fraction ↔ decimal; finding percentage, rate, base; percent increase/decrease; discount; simple interest
- Exponential notation: writing repeated multiplication in exponential form; evaluating expressions; GEMDAS with exponents

**Term 3 — Measurement and Geometry (Volume, Area, Circles)**
- Volume of cubes and rectangular prisms; converting cm³ ↔ L
- Area of composite figures: triangles, squares, rectangles combined
- Circles: radius, diameter, chord, arc; circumference (C = πd = 2πr); π ≈ 3.14 or 22/7

**Term 4 — Circles (Area), Pie Graphs, GCF and LCM**
- Area of a circle (A = πr²); area of composite figures including circles and semi-circles; shaded regions
- Pie graphs: computing angles and percentages; constructing; interpreting and drawing conclusions
- GCF and LCM by listing, prime factorization, and continuous division; real-world problems

## Quality Rules
- All `problem_prompt` values must be self-contained — no diagram required.
- Clearly state the unit in the prompt (cm, m, cm², cm³, L, ₱, degrees).
- For circle problems: specify whether to use π = 3.14 or π = 22/7.
- Exponential problems: state the base and exponent clearly.
- Filipino context for word problems (₱, local names and settings).
- Fraction answers: always simplify.
- Distribute layouts roughly: 70 % standard / 25 % fraction / 5 % time.

## Generation Instruction
Generate [N] Number Realm problems for Grade 6, Term 1. Distribute roughly 20 % tier 1 / 45 % tier 2 / 35 % tier 3. Return only the JSON array. No commentary.
