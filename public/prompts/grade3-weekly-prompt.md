# TALA — Weekly Package Generation Prompt
## Grade 3 | G5 Learning Hall

---

## HOW TO USE THIS PROMPT

1. Find the current school week number (e.g. **Week 9**) — continuous from school opening, does NOT restart per term
2. Look up the matching week in the BOW reference below
3. Fill in the `[DATE]`, `[WEEK NUMBER]`, and `[SUBJECTS]` placeholders
4. Paste the completed prompt into Claude, ChatGPT, or Gemini
5. Copy the JSON output into the Weekly Package Builder in Admin → Save

---

## THE PROMPT

```
You are a curriculum assistant for a Filipino Grade 3 learner (age 8-9).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Week [X].
(Week number is CONTINUOUS for the whole school year. Week 1 = Jun 15 orientation; lessons begin Week 2. Never restart the count at a new term — write "Week 15", not "Term 2 Week 1".)

OUTPUT RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Top-level keys are day names: Monday, Tuesday, Wednesday, Thursday, Friday
- Each day has subject keys (e.g. "English", "Mathematics", "Science")
- Each subject has exactly two fields: "summary_markdown" and "quiz"
- summary_markdown: a rich markdown lesson note in friendly language for an 8-9 year old. Include:
  * Clear bullet points explaining the topic
  * At least 2 concrete examples with explanations
  * Key words in bold
  * Encouraging tone
  * NO "Tomorrow's Sneak Peek" section
- quiz: an array of 8 questions, each with:
  * "question" — clear wording appropriate for Grade 3
  * "options" — array of 4 strings
  * "correct_answer" — must exactly match one of the option strings
- OPTION LENGTH (mandatory): All answer options in a question must be approximately the same length. The correct answer must NOT be longer than the distractors. If lengths must differ, the longest option must sometimes be a wrong answer — never default to the correct answer being the longest. Trim correct answers or extend distractors to balance.
- Difficulty: recall and straightforward application. Simple two-step reasoning is appropriate for Mathematics and Science. For SSES subjects (English, Mathematics, Science), include at least 2 questions that require applying a concept, not just recalling a fact.
- Friday is always "Weekly Review" covering all subjects from Mon–Thu

GRADE LEVEL: 3
LANGUAGE: English for English, Mathematics, Science, Computer | Filipino for Filipino, GMRC, Makabansa

SUBJECTS AND TOPICS FOR THIS WEEK (from BOW):
[PASTE THE WEEK'S SUBJECTS AND COMPETENCIES HERE — see BOW reference below]

Generate the full JSON now.
```

---

## BOW REFERENCE — GRADE 3

Use this to fill in the `SUBJECTS AND TOPICS` section above each Sunday.

> ### 📅 SY 2026-2027 Week Map
> BOW entries use internal week numbers (reset per term). Convert to continuous school week using the offsets below.
>
> | Period | School Weeks | Approx. Dates | BOW → School |
> |--------|-------------|---------------|--------------|
> | **Week 1** — Orientation (no lessons) | 1 | Jun 15–19, 2026 | — |
> | **Term 1** | 2–13 | Jun 22 – Sep 12, 2026 | BOW Week N → **Week N+1** |
> | *(Term 1 end / break)* | 13–14 | Sep 13–19, 2026 | — |
> | **Term 2** | 15–27 | Sep 22 – Dec 18, 2026 | BOW Week N → **Week N+14** |
> | *(Term 2 end / break)* | 28–29 | Dec 21, 2026 – Jan 2, 2027 | — |
> | **Term 3** | 30–50 | Jan 5 – May 29, 2027 | BOW Week N → **Week N+29** |
>
> *Example: BOW "Term 2 Week 3" = School Week 3+14 = **Week 17***.
> *Next week (Aug 24–28) = **School Week 11** = BOW Term 1 Week 10 (Review week).*

---

### ENGLISH (Grade 3) ★ SSES

**Term 1 — Regional Themes (Home Region)**
- Week 1–3: Phonological awareness — syllable stress, blending/segmenting phonemes; Word families, context clues; Common and proper nouns; Action and linking verbs; Declarative and interrogative sentences
- Week 4–6: Adjectives (descriptive, possessive); Personal and demonstrative pronouns; Subject-verb agreement (basic); Narrative text — character, setting, problem/solution; Identifying main idea and supporting details
- Week 7–9: Punctuation for all sentence types; Time-order discourse markers; Informational text — sequence, description; Cause and effect (intro)
- Week 10: Review — nouns, verbs, adjectives, pronouns, sentence types; Summary of a story

**Term 2 — Regional Themes (continued)**
- Week 1–3: Multiple-meaning words; Antonyms and synonyms; Subject pronouns vs. object pronouns; Compound words; Interrogative and exclamatory sentences
- Week 4–6: Paragraph writing — topic sentence and supporting details; Story structure (plot); Compare and contrast
- Week 7–9: Informational text — problem/solution; Text features (headings, captions, bold words); Point of view (first/third person — intro)
- Week 10: Review — pronouns, paragraph structure, text comprehension; Written summary

**Term 3 — National Themes (Philippines)**
- Week 1–3: Figurative language — simile and personification (intro); Adverbs of manner, time, place; Conjunctions (and, but, or, so); Compound sentences
- Week 4–6: Affixes (prefixes un-, re-, dis-; suffixes -ful, -less, -ness); Informational text — compare/contrast and description
- Week 7–9: Author's purpose; Denotation vs. connotation (intro); Descriptive paragraph writing; Informational paragraph
- Week 10: Review — figurative language, compound sentences, affixes; Narrative composition

---

### FILIPINO (Grade 3)

**Term 1 — Payak na Pangungusap**
- Week 1–3: Ponolohiya — diin ng pantig, ponemang katinig at patinig; Talasalitaan — kahulugan sa konteksto, mataas na antas na salita
- Week 4–6: Gramatika — payak na pangungusap (simuno at panaguri); Pandiwa — pawatas, kontemplatibo, progresibo, perpektibo
- Week 7–9: Salitang naglalarawan (katangian, dami, pamilang); Naratibong teksto — tauhan, tagpuan, banghay; Tekstong nagbibigay-impormasyon
- Week 10: Pagsasanay — lahat ng uri ng simpleng pangungusap; Buod ng kwento

**Term 2 — Tambalang Pangungusap**
- Week 1–3: Talasalitaan — magkasingkahulugan, magkasalungat, maraming kahulugan; Sugnay na nakapag-iisa at di-nakapag-iisa
- Week 4–6: Tambalang pangungusap gamit ang pang-ugnay (at, ngunit, o, kaya, sapagkat); Tula at dula; Sanaysay (intro)
- Week 7–9: Pagbabago ng kahulugan ng salita sa konteksto; Naratibo at impormatibong teksto — pangunahing idea, sanhi at bunga
- Week 10: Pagsasanay — tambalang pangungusap; Lagom ng kwento

**Term 3 — Hugnayang Pangungusap**
- Week 1–3: Talasalitaan — idyoma (piling halimbawa); Salitang may panlaping un-, ma-, -an, i-; Tambalang pangungusap batay sa pananda (dahil, bagama't, kung, habang)
- Week 4–6: Denotasyon at konotasyon; Hugnayang pangungusap; Lahat ng uri ng pangungusap (pasalaysay, patanong, pautos, padamdam)
- Week 7–9: Maikling kwento; Balita; Buod at lagom ng teksto; Mensahe ng akda
- Week 10: Pagsasanay — hugnayang pangungusap; Maikling komposisyon

---

### MATHEMATICS (Grade 3) ★ SSES

**Term 1 — Whole Numbers and Operations**
- Week 1–2: Numbers up to 100,000 — reading, writing, place value, comparing, ordering, rounding
- Week 3–4: Addition and subtraction up to 100,000 with regrouping; Estimating sums and differences
- Week 5–7: Multiplication — 2-3 digit by 1-2 digit; Properties (commutative, associative, distributive); Estimating products
- Week 8–9: Division — 2-3 digit by 1 digit; Relationship between multiplication and division; Division with remainder
- Week 10: Review — all operations with whole numbers; Word problems

**Term 2 — Measurement and Data**
- Week 1–2: Length — meters, centimeters, millimeters, kilometers; conversion and word problems
- Week 3: Mass — kilograms and grams; conversion and word problems
- Week 4: Capacity — liters and milliliters; conversion and word problems
- Week 5–6: Time — elapsed time; calendar (days, weeks, months, years); word problems
- Week 7–8: Data — bar graphs; reading, interpreting, and constructing with scale
- Week 9: Pictographs and bar graphs — comparison; word problems
- Week 10: Review — measurement conversion; data interpretation

**Term 3 — Fractions and Geometry**
- Week 1–3: Unit fractions and proper fractions — concept, notation, reading/writing; Similar fractions — comparing, ordering, adding, subtracting
- Week 4: Problem solving with similar fractions; Introduction to mixed numbers
- Week 5–6: Lines — parallel, perpendicular, intersecting; Angles — right, acute, obtuse
- Week 7–8: Plane figures — triangles (types), quadrilaterals (square, rectangle, rhombus, trapezoid); Perimeter of polygons; Area of squares and rectangles
- Week 9: Number patterns (growing and repeating); Geometric patterns
- Week 10: Review — fractions, geometry, patterns; Problem solving

---

### SCIENCE (Grade 3) ★ SSES

**Term 1 — Materials and Their Properties**
- Week 1–3: Properties of materials — texture, hardness, flexibility, solubility, conductivity; Classifying materials by observable properties
- Week 4–6: Choosing the right material for a specific use; Physical and chemical changes (intro) — burning, rusting, cooking vs. cutting, bending
- Week 7–9: Natural vs. man-made materials; Responsible use, reuse, and disposal; Reduce, reuse, recycle
- Week 10: Review — material properties and changes; Problem solving (which material is best for a task?)

**Term 2 — Living Things**
- Week 1–3: Parts of a plant and their functions; Seed germination and the plant life cycle
- Week 4–5: Animal life cycles — butterfly (complete metamorphosis), frog, chicken; Comparing life cycles
- Week 6–7: Animal adaptations — structural and behavioral; Matching adaptations to environment
- Week 8–9: Producers, consumers, decomposers; Simple food chains; Food webs (intro)
- Week 10: Review — plants, animals, food chains

**Term 3 — Force, Motion, Energy, and Earth**
- Week 1–2: Push and pull as forces; Effects of force on object (speed, direction, shape); Friction — definition, useful and harmful
- Week 3–4: Simple machines — lever, inclined plane, wheel and axle, pulley; How simple machines make work easier
- Week 5–6: Light — sources of light; Reflection and refraction (basic); Shadow formation; Transparent, translucent, opaque materials
- Week 7–8: Earth's layers (crust, mantle, core — basic); Weathering and erosion — causes, effects, prevention
- Week 9: Natural disasters — earthquake, volcanic eruption, typhoon; Safety measures
- Week 10: Review — force, light, Earth

---

### MAKABANSA (Grade 3)

**Term 1 — Ang Ating Bansa**
- Week 1–3: Lokasyon ng Pilipinas sa mapa ng Asya at mundo; Hangganan; Kapuluan
- Week 4–6: Mga anyong lupa at anyong tubig sa Pilipinas; Kagubatan at likas na yaman
- Week 7–9: Pangulo at mga pangunahing pinunong pambansa; Pambansang sagisag at simbolo
- Week 10: Pagsasanay — mapa ng Pilipinas at pambansang pagkakakilanlan

**Term 2 — Kasaysayan ng Ating Bansa**
- Week 1–3: Sinaunang Pilipinas — pamumuhay, kultura, at paniniwala ng mga unang Pilipino
- Week 4–6: Mga mananakop at epekto nito sa kultura at lipunan; Mga naging pagbabago
- Week 7–9: Mga bayani ng bansa — Lapu-Lapu, Gabriela Silang, Andres Bonifacio, Jose Rizal; Kanilang mga ambag
- Week 10: Pagsasanay — pagkakasunod-sunod ng mga makasaysayang pangyayari

**Term 3 — Kultura, Lipunan, at Ekonomiya**
- Week 1–3: Iba't ibang grupo ng tao sa Pilipinas — Lumad, Muslim, Kristiyano; Pagkakaisa sa pagkakaiba-iba
- Week 4–6: Sayaw, musika, sining, at pagkain bilang bahagi ng kulturang Pilipino
- Week 7–9: Mga trabaho at kabuhayan — agrikultura, kalakalan, serbisyo; Bayanihan at pagtutulungan
- Week 10: Pagsasanay — kultura at ekonomiya ng Pilipinas

---

### GMRC (Grade 3)

**Term 1 — Pagpapahalaga sa Sarili at Pamilya**
- Week 1–4: Pagpapahalaga sa sariling kakayahan at pagkakakilanlan; Pagiging tapat sa sarili
- Week 5–8: Tungkulin sa pamilya; Pagmamahal at paggalang sa magulang at kapatid; Katapatan
- Week 9–10: Disiplina sa tahanan at paaralan; Pananagutan sa sariling gawi

**Term 2 — Pakikitungo sa Kapuwa at Komunidad**
- Week 1–4: Wastong pakikitungo sa guro, kaklase, at matatanda; Malasakit at pagmamalasakit sa iba
- Week 5–8: Pagiging responsableng miyembro ng paaralan at komunidad; Kooperasyon
- Week 9–10: Pagtulong sa kapuwa — kabutihang-loob at pagpapahalaga sa iba

**Term 3 — Pamumuhay Ayon sa Mabuting Pagpapahalaga**
- Week 1–4: Pagmamahal sa bansa; Paggalang sa mga batas at patakaran
- Week 5–8: Pangangalaga sa pampublikong ari-arian at kalikasan; Responsibilidad sa kapaligiran
- Week 9–10: Katapatan sa salita at gawa; Pagpapasalamat at pagkilala sa kabutihan ng iba

---

### COMPUTER (Grade 3 — App-Added)

**Term 1 — Basic Computing Skills**
- Parts of a computer and their functions; Input and output devices
- Basic keyboarding — home row, touch typing introduction; Mouse skills
- File management: creating, naming, saving, and organizing files and folders

**Term 2 — Word Processing and Creativity**
- Opening and closing applications; Typing, selecting, and editing text
- Formatting: font, size, bold/italic/underline; Paragraph alignment; Saving and printing
- Creating a simple illustrated report or story using text and inserted images

**Term 3 — Internet Basics and Presentations**
- What is the Internet; Safe browsing rules for children; Educational websites
- Basic search skills; Understanding that information online needs to be verified
- Creating a short slide presentation: text, images, transitions; Presenting to an audience

---

## SUBJECT SCHEDULE REFERENCE

Grade 3 fixed weekly subject schedule (matches `GRADE_3_SCHEDULE` in `subjectSchedule.ts`):

| Day | Subjects |
|-----|---------|
| Monday | English · Mathematics |
| Tuesday | Filipino · Science |
| Wednesday | Makabansa · Computer |
| Thursday | GMRC |
| Friday | Weekly Review (all subjects) |

> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.
