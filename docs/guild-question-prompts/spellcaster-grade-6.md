# SpellCaster — Grade 6 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "legislation",   "difficulty_tier": 1 },
  { "word_string": "biodiversity",  "difficulty_tier": 2 },
  { "word_string": "electromagnetic", "difficulty_tier": 3 }
]
```

- `word_string` — exact correct spelling, lowercase.
- `difficulty_tier` — `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Pattern | Examples |
|---|---|---|
| 1 | 8–10 letters; academic-level words G6 students read regularly | argument, beginning, committee, guarantee, occurring |
| 2 | 10–13 letters; content-specific multi-syllable terms | biodiversity, civilization, legislature, independent, photosynthesis |
| 3 | 13–18 letters; advanced scientific, legal, or literary vocabulary | electromagnetic, juxtaposition, parliamentary, classification, anthropological |

## Grade 6 Word Categories

- **Science**: biodiversity, photosynthesis, electromagnetic, tectonic, seismograph, lithosphere, chromosome, reproduction, electromagnet, conductivity, insulation, classification
- **History / Governance / AP**: civilization, colonization, legislation, independence, parliamentary, sovereignty, revolution, constitution, commonwealth, industrialization, exploitation
- **English / Literary**: juxtaposition, characterization, personification, connotation, denotation, juxtaposition, argumentation, bibliography, interpretation, corroboration
- **Math / Statistics**: circumference, quadrilateral, exponential, proportional, tessellation, statistical, probability, denominator, perpendicular
- **General academic high-frequency**: approximately, circumstances, considerable, simultaneously, fundamental, extraordinary, consciousness, acknowledgment, predominantly, deterioration

## Quality Rules
- American English spelling.
- No proper nouns or abbreviations.
- Tier 1: words students should be able to spell after Grade 5 but still commonly miss at grade 6.
- Tier 2: grade-level academic vocabulary requiring confident multi-syllable spelling.
- Tier 3: longest, most challenging words; reward mastery of syllable-level spelling strategies.
- Avoid words already in Grades 2–5 pools.
- No accented characters; plain ASCII only.

## Generation Instruction
Generate [N] SpellCaster words for Grade 6, Term 1. Distribute roughly 25 % tier 1 / 35 % tier 2 / 40 % tier 3. Return only the JSON array. No commentary.
