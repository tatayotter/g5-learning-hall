# SpellCaster — Grade 5 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "necessary" },
  { "word_string": "environment" },
  { "word_string": "photosynthesis" }
]
```

- `word_string` — exact correct spelling, lowercase.

## Grade 5 Word Categories

- **Science**: ecosystem, organism, biodiversity, chlorophyll, mitochondria, photosynthesis, metamorphosis, condensation, decomposer, carnivore, herbivore, omnivore, electromagnetic
- **History / AP**: colonization, encomienda, revolution, propaganda, ilustrado, independence, archipelago, colonizer, resistance, nationalism
- **English / Literary**: figurative, personification, alliteration, onomatopoeia, antagonist, protagonist, symbolism, persuasive, connotation, denotation, allegory
- **Math**: equivalent, approximate, percentage, denominator, numerator, proportion, circumference, perimeter, trajectory
- **General academic**: circumstances, particularly, simultaneously, significantly, approximately, accomplishment, responsibility, opportunity, consciousness, deterioration

## Quality Rules
- American English spelling.
- No proper nouns or abbreviations.
- Mix difficulty naturally: words students should already know how to spell but commonly get wrong (i-before-e rules, double letters, silent letters), content vocabulary from G5 subjects with genuine spelling challenges, and a few long technical words that need syllable-by-syllable knowledge to spell correctly.
- Avoid duplicating any word from the Grade 2, 3, or 4 pools.
- Do NOT include words with accented characters (the input field is plain text).

## Generation Instruction
Generate [N] SpellCaster words for Grade 5, Term 1. Return only the JSON array. No commentary.
