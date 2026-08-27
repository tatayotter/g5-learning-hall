# SpellCaster — Grade 4 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "chemical" },
  { "word_string": "predator" },
  { "word_string": "atmosphere" }
]
```

- `word_string` — exact correct spelling, lowercase.

## Grade 4 Word Categories

- **Science**: physical, chemical, friction, gravity, conductor, insulator, predator, producer, decomposer, magnetic, evaporate, condensation, transparent, opaque
- **Math / Geometry**: quadrilateral, perimeter, rectangle, triangle, diagonal, parallel, perpendicular, estimate, decimal, fraction, equivalent, proportion
- **English / Literacy**: figurative, simile, metaphor, narrative, expository, inference, persuasive, adjective, conjunction, compound, subordinate, syllable
- **AP / Social Studies**: economic, producer, consumer, province, archipelago, peninsula, volcanic, colonial, community, national, cultural
- **General academic**: possible, describe, necessary, different, beginning, experiment, important, conclusion, organize, evaluate, sequence, temperature

## Quality Rules
- American English spelling.
- No proper nouns or abbreviations.
- Mix difficulty naturally: words students see constantly in G4 texts but frequently misspell, content-specific words with irregular or difficult spelling (doubled consonants, silent letters, vowel teams), and a few multi-syllable technical words that reward careful study.
- Avoid duplicating words from Grade 2 or Grade 3 pools.

## Generation Instruction
Generate [N] SpellCaster words for Grade 4, Term 1. Return only the JSON array. No commentary.
