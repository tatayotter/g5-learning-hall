# Lexicon Arena — Grade 2 Question Generation Prompt

## Guild Mechanic
Students read a definition and pick the correctly spelled word from four options. The three wrong options must be plausible misspellings of the correct word — not random words.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "language": "English",
    "definition": "A large animal that barks and is a loyal pet",
    "correct_spelling": "dog",
    "wrong_a": "dag",
    "wrong_b": "doge",
    "wrong_c": "dg"
  },
  {
    "language": "Filipino",
    "definition": "Ang tawag sa lugar kung saan nag-aaral ang mga bata",
    "correct_spelling": "paaralan",
    "wrong_a": "paarlan",
    "wrong_b": "palaran",
    "wrong_c": "panaralan"
  }
]
```

- `language` must be exactly `"English"` or `"Filipino"`.
- `correct_spelling` — lowercase; the full correct spelling.
- `wrong_a`, `wrong_b`, `wrong_c` — plausible misspellings; each must differ from `correct_spelling` AND from each other.

## Grade 2 Word Pool

**English words to draw from:**
- Everyday nouns (body parts, food, clothing, home items, animals): dog, cat, fish, bird, tree, leaf, root, stem, seed, cloud, rain, sun, moon, star
- Adjectives and color words: red, blue, green, happy, clean, bright, heavy, smooth, warm, cold, light
- Action verbs: run, jump, read, write, water, plant, carry, help, sleep, clean
- Science vocabulary: plant, root, stem, leaf, seed, water, cloud, rain, insect, mammal, solid, liquid
- Community words: school, church, market, doctor, police, farmer, family, teacher, nurse, street
- Numbers in words: one through ten; first through tenth

**Filipino words to draw from:**
- Mga pangngalan sa kalikasan: araw, buwan, ulap, ulan, tubig, bundok, ilog, dagat, puno, hayop, isda
- Mga pangngalan sa pamayanan: bahay, paaralan, simbahan, palengke, doktor, guro, pulis, magsasaka
- Mga panguri at pang-abay: masaya, malungkot, mabilis, mabagal, maliwanag, madilim, mainit, malamig
- Mga pagpapahalaga: magalang, mapagmahal, masipag, mapagbigay, tapat

## Misspelling Rules
1. Each wrong option must be a plausible misspelling — something a G2 student might actually write.
2. No wrong option should be another real word in the same language.
3. The four options (correct + 3 wrong) must all look superficially similar.
4. Common strategies: swap vowel (a↔e↔i), double a consonant incorrectly, drop a silent letter, transpose two letters.
5. Do NOT use homophone words as wrong options (too easy to rule out by meaning).

## Balance
- Aim for roughly 50 % English / 50 % Filipino entries.

## Generation Instruction
Generate [N] Lexicon Arena entries for Grade 2, Term 1. Return only the JSON array. No commentary.
