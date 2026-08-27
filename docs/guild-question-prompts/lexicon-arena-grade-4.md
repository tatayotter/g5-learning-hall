# Lexicon Arena — Grade 4 Question Generation Prompt

## Guild Mechanic
Students read a definition and pick the correctly spelled word from four options. The three wrong options must be plausible misspellings of the correct word — not random words.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "language": "English",
    "definition": "A narrative written in poetic form, often with rhyme and rhythm",
    "correct_spelling": "ballad",
    "wrong_a": "balad",
    "wrong_b": "ballard",
    "wrong_c": "baland"
  },
  {
    "language": "Filipino",
    "definition": "Ang uri ng tulang may sukat at tugma, karaniwang inawit",
    "correct_spelling": "kundiman",
    "wrong_a": "kondiman",
    "wrong_b": "kunduman",
    "wrong_c": "kundiман"
  }
]
```

**IMPORTANT:** `wrong_a`, `wrong_b`, `wrong_c` must ALL differ from `correct_spelling` AND from each other. Never use the `correct_spelling` itself as any wrong option.

- `language` must be exactly `"English"` or `"Filipino"`.
- `correct_spelling` — lowercase; the full correct spelling.

## Grade 4 Word Pool

**English words to draw from:**
- Literature terms: ballad, narrative, fiction, nonfiction, legend, myth, fable, folktale, biography, stanza, metaphor, simile, alliteration, personification, protagonist, antagonist
- Science (Matter, Force, Energy): molecule, evaporation, condensation, precipitation, dissolve, solution, mixture, gravity, friction, electricity, conductor, insulator, magnetism
- Araling Panlipunan (Philippine History): revolution, colonization, independence, resistance, heritage, civilization, democracy, republic, legislation, constitution
- Math terms: quotient, remainder, equivalent, improper, simplify, approximate, commutative, associative, distributive
- Health: nutrition, carbohydrates, protein, vitamins, minerals, sanitation, hygiene, immune, vaccine, disease

**Filipino words to draw from:**
- Pampanitikang salita: kundiman, alamat, dula, tula, salawikain, bugtong, epiko, kwentong-bayan, katangian, tauhan
- Agham at kalikasan: kapaligirang, pagbabago, tunog, liwanag, init, lakad, puwersa, magnetismo, paghaluin
- Kasaysayan at lipunan: kalayaan, pananakop, himagsikan, sibilisasyon, pamunuan, demokratiya, lehislatura
- Mga salitang may unlapi: pamamaraan, pagpapalaki, katayuan, karapatan, obligasyon, pakikiisa

## Misspelling Rules
1. Every wrong option must be something a G4 student might genuinely write.
2. No wrong option should accidentally be a real word.
3. For Filipino: plausible syllable confusions (ka↔ga, ng↔n, pa↔ba, hi↔i), dropped unstressed syllables, transposed adjacent vowels.
4. For English: -tion vs -sion, -ible vs -able, ie vs ei, dropped silent letters (kn-, wr-, -gh-), consonant doubling rules.
5. The hardest wrong options may combine two different errors.

## Balance
- Aim for roughly 55 % English / 45 % Filipino entries.

## Generation Instruction
Generate [N] Lexicon Arena entries for Grade 4, Term 1. Return only the JSON array. No commentary.
