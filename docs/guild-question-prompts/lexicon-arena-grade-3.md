# Lexicon Arena — Grade 3 Question Generation Prompt

## Guild Mechanic
Students read a definition and pick the correctly spelled word from four options. The three wrong options must be plausible misspellings of the correct word — not random words.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "language": "English",
    "definition": "A type of weather with heavy rain and loud noise in the sky",
    "correct_spelling": "thunderstorm",
    "wrong_a": "thunderstrom",
    "wrong_b": "thundestorm",
    "wrong_c": "thunderstorm"
  },
  {
    "language": "Filipino",
    "definition": "Ang damdamin ng pagkalungkot dahil sa pagkawala ng isang mahal sa buhay",
    "correct_spelling": "kalungkutan",
    "wrong_a": "kalungktan",
    "wrong_b": "kalunkutan",
    "wrong_c": "kalungkotan"
  }
]
```

**IMPORTANT:** `wrong_a`, `wrong_b`, `wrong_c` must ALL differ from `correct_spelling` AND from each other. Never use the `correct_spelling` itself as any wrong option.

- `language` must be exactly `"English"` or `"Filipino"`.
- `correct_spelling` — lowercase; the full correct spelling.

## Grade 3 Word Pool

**English words to draw from:**
- Weather and environment: cloud, storm, thunder, lightning, rainbow, drought, flood, breeze
- Plants and animals (Science): mammal, reptile, insect, amphibian, habitat, ecosystem, predator, prey, camouflage
- Matter and energy: solid, liquid, gas, temperature, boiling, melting, freezing, heat, energy
- Community and governance: government, citizen, community, province, barangay, municipality, election
- Values and character: honest, generous, respectful, responsible, persevere, patience, courage
- Grammar terms: noun, verb, adjective, adverb, pronoun, conjunction, sentence, paragraph
- Math vocabulary: addition, subtraction, multiplication, division, fraction, numerator, denominator

**Filipino words to draw from:**
- Pangngalan sa kalikasan: langit, lupa, hangin, dagat, bundok, ilog, kagubatan, kalikasan
- Mga salitang pandama: malamig, mainit, maliwanag, madilim, mabaho, mabango, magaspang, makinis
- Mga damdamin: saya, lungkot, galit, takot, surpresa, pagmamahal, pighati, kalungkutan
- Pamayanan at lipunan: barangay, munisipyo, probinsya, lungsod, pagboto, lider, komunidad
- Mga salitang may unlapi at hulapi: pagkakataon, pamilya, pagkakaibigan, pagmamahal, katapatan

## Misspelling Rules
1. Each wrong option must look like something a G3 student might plausibly write.
2. No wrong option should accidentally spell a real word in the same language.
3. All four choices (correct + 3 wrong) should look visually similar at first glance.
4. Filipino misspellings: swap ng↔n, drop syllable, wrong vowel in unstressed syllable, transpose letters.
5. English misspellings: blend errors, silent-letter drops, double-consonant mistakes, wrong vowel team.

## Balance
- Aim for roughly 55 % English / 45 % Filipino entries.

## Generation Instruction
Generate [N] Lexicon Arena entries for Grade 3, Term 1. Return only the JSON array. No commentary.
