# SpellCaster — Grade 2 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling. Questions are just word entries — no passage or choices needed.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "happy",  "difficulty_tier": 1 },
  { "word_string": "plant",  "difficulty_tier": 2 },
  { "word_string": "school", "difficulty_tier": 3 }
]
```

- `word_string` — the exact correct spelling, lowercase, no punctuation.
- `difficulty_tier` — `1`, `2`, or `3`.
- No duplicates with existing words in the pool (check the DB before importing).

## Difficulty Tiers

| Tier | Pattern | Examples |
|---|---|---|
| 1 | 3–4 letters; simple CVC / CVCC; high-frequency sight words | cat, dog, run, bed, hot, map |
| 2 | 5–6 letters; common vocabulary; simple blends / digraphs | apple, happy, water, night, chair |
| 3 | 6–8 letters; less common but curriculum-level words | school, flower, market, animal, summer |

## Grade 2 Word Categories

Draw words from these areas — prefer words students encounter in their G2 subjects:

- **Everyday nouns**: body parts, household items, food, clothing, animals, nature
- **Science vocabulary**: plant, root, stem, leaf, seed, water, cloud, rain, insect, mammal
- **Action words (verbs)**: jump, read, write, clean, water, plant, carry, help
- **Descriptive words (adjectives)**: happy, clean, bright, heavy, smooth, rough, warm, cold
- **Community / AP**: school, market, church, police, doctor, farmer, family, barangay
- **Filipino-origin English loanwords common in G2**: barong, jeepney, fiesta (if clearly English-used)

## Quality Rules
- All words must be correctly spelled standard English (British or American — be consistent, prefer American as it matches DepEd English).
- Tier 1: phonetically transparent, 3–4 letters, basic CVC or sight words.
- Tier 2: 5–6 letters; students should know these from reading but may misspell them.
- Tier 3: 6–8 letters; above average for G2 but reachable with study.
- No proper nouns, abbreviations, or hyphenated words.
- Avoid words that are identical to Filipino words with different meanings (e.g., "sala").

## Generation Instruction
Generate [N] SpellCaster words for Grade 2, Term 1. Distribute roughly 40 % tier 1 / 40 % tier 2 / 20 % tier 3. Return only the JSON array. No commentary.
