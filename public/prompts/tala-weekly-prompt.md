# TALA — Weekly Package Generation Prompt
## Grade 2 | G5 Learning Hall

---

## HOW TO USE THIS PROMPT

1. Find the current school week number (e.g. Term 1 Week 5)
2. Look up the matching week in the BOW reference below
3. Fill in the `[DATE]`, `[WEEK NUMBER]`, and `[SUBJECTS]` placeholders
4. Paste the completed prompt into Claude, ChatGPT, or Gemini
5. Copy the JSON output into the Weekly Package Builder in Admin → Save for Tala

---

## THE PROMPT

```
You are a curriculum assistant for a Filipino Grade 2 learner named Tala (age 7-8).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Term [X] Week [X].

OUTPUT RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Top-level keys are day names: Monday, Tuesday, Wednesday, Thursday, Friday
- Each day has subject keys (e.g. "English", "Mathematics", "Filipino")
- Each subject has exactly two fields: "summary_markdown" and "quiz"
- summary_markdown: a rich markdown lesson note written in simple, friendly language for a 7-8 year old. Include:
  * Short clear bullet points explaining the topic simply
  * At least 2 concrete examples with easy-to-follow explanations
    (e.g. "Example: 'Tala' is a proper noun because it is a name of a specific person!")
  * Key words highlighted in bold
  * Use encouraging tone — this is a young learner
  * NO "Tomorrow's Sneak Peek" section
- quiz: an array of 8 questions, each with:
  * "question" — clear, simple wording appropriate for Grade 2
  * "options" — array of 3-4 strings
  * "correct_answer" — must exactly match one of the option strings
- Quiz questions should be straightforward recall and simple application
- Friday is always "Weekly Review" covering all subjects from Mon-Thu

GRADE LEVEL: 2
LANGUAGE: English for English subject | Filipino for Filipino, GMRC, MAKABANSA subjects | English for Mathematics

SUBJECTS AND TOPICS FOR THIS WEEK (from BOW):
[PASTE THE WEEK'S SUBJECTS AND COMPETENCIES HERE — see BOW reference below]

Generate the full JSON now.
```

---

## BOW REFERENCE — TALA GRADE 2

Use this to fill in the `SUBJECTS AND TOPICS` section above each Sunday.

---

### ENGLISH (Grade 2)

**Term 1 — Oneself and Family**
- Week 1–3: Phonological awareness (rhymes, onset/rime), CVC words, sight words; Common & proper nouns, gender of nouns; Narrative text elements (characters, setting, events)
- Week 4–6: Verbs (action words), adjectives (describing words), personal pronouns; Telling & asking sentences (declarative & interrogative); Sequence events, problem & solution in stories
- Week 7–9: Capitalization & punctuation for declarative & interrogative sentences; Time order discourse markers; Informational text — noting details, text type (procedural)
- Week 10: Review — nouns, verbs, adjectives, sentence types; Summary of narrative text

**Term 2 — School and Community**
- Week 1–3: CVC, CVCe, CVVC words; Common & proper nouns, gender, verbs, adjectives; Declarative, interrogative, imperative, exclamatory sentences
- Week 4–6: Personal & interrogative pronouns; Capitalization & punctuation for all sentence types; Time order & description discourse markers
- Week 7–9: Reading comprehension — sequence 3-4 events, problem/solution, cause/effect, character feelings; Informational text — description text type
- Week 10: Review — all sentence types, pronouns; Summary of narrative text

**Term 3 — Physical Environment**
- Week 1–3: CVCe, CVVC, CVCC, CCVC words (clusters & diphthongs); Personal, interrogative, possessive, demonstrative pronouns; Synonyms & antonyms
- Week 4–6: All sentence types with correct capitalization & punctuation; Sentence parts (subject & predicate); Time order & description discourse markers
- Week 7–9: Comprehension — 3-4 events, problem/solution, cause/effect, predict ending, give summary; Informational text — details, problem/solution, description text type
- Week 10: Review — all word patterns, pronouns, sentence types; Summary of narrative text

---

### MATHEMATICS (Grade 2)

**Term 1 — Numbers to 1000, Shapes, Addition**
- Week 1: Circles, half circles, quarter circles; Composite figures (squares, rectangles, triangles)
- Week 2: One-step slides/translations of basic shapes
- Week 3: Count up to 1000
- Week 4: Read and write numerals up to 1000
- Week 5: Represent numbers up to 1000 using models and numerals
- Week 6: Count by 2s, 5s, 10s, 20s, 50s, 100s; Order numbers to 1000
- Week 7: Ordinal numbers up to 20th; Place value of 3-digit numbers (hundreds, tens, ones)
- Week 8–9: Addition with sums up to 1000 (with and without regrouping); Expanded form
- Week 9: Properties of addition; Philippine coins and bills up to ₱1000
- Week 10: Compare values of coins/bills; Solve addition word problems including money

**Term 2 — Measurement, Subtraction, Patterns, Data**
- Week 1: Measure & compare length in meters and centimeters
- Week 2: Estimate length; Solve length & distance problems
- Week 3–7: Subtraction of numbers less than 1000 (with & without regrouping); Increasing & decreasing patterns
- Week 8–9: Pictograph with scale — present & interpret data
- Week 9: Repeated addition / equal groups (intro to multiplication)
- Week 10: Multiplication as repeated addition (groups, arrays, multiples, number line)

**Term 3 — Multiplication, Division, Fractions, Time, Perimeter**
- Week 1: Multiplication tables for 2, 3, 4, 5, 10
- Week 2: Solve multiplication word problems; Introduction to division (equal distribution)
- Week 3: Division expressions — equal sharing, repeated subtraction; Divide using multiplication tables
- Week 4: Missing number in multiplication/division; Even & odd numbers; Division word problems
- Week 5: Unit fractions with denominators 2, 3, 4, 5, 6, 8; Read & write in fraction notation
- Week 6: Order unit fractions; Similar fractions with denominators 2, 3, 4, 5, 6, 8
- Week 7: Read & write similar fractions; Order similar fractions; Duration using calendar
- Week 8: Tell & write time in hours and minutes (a.m./p.m.) using analog clock
- Week 9: Elapsed time problems; Straight vs curved lines; Flat vs curved surfaces; Measure perimeter
- Week 10: Find perimeter of triangles, squares, rectangles; Solve perimeter problems

---

### FILIPINO (Grade 2)

**Term 1 — Sarili at Pamilya (Self and Family)**
- Phonological awareness: tunog ng Alpabetong Filipino, magkakatugmang salita, mga pantig
- Talasalitaan: high frequency words tungkol sa sarili at pamilya; salitang tumutukoy sa ngalan (pantangi/pambalana, tiyak/di-tiyak/walang kasarian)
- Gramatika: salitang naglalarawan (adjectives), salitang kilos (verbs), salitang pangkayarian (ang, ang mga, si, sina), pang-ugnay (at, o)
- Pangungusap: payak na pangungusap — paturol/pasalaysay at patanong; tamang bantas at malaking letra
- Teksto: naratibong teksto — tauhan, tagpuan, banghay, suliranin at solusyon, pagkakasunod-sunod; tekstong impormatibo — tuntunin, paalala, panuto

**Term 2 — Sarili at Komunidad (Self and Community)**
- Phonological awareness: salitang magkakatugma (hanggang 3 pantig), diptonggo, klaster
- Talasalitaan: high frequency words tungkol sa paaralan, komunidad; salita ng kongkreto/di-kongkreto; salitang paari
- Gramatika: lahat ng uri ng pangungusap (paturol, patanong, pakiusap/pautos); wastong intonasyon; malaki at maliit na letra
- Teksto: naratibo at impormatibo — pangunahing idea, suliranin/solusyon, pagkakasunod-sunod, sanhi at bunga, kongklusyon

**Term 3 — Sarili, Komunidad, at Kapaligiran**
- Talasalitaan: lansakan, dinaglat; pamatlig; magkasalungat at magkasingkahulugan
- Gramatika: lahat ng uri ng pangungusap kasama padamdam; simuno at panaguri ng pangungusap
- Teksto: naratibo at impormatibo — buod, mensahe ng teksto, huwaran ng organisasyon (paglalarawan at pagsusunod-sunod)

---

### GMRC — Good Manners and Right Conduct (Grade 2)

**Term 1 — Pagpapahalaga sa Sarili (Valuing Oneself)**
- Week 1–2: Batayang impormasyon ng sarili — pangalan, edad, kasarian, tirahan, relihiyon (Self-confidence)
- Week 3–4: Pangangalaga sa kalusugan gabay ang pamilya — mga paraan ng pag-aalaga ng katawan (Valuing oneself)
- Week 5–6: Sariling damdamin — pag-iisa-isa ng iba't ibang damdamin; wastong pagpapahayag ng damdamin (Sincerity)
- Week 7–8: Pansariling panalangin — mga mabuting dulot ng pananalangin; pakikipag-ugnayan sa Diyos (Prayerful)
- Week 9–10: Pagtitipid na nakabubuti sa kapaligiran — mga wastong paraan ng pagtitipid (Prudent)
- Week 11: Mga tungkulin ng batang Pilipino sa pamayanan (Obedience)
- Week 12–13: Pagkilala ng sariling kakayahan o talento sa tulong ng pamilya (Self-confidence)

**Term 2 — Pakikitungo sa Kapuwa**
- Week 1–2: Wastong paraan ng pakikipagkapuwa (Accountability)
- Week 3–4: Disiplinang pansarili sa paggamit ng pampublikong pasilidad (Compassion)
- Week 5–6: Maayos na pag-uusap sa loob ng pamilya (Patience)
- Week 7: Pagmamahal sa pamilya bilang gabay sa pakikipagkapuwa (Honesty)
- Week 8–9: Mga gawaing panrelihiyon o paniniwala ng pamilya (Obedience)
- Week 10–11: Kalinisan sa tahanan (Orderliness)
- Week 12: Mabuting pagtanggap ng pamilya sa mga bisita (Hospitality)
- Week 13: Paggawa ng kabutihan sa kapuwa (Loving)
- Week 14: Pagkilala sa kabutihan ng kapuwa (Gratitude)

**Term 3 — Pakikibahagi sa Komunidad**
- Week 1: Paggalang sa iba't ibang relihiyon o paniniwala ng kapuwa (Respect)
- Week 2–3: Pangangalaga sa kapaligiran katuwang ang kapuwa-bata (Compassion)
- Week 4–5: Pagbabayanihan ng kapuwa-bata para sa pamayanan (Helpful)
- Week 6–7: Pakikiisa ng pamilya sa pamayanan (Accountability)
- Week 8–9: Mga pagdiriwang sa pamayanan (Friendly)
- Week 10: Mga gawain ng iba't ibang relihiyon na nakatutulong sa pamayanan (Cooperation)
- Week 11: Pangangalaga ng kapaligiran sa kinabibilangang pamayanan (Compassion)
- Week 12–13: Mga kabayanihan sa sariling bayan (Love of Country)

---

### MAKABANSA (Grade 2)

**Term 1 — Ang Ating Komunidad**
- Week 1: Konsepto ng komunidad
- Week 2–5: Katangian ng sariling komunidad — Lokasyon, Lawak o Sukat, Palatandaang heograpikal (bundok, ilog, dagat, lawa)
- Week 6–8: Mga bumubuo sa kinabibilangang komunidad (mga tao, institusyon)
- Week 9–10: Pagpapahalaga sa mga bumubuo ng komunidad

**Term 2 — Ang Kultura ng Ating Komunidad**
- Week 1–2: Kahulugan ng kultura
- Week 3–5: Kulturang materyal at di-materyal ng kinabibilangang komunidad
- Week 6–8: Kaugnayan ng kultura sa paghubog ng pagkakakilanlan
- Week 9–10: Pagpapahalaga sa kultura ng komunidad

**Term 3 — Pakikipagkapuwa at Pakikibahagi**
- Week 1–3: Iba't ibang uri ng kabuhayan — agrikultural, industriyal, pampinansyal, panserbisyo
- Week 4–6: Pamumuhay at mga serbisyo ng kinabibilangang komunidad
- Week 7: Pagpapahalaga sa paraan ng pamumuhay at serbisyo
- Week 8: Konsepto ng pakikipagkapuwa at pakikibahagi
- Week 9: Pamamaraan ng pakikipagkapuwa at pakikibahagi
- Week 10: Pagpapahalaga sa pakikipagkapuwa at pakikibahagi

---

## SUBJECT SCHEDULE REFERENCE

Tala's typical weekly subject schedule (verify against actual school schedule):

| Day | Subjects |
|-----|---------|
| Monday | English + MAKABANSA |
| Tuesday | GMRC + Filipino |
| Wednesday | English + Mathematics |
| Thursday | Filipino + Mathematics |
| Friday | Weekly Review (all subjects) |

> Adjust days based on Tala's actual school schedule each week.

---

## EXAMPLE FILLED-IN PROMPT

```
[Paste base prompt above, then fill in:]

SUBJECTS AND TOPICS FOR THIS WEEK:

Term 1, Week 5

Monday:
- English: Common & proper nouns, gender of nouns (masculine/feminine/neuter)
- MAKABANSA: Palatandaang heograpikal — bundok, ilog, dagat, lawa bilang tanda ng komunidad

Tuesday:
- GMRC: Sariling damdamin — pag-iisa-isa ng iba't ibang damdamin; wastong pagpapahayag ng damdamin (Sincerity)
- Filipino: Salitang naglalarawan (adjectives) at salitang kilos (verbs); salitang pangkayarian (ang, ang mga, si, sina)

Wednesday:
- English: Verbs (action words) and adjectives (describing words) in simple sentences
- Mathematics: Ordinal numbers up to 20th; Place value of 3-digit numbers

Thursday:
- Filipino: Review — salitang naglalarawan, salitang kilos, salitang pangkayarian; payak na pangungusap
- Mathematics: Addition with sums up to 1000 in expanded form

Friday:
- Weekly Review: English (nouns, gender), MAKABANSA (komunidad/heograpiya), GMRC (damdamin), Filipino (adjectives, verbs, pangkayarian), Mathematics (ordinal numbers, place value, addition)
```
