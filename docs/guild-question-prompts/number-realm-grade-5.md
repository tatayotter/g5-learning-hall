# Number Realm — Grade 5 Question Generation Prompt

## Guild Mechanic
Students solve a math problem and type their answer using one of three layouts: `standard` (text box), `fraction` (numerator / denominator inputs), or `time` (HH:MM picker).

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "problem_prompt": "2/3 × 3/5 = ?",
    "expected_layout": "fraction",
    "correct_numerator": 2,
    "correct_denominator": 5
  },
  {
    "problem_prompt": "What is 15% of 360?",
    "expected_layout": "standard",
    "correct_standard_ans": "54"
  },
  {
    "problem_prompt": "A rectangular box is 8 cm long, 5 cm wide, and 4 cm tall. What is its volume?",
    "expected_layout": "standard",
    "correct_standard_ans": "160"
  }
]
```

### Layout rules
| `expected_layout` | Required field(s) | Notes |
|---|---|---|
| `"standard"` | `correct_standard_ans` (string) | Decimals, percentages, area (cm²), volume (cm³), GCF, LCM, mean, n in simple equations |
| `"fraction"` | `correct_numerator` + `correct_denominator` | Always simplify; improper fractions acceptable |
| `"time"` | `correct_standard_ans` as `"H:MM"` | Rare; only for rate/time word problems |

## Grade 5 Math Topics (DepEd BOW)

**Fractions**
- Adding and subtracting fractions (similar and dissimilar) and mixed numbers
- Multiplying fractions × fractions, fractions × whole numbers, mixed numbers × fractions
- Dividing fractions by fractions; dividing fractions by whole numbers
- Multi-step word problems involving fractions

**Decimals and Percent**
- Multiplying and dividing decimals; mental math with powers of 10 (× / ÷ by 0.1, 0.01, 10, 100)
- Expressing decimals as fractions and vice versa; percent ↔ decimal ↔ fraction conversions
- Calculating percentage: finding what percent, finding the base, finding the rate
- Discount, sale price, simple interest (introductory)

**Ratio and Proportion**
- Expressing and simplifying ratios; equivalent ratios; ratio as fraction
- Solving proportion problems using tables and cross-multiplication

**Geometry — Area**
- Area of triangles, parallelograms, trapezoids using formulas
- Area of composite figures (combinations of rectangles and triangles)

**Volume**
- Volume of cubes and rectangular prisms (V = l × w × h)
- Converting cubic centimeters to liters

**Statistics**
- Mean, median, mode, range of a data set
- Constructing and interpreting simple bar and line graphs

**Number Theory**
- GCF and LCM of 2–3 numbers (by listing and prime factorization)
- Prime and composite numbers; prime factorization

**Algebra (Intro)**
- Simple one-variable equations: n + a = b, an = b, n ÷ a = b

## Quality Rules
- All `problem_prompt` values must be self-contained.
- State units: cm² for area, cm³ for volume, ₱ for money.
- For fraction problems: always specify the exact operation (e.g., "2/3 × 3/5 = ?").
- Percentage: always specify what you're finding ("What is 15% of 360?", NOT "Find the percentage").
- Volume unit: cm³ or state the unit in the prompt.
- Filipino names and settings for word problems.
- Fraction answers: simplify completely (e.g., 6/10 → `3/5`).
- Distribute layouts roughly: 60 % standard / 35 % fraction / 5 % time.

## Generation Instruction
Generate [N] Number Realm problems for Grade 5, Term 1. Return only the JSON array. No commentary.
