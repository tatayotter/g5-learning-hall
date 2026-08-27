# Lexicon Arena — Grade 5 Question Generation Prompt

## Guild Mechanic
Students read a definition and pick the correctly spelled word from four options. The three wrong options must be plausible misspellings of the correct word — not random words.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "language": "English",
    "definition": "A figure of speech in which exaggeration is used for emphasis or effect",
    "correct_spelling": "hyperbole",
    "wrong_a": "hyperboly",
    "wrong_b": "hpyerbole",
    "wrong_c": "hyperbol"
  },
  {
    "language": "Filipino",
    "definition": "Ang pagpapahayag ng isang bagay sa pamamagitan ng hindi direktang salita o pahiwatig",
    "correct_spelling": "pahiwatig",
    "wrong_a": "pahiwateg",
    "wrong_b": "pahwatiq",
    "wrong_c": "pahiyatig"
  }
]
```

**IMPORTANT:** `wrong_a`, `wrong_b`, `wrong_c` must ALL differ from `correct_spelling` AND from each other. Never use the `correct_spelling` itself as any wrong option.

- `language` must be exactly `"English"` or `"Filipino"`.
- `correct_spelling` — lowercase; the full correct spelling.

## Grade 5 Word Pool

**English words to draw from:**
- Literary terms and figures of speech: hyperbole, metaphor, simile, personification, alliteration, onomatopoeia, imagery, symbolism, allegory, irony, protagonist, antagonist, flashback, foreshadowing, climax, denouement, soliloquy
- Science (Body systems, Ecosystems, Force): respiration, circulatory, digestive, excretory, reproductive, photosynthesis, chlorophyll, ecosystem, biodiversity, predator, decomposer, nitrogen cycle, gravitational, acceleration, velocity
- Philippine History and AP: colonization, revolution, declaration, independence, nationalism, resistance, sovereignty, legislation, constitution, referendum, amendment
- Math: circumference, perpendicular, parallelogram, trapezoid, probability, statistics, percentage, proportion, equivalent, inequality
- Technology and Media: algorithm, application, database, spreadsheet, presentation, multimedia, hyperlink, cybersecurity, digital, processor

**Filipino words to draw from:**
- Pampanitikan: pahiwatig, patalinghaga, personipikasyon, aliterasyon, onomatopeya, simbolismo, alehiya, tayutay, sukat, tugma
- Agham at kalikasan: photosynthesis → pagsisinag, kalupaan, kalikasan, pagbabago ng klima, biosipero, ekosistema, pagkakaiba-iba, organismo, metabolismo
- Kasaysayan at lipunan: kasarinlan, kalayaan, pananakop, himagsikan, pagbabago, konstitusyon, demokrasya, soberanya, pambansa, kilusan
- Mga damdaming nagpapalalim: pagmamahal, katapatan, sakripisyo, pagpapatawad, mithiin, determinasyon, pagbabago, adhikain

## Misspelling Rules
1. Wrong options must look like authentic G5 student errors — plausible, not absurd.
2. No wrong option may coincidentally spell a real word.
3. Greek/Latin root errors for English: swap ph↔f, drop silent letters, rearrange vowel clusters (oe↔eo, ae↔ea).
4. Filipino suffix/prefix errors: -an vs -in endings, dropped ligature (-ng vs -g), vowel length confusion (i vs e in closed syllables).
5. The hardest wrong options may combine two independent errors, but the result must still look word-like.
6. **Never repeat a `correct_spelling` value** — each entry must spell a unique word.

## Balance
- Aim for roughly 55 % English / 45 % Filipino entries.

## Generation Instruction
Generate [N] Lexicon Arena entries for Grade 5, Term 1. Return only the JSON array. No commentary.
