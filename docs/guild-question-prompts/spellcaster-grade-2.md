# SpellCaster — Grade 2 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling. Questions are just word entries — no passage or choices needed.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "happy" },
  { "word_string": "plant" },
  { "word_string": "school" }
]
```

- `word_string` — the exact correct spelling, lowercase, no punctuation.
- No duplicates with existing words in the pool (check the DB before importing).

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
- Mix word lengths and difficulty naturally: phonetically transparent 3–4 letter CVC/sight words, common 5–6 letter vocabulary students may still misspell, and a few 6–8 letter words that are above average for G2 but reachable with study.
- No proper nouns, abbreviations, or hyphenated words.
- Avoid words that are identical to Filipino words with different meanings (e.g., "sala").

## Generation Instruction
Generate [N] SpellCaster words for Grade 2, Term 1. Return only the JSON array. No commentary.
