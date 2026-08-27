# SpellCaster — Grade 3 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "village" },
  { "word_string": "mixture" },
  { "word_string": "paragraph" }
]
```

- `word_string` — exact correct spelling, lowercase, no punctuation.

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
- Mix difficulty naturally: everyday-reading words with common misspellings (silent letters, doubled letters), content-area vocabulary from G3 subjects with slightly irregular spelling, and a few multi-syllable academic words students may know the meaning of but struggle to spell.
- Avoid duplicating words already in the Grade 2 pool.

## Generation Instruction
Generate [N] SpellCaster words for Grade 3, Term 1. Return only the JSON array. No commentary.
