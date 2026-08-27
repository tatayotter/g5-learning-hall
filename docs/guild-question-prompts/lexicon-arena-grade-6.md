# Lexicon Arena — Grade 6 Question Generation Prompt

## Guild Mechanic
Students read a definition and pick the correctly spelled word from four options. The three wrong options must be plausible misspellings of the correct word — not random words.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "language": "English",
    "definition": "The attribution of human characteristics to non-human entities in literature",
    "correct_spelling": "anthropomorphism",
    "wrong_a": "anthropmorphism",
    "wrong_b": "anthropomorphysm",
    "wrong_c": "anthopomorphism"
  },
  {
    "language": "Filipino",
    "definition": "Ang pag-aaral ng mga kaganapan sa lipunan at kultura ng tao",
    "correct_spelling": "anthropolohiya",
    "wrong_a": "anthropoloiya",
    "wrong_b": "antropolohiya",
    "wrong_c": "anthropolohia"
  }
]
```

**IMPORTANT:** `wrong_a`, `wrong_b`, `wrong_c` must ALL differ from `correct_spelling` AND from each other. Never use the `correct_spelling` itself as any wrong option.

- `language` must be exactly `"English"` or `"Filipino"`.
- `correct_spelling` — lowercase; the full correct spelling.

## Grade 6 Word Pool

**English words to draw from:**
- Advanced literary devices: anthropomorphism, onomatopoeia, soliloquy, dénouement, chiasmus, euphemism, periphrasis, synecdoche, apostrophe (literary), verisimilitude
- Science and environment: photosynthesis, chlorophyll, electromagnetic, thermodynamics, precipitation, biodegradable, conservation, deforestation, sustainable, renewable, atmosphere, stratosphere
- Philippine civics and law: sovereignty, legislation, constitutional, referendum, amendment, jurisdiction, ratification, promulgation, ordinance, proclamation, plebiscite, enactment
- Math and statistics: circumference, perpendicular, parallelogram, probability, coefficient, variable, inequality, equivalent, reciprocal, quadrilateral, polynomial
- Technology and digital literacy: algorithm, cybersecurity, encryption, artificial, intelligence, database, multimedia, accessibility, interoperability, bandwidth

**Filipino words to draw from:**
- Pampanitikan (advanced): anthropolohiya, onomatopeya, sinekdoke, apostrophe (pampanitikan), eufemismo, paradoks, simbulo, tayutay, alegorya, metapora
- Agham at kapaligiran: pagpapanatili, biodegradable, napapanatiling-kalikasan, electromagnetismo, stratosperyo, atmospera, pagbabago ng klima
- Pamahalaan at lipunan: soberanya, konstitusyon, plebisito, proklamasyon, ratipikasyon, promulgasyon, kapangyarihan, lehislatura, hudikatura, ehekutibo
- Ekonomiya: kapitalisasyon, globalisasyon, industriyalisasyon, ekonomiya, produksyon, distribusyon, konsumpsyon, pagkonsumo, pangangalakal

## Misspelling Rules
1. Wrong options must be plausible errors a grade 6 student could make — etymologically realistic.
2. No wrong option should spell a real word in the same language.
3. For long compound words: drop one syllable, swap a vowel cluster, or apply the wrong assimilation rule.
4. For Filipino: borrowings from English keep their Filipino-phonemic spelling (ph→p or f, c→k or s, v→b); wrong options may apply the wrong phonemic mapping.
5. The hardest wrong options may layer a root error with a suffix error, but the result must still look word-like.
6. **Never repeat a `correct_spelling` value** — each entry must spell a unique word.

## Balance
- Aim for roughly 55 % English / 45 % Filipino entries.

## Generation Instruction
Generate [N] Lexicon Arena entries for Grade 6, Term 1. Return only the JSON array. No commentary.
