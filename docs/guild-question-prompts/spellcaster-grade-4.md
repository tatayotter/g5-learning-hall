# SpellCaster — Grade 4 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "chemical",    "difficulty_tier": 1 },
  { "word_string": "predator",    "difficulty_tier": 2 },
  { "word_string": "atmosphere",  "difficulty_tier": 3 }
]
```

- `word_string` — exact correct spelling, lowercase.
- `difficulty_tier` — `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Pattern | Examples |
|---|---|---|
| 1 | 6–8 letters; high-frequency academic words a G4 student reads regularly | science, because, special, surface, climate |
| 2 | 7–10 letters; content-area vocabulary; non-obvious spelling patterns | physical, solution, organism, material, evidence |
| 3 | 9–13 letters; multi-syllable academic or cross-subject terms | atmosphere, electrical, ecosystem, quadrilateral, transparent |

## Grade 4 Word Categories

- **Science**: physical, chemical, friction, gravity, conductor, insulator, predator, producer, decomposer, magnetic, evaporate, condensation, transparent, opaque
- **Math / Geometry**: quadrilateral, perimeter, rectangle, triangle, diagonal, parallel, perpendicular, estimate, decimal, fraction, equivalent, proportion
- **English / Literacy**: figurative, simile, metaphor, narrative, expository, inference, persuasive, adjective, conjunction, compound, subordinate, syllable
- **AP / Social Studies**: economic, producer, consumer, province, archipelago, peninsula, volcanic, colonial, community, national, cultural
- **General academic**: possible, describe, necessary, different, beginning, experiment, important, conclusion, organize, evaluate, sequence, temperature

## Quality Rules
- American English spelling.
- No proper nouns or abbreviations.
- Tier 1: words students see constantly in G4 texts but frequently misspell.
- Tier 2: content-specific words with irregular or difficult spelling (doubled consonants, silent letters, vowel teams).
- Tier 3: multi-syllable technical vocabulary that rewards careful study.
- Avoid duplicating words from Grade 2 or Grade 3 pools.

## Generation Instruction
Generate [N] SpellCaster words for Grade 4, Term 1. Distribute roughly 30 % tier 1 / 40 % tier 2 / 30 % tier 3. Return only the JSON array. No commentary.
