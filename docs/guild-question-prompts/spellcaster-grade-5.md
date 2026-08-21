# SpellCaster — Grade 5 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "necessary",      "difficulty_tier": 1 },
  { "word_string": "environment",    "difficulty_tier": 2 },
  { "word_string": "photosynthesis", "difficulty_tier": 3 }
]
```

- `word_string` — exact correct spelling, lowercase.
- `difficulty_tier` — `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Pattern | Examples |
|---|---|---|
| 1 | 7–9 letters; academic words students encounter often but frequently misspell | believe, receive, practice, separate, describe |
| 2 | 9–12 letters; subject-specific vocabulary with irregular patterns | necessary, pollution, discovery, character, privilege |
| 3 | 11–16 letters; advanced multi-syllable scientific, historical, or literary terms | photosynthesis, metamorphosis, circumstances, electromagnetic, independence |

## Grade 5 Word Categories

- **Science**: ecosystem, organism, biodiversity, chlorophyll, mitochondria, photosynthesis, metamorphosis, condensation, decomposer, carnivore, herbivore, omnivore, electromagnetic
- **History / AP**: colonization, encomienda, revolution, propaganda, ilustrado, independence, archipelago, colonizer, resistance, nationalism
- **English / Literary**: figurative, personification, alliteration, onomatopoeia, antagonist, protagonist, symbolism, persuasive, connotation, denotation, allegory
- **Math**: equivalent, approximate, percentage, denominator, numerator, proportion, circumference, perimeter, trajectory
- **General academic**: circumstances, particularly, simultaneously, significantly, approximately, accomplishment, responsibility, opportunity, consciousness, deterioration

## Quality Rules
- American English spelling.
- No proper nouns or abbreviations.
- Tier 1: words students should already know how to spell but commonly get wrong (i-before-e rules, double letters, silent letters).
- Tier 2: content vocabulary from G5 subjects with genuine spelling challenges.
- Tier 3: long technical words — correct spelling requires syllable-by-syllable knowledge.
- Avoid duplicating any word from the Grade 2, 3, or 4 pools.
- Do NOT include words with accented characters (the input field is plain text).

## Generation Instruction
Generate [N] SpellCaster words for Grade 5, Term 1. Distribute roughly 30 % tier 1 / 35 % tier 2 / 35 % tier 3. Return only the JSON array. No commentary.
