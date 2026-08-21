# SpellCaster — Grade 3 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "village",   "difficulty_tier": 1 },
  { "word_string": "mixture",   "difficulty_tier": 2 },
  { "word_string": "paragraph", "difficulty_tier": 3 }
]
```

- `word_string` — exact correct spelling, lowercase, no punctuation.
- `difficulty_tier` — `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Pattern | Examples |
|---|---|---|
| 1 | 5–7 letters; common vocabulary a G3 student reads regularly | bridge, useful, people, follow, answer |
| 2 | 6–8 letters; content-area vocabulary; common silent letters or doubled consonants | science, special, drawing, weather, correct |
| 3 | 8–11 letters; academic or cross-subject terms a strong G3 student should master | community, paragraph, properties, adventure, irregular |

## Grade 3 Word Categories

- **Science**: matter, liquid, solid, mixture, habitat, weather, gravity, surface, mineral, creature, predator
- **Math / cross-subject**: pattern, measure, equal, similar, problem, solution, hundred, thousand
- **English / literacy**: passage, fiction, describe, synonym, pronoun, compare, contrast, summarize, sequence
- **AP / Social Studies**: history, barangay, province, culture, freedom, justice, citizen, symbol, harvest
- **General academic**: correct, special, example, between, because, different, complete, together, interest
- **Common problem spellings for G3**: friend, people, always, where, should, through, thought, enough

## Quality Rules
- American English spelling (DepEd standard).
- No proper nouns, abbreviations, or hyphenated words.
- Tier 1 words: students encounter these in everyday reading; misspellings are common (silent letters, doubled letters).
- Tier 2 words: content-area vocabulary from G3 subjects; slightly irregular spelling patterns.
- Tier 3 words: multi-syllable academic words; students may know the meaning but struggle to spell them.
- Avoid duplicating words already in the Grade 2 pool.

## Generation Instruction
Generate [N] SpellCaster words for Grade 3, Term 1. Distribute roughly 35 % tier 1 / 40 % tier 2 / 25 % tier 3. Return only the JSON array. No commentary.
