# SpellCaster — Grade 6 Question Generation Prompt

## Guild Mechanic
A word is read aloud (or shown in a sentence) and the student types the correct spelling.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  { "word_string": "legislation" },
  { "word_string": "biodiversity" },
  { "word_string": "electromagnetic" }
]
```

- `word_string` — exact correct spelling, lowercase.

## Grade 6 Word Categories

- **Science**: biodiversity, photosynthesis, electromagnetic, tectonic, seismograph, lithosphere, chromosome, reproduction, electromagnet, conductivity, insulation, classification
- **History / Governance / AP**: civilization, colonization, legislation, independence, parliamentary, sovereignty, revolution, constitution, commonwealth, industrialization, exploitation
- **English / Literary**: juxtaposition, characterization, personification, connotation, denotation, juxtaposition, argumentation, bibliography, interpretation, corroboration
- **Math / Statistics**: circumference, quadrilateral, exponential, proportional, tessellation, statistical, probability, denominator, perpendicular
- **General academic high-frequency**: approximately, circumstances, considerable, simultaneously, fundamental, extraordinary, consciousness, acknowledgment, predominantly, deterioration

## Quality Rules
- American English spelling.
- No proper nouns or abbreviations.
- Mix difficulty naturally: words students should be able to spell after Grade 5 but still commonly miss, grade-level academic vocabulary requiring confident multi-syllable spelling, and a few of the longest, most challenging words that reward mastery of syllable-level spelling strategies.
- Avoid words already in Grades 2–5 pools.
- No accented characters; plain ASCII only.

## Generation Instruction
Generate [N] SpellCaster words for Grade 6, Term 1. Return only the JSON array. No commentary.
