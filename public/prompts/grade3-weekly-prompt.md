# TALA — Weekly Package Generation Prompt
## Grade 3 | Learning Hall

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

_Regenerated 2026-08-26 directly from the DepEd-audited `budget_of_work` Supabase table (the app's public `/curriculum/grade-3` source), so this file and that table no longer diverge. See [[project_bow_dual_source_discovery]] and [[project_grade3_bow_deped_audit]]._

Use this to fill in the `SUBJECTS AND TOPICS` section above each Sunday.

> ### 📅 SY 2026-2027 Week Map
> BOW entries use internal week numbers (reset per term). Convert to continuous school week using the offsets below.
>
> | Period | School Weeks | Approx. Dates | BOW → School |
> |--------|-------------|---------------|--------------|
> | **Week 1** — Orientation (no lessons) | 1 | Jun 15–19, 2026 | — |
> | **Term 1** | 2–13 | Jun 22 – Sep 12, 2026 | BOW Week N → **Week N+1** |
> | *(Term 1 break)* | 13–14 | Sep 10–20, 2026 | — |
> | **Term 2** | 15–27 | Sep 21 – Dec 16, 2026 | BOW Week N → **Week N+14** |
> | *(Term 2 break — Christmas)* | 27–29 | Dec 17–31, 2026 | — |
> | **Term 3** | 30–50 | Jan 4 – May 28, 2027 | BOW Week N → **Week N+29** |
>
> *Example: BOW "Term 2 Week 3" = School Week 3+14 = **Week 17**.*

---

### ENGLISH (Grade 3) ★ SSES

**Term 1 — Regional Themes and Content-Specific Topics**
- Phonics: sight words; CVCC, CCVC (clusters/diphthongs), VCV, VCCV word patterns
- Vocabulary: high-frequency + regional/content-specific words (Math/Science terms); word functions — verbs, adjectives, interrogative/possessive/demonstrative pronouns; synonyms/antonyms; word roots
- Grammar: sentences vs. non-sentences; all 4 sentence types; parts of a simple sentence; capitalization/punctuation; discourse markers (time-order, description, explanation)
- Comprehension: story elements, sequence 4-5 events, problem/solution, feelings/traits, cause-effect, predict ending, summary; informational texts — 4-5 details, text types, draw conclusions
- Composing: greetings, retelling myths/legends/fables, reacting to character/topic, summary

**Term 2 — Regional Themes, Compound Sentences**
- Same phonics/vocab/comprehension framework as Term 1, continued mastery
- Grammar adds compound sentences — two independent clauses, coordinating conjunction, doers/actions in both clauses, correct punctuation

**Term 3 — National Themes, Culminating Competencies**
- Same framework shifted to **national themes**; full sentence-type and compound-sentence repertoire
- Comprehension: sequencing grows to 5+ events, 5+ significant details on national topics

---

### FILIPINO (Grade 3)

**Term 1**
- Ponolohiya/palabigkasan: sight words sa Filipino
- Talasalitaan: high-frequency (sarili/bansa); dinaglat; pamatlig; naglalarawan; kilos; pangkayarian (pangatnig/pang-angkop); salitang-ugat; magkasingkahulugan/magkasalungat
- Gramatika: simuno at panaguri; pananda sa teksto (pag-iisa-isa/paglalarawan, pagsusunod-sunod)
- Teksto naratibo (kuwentong pambata, kuwentong-bayan, pabula, alamat, parabula) — elemento, damdamin/katangian ng tauhan, suliranin-solusyon, 5 pangyayari, sanhi-bunga, wakas, buod, sariling karanasan
- Teksto impormatibo (patalastas, babala, balita, ulat-panahon) — 5 detalye, suliranin-solusyon, huwaran ng organisasyon, kongklusyon
- Pagsulat: maikling talata tungkol sa sarili/bansa gamit ang academic language

**Term 2**
- Talasalitaan: salitang naglalarawan (paraan/panahon/pinangyarihan), pangkayarian (pang-ukol)
- Gramatika: sugnay na nakapag-iisa sa tambalang pangungusap
- Teksto: parehong elemento naratibo/impormatibo, ngayo'y pambansang paksa
- Pagsulat: maikling talata gamit ang tambalang pangungusap

**Term 3**
- Talasalitaan: denotasyon at konotasyon
- Gramatika: tambalang pangungusap batay sa pananda
- Teksto: 5-7 pangyayari, 5-7 detalye, kongklusyon, mensahe ng teksto — mula sa balita, ulat-panahon, grap/mapa ng bansa
- Pagsulat: hugnayang pangungusap, pagpapaliwanag bilang huwaran ng organisasyon

---

### MATHEMATICS (Grade 3) ★ SSES

**Term 1**
- Wk1-2: Represent, read/write numbers to 10,000
- Wk2-3: Place value of digit in 4-digit number; round to nearest ten/hundred/thousand
- Wk4: Compare (=,>,<) and order numbers to 10,000; ordinal numbers to 100th
- Wk5-6: Illustrate/estimate area of square/rectangle using tile units; derive area formulas
- Wk7: Find areas of squares/rectangles in sq.cm/sq.m; solve area problems
- Wk8-9: Points, lines, line segments, rays; parallel/intersecting/perpendicular lines
- Wk10: Equal-length line segments using a ruler; term review

**Term 2**
- Wk11: Measure mass in g/kg/mg; estimate/compare using a balance scale
- Wk12: Measure capacity in L/mL; estimate/compare two containers
- Wk13: Read/write Philippine money to ₱10,000 (₱ and centavo signs)
- Wk14-15: Add numbers to 10,000 with/without regrouping; estimate sums; word problems incl. money
- Wk15-16: Subtract numbers <10,000 with/without regrouping; estimate differences; 3-4 numbers up to 2 digits
- Wk17: Collect data (dice, coin); present in tables and single bar graphs
- Wk18: Interpret data in tables/bar graphs; likelihood language (equally/less/most likely, certain, impossible)
- Wk19-20: Multiply using 6,7,8,9 tables; properties of multiplication; multiply 2-4 digit numbers; estimate products; word problems incl. money

**Term 3**
- Wk21: Missing terms in repeating/increasing/decreasing patterns; generate patterns
- Wk22: Division via equal jumps/inverse of multiplication; divide using 6,7,8,9 tables; missing number
- Wk23-24: Divide 2-4 digit numbers with/without remainder; divide by 10/100/1000; estimate quotients
- Wk25: 1-2 step division word problems incl. money
- Wk26: Fractions equal to/greater than one; add/subtract similar fractions using models
- Wk27: Two-direction multi-step slide (translation) of shapes
- Wk28: Line symmetry — identify and draw
- Wk29-30: Term review integrating division, fractions, symmetry

---

### SCIENCE (Grade 3) ★ SSES

**Term 1**
- Wk1: Science in daily life — objects/events explainable by science
- Wk2: Science processes — guided activities; uses of equipment (ruler, hand lens, scissors, balloons, clay, cardboard)
- Wk3: Observing, predicting, measuring (mm, cm, m)
- Wk4-5: Physical properties of solid materials (hard, shiny, stretchable)
- Wk6: Changes in materials can harm living/nonliving things (trash disposal, burning)
- Wk7: Proper handling/disposal of materials (reuse, recycling)
- Wk8: How changes make solid materials useful (shaped, pressed, hammered, joined, cut)
- Wk9-10: Properties/uses of metals (iron, gold, silver, copper); term project — recyclable-materials product

**Term 2**
- Wk11: Observing, predicting, measuring in guided activities
- Wk12: Living vs. nonliving things — examples
- Wk13: Characteristics of living things — grow, respond, reproduce
- Wk14: Outer body parts of animals and their role (move, gather food)
- Wk15: Outer parts of plants and their role (water/nutrients from soil)
- Wk16: Basic needs of living things; interdependence; protecting the environment
- Wk17: Ways to move objects (natural causes, people); factors affecting movement
- Wk18: Describing changes in position (closer, farther, left, right)
- Wk19: How sound is made/transferred; sources of light and uses
- Wk20: Light/sound can be harmful; using movement/sound/light to send information

**Term 3**
- Wk21-22: Non-living things around school (rocks, soil, water, air, metals, clouds, rain, sunlight)
- Wk23: Useful things from non-living materials ("earth materials")
- Wk24-25: Observing/recording weather changes; local weather types/patterns
- Wk26: Weather's effect on activities; dangerous weather
- Wk27-28: Observing Sun, Moon, planets, stars in day/night sky
- Wk29: How/when these objects appear to move across the sky
- Wk30: Effect of sky objects on people's activities; safety re: Sun's light

---

### MAKABANSA (Grade 3)

**Term 1 — Ang Ating Komunidad sa Paglipas ng Panahon**
- Wk1-5: Mahahalagang tao, lugar, pangyayari sa kasaysayan ng pook (timeline, kuwentong-bayan)
- Wk6-8: Pagbabagong naganap sa komunidad — dahilan (populasyon, imprastraktura, teknolohiya)
- Wk9-10: Pagpapahalaga sa kasaysayan at pagbabago ng komunidad (likhang-sining)

**Term 2 — Ang Sining at Kultura ng Ating Mas Malawak na Komunidad**
- Wk11-12: Ugnayan ng kapaligiran at kultura
- Wk13-15: Pagkakakilanlan at sagisag ng komunidad (himno, coat of arms, bayaning lokal)
- Wk16-18: Kultura at sariling pagkakakilanlan; likhang-sining gamit ang katutubong materyales
- Wk19-20: Pagpapahalaga sa sining/kultura ng mas malawak na komunidad

**Term 3 — Tayo Bilang Aktibong Pilipino**
- Wk21: Konsepto ng pagka-Pilipino
- Wk22-23: Sariling katangian at pagka-Pilipino
- Wk24: Pagpapahalaga sa pagkakakilanlan bilang Pilipino
- Wk25-26: Papel ng pagiging aktibong Pilipino
- Wk27-28: Pagpapahalaga sa papel ng pagiging aktibong Pilipino (Laro ng Lahi)
- Wk29-30: Pagiging aktibo/responsableng batang Pilipino (Panatang Makabayan)

---

### GMRC (Grade 3)

**Term 1**
- Wk1-2: Sariling hilig at kakayahan (Self-confidence)
- Wk3-4: Pag-iimpok/pagtitipid kasama ang pamilya (Compassion)
- Wk5-6: Gampanin sa tahanan at paaralan (Responsibility)
- Wk7-8: Pagkilos nang may paggalang sa Diyos (Faith)
- Wk9-10: Pansariling gawain na nakabubuti sa kapaligiran (Discipline)
- Wk11: Pansariling karapatan na kinikilala sa pamayanan (Respect)
- Wk12-13: Sariling paraan ng pakikilahok sa pamilya (Cooperation)

**Term 2**
- Wk14-15: Ugnayan ng sarili sa kapuwa (Patience)
- Wk16-17: Impormasyon tungkol sa sariling barangay (Prudence)
- Wk18: Pakikipag-ugnayan sa bawat kasapi ng pamilya (Sincerity)
- Wk19: Pagtupad sa gampanin at inaasahang kilos (Initiative)
- Wk20-21: Pakikibahagi sa gawaing panrelihiyon ng pamilya (Cooperation)
- Wk22-23: Gawi ng pamilya sa pangangalaga sa kalikasan (Compassion)
- Wk24: Mabuting kaugalian ng pamilyang Pilipino sa rehiyon (Obedience)
- Wk25: Sariling kakayahan para sa kapuwa (Compassion)
- Wk26: Pagkilala sa mga taong may kapansanan/PWD (Respect)

**Term 3**
- Wk27: Panalangin para sa kapuwa (Prayerful)
- Wk28: Pamamahala sa mga bagay na hindi nagagamit — 4Rs (Prudence)
- Wk29-30: Paghikayat sa kapuwa na igalang ang sagisag ng bansa (Love of Country)
- Wk31: Mga alituntunin sa sariling barangay (Cooperation)
- Wk32-33: Mga tungkulin ng mga taong nakatira sa barangay (Responsibility)
- Wk34-35: Pakikibahagi sa gawain ng relihiyon sa pamayanan (Faith)
- Wk36-37: Pakikiisa sa pamayanan para sa malinis na hangin (Compassion)
- Wk38-39: Kontribusyon ng mga makabagong bayani/Modern Day Heroes (Gratitude)

---

### COMPUTER (Grade 3 — App-Added Bonus Subject)

_Not part of official MATATAG Grade 3 (which has 6 subjects: English, Filipino, Mathematics, Science, GMRC, Makabansa). Kept as intentional enrichment — see [[project_grade3_bow_deped_audit]]._

**Term 1 — Parts, Care, and Basic Control of a Computer**
- Naming main parts (monitor, keyboard, mouse/trackpad, CPU, speakers); input vs. output devices
- Proper posture/screen distance/breaks; hardware care; safe power on/off, log in/out
- Mouse control (click, double-click, right-click, drag); keyboard keys; opening/closing an app
- Home-row typing accuracy; following on-screen instructions

**Term 2 — Creating Simple Digital Work**
- Word-processing/drawing app — typing/editing text, toolbar (font size/color, bold/underline)
- Drawing tools (pencil, shapes, fill, eraser) for a labeled picture with caption
- Saving/opening files with adult guidance
- Small combined project (drawing + typed paragraph), presented to class

**Term 3 — Introduction to the Internet and Staying Safe Online**
- What the internet is used for; recognizing browser/search-engine icons
- Safe vs. inappropriate content; never sharing personal info without a trusted adult; not everything online is true
- Simple keyboard shortcuts; safe program/computer shutdown habits
- Year-end multimedia project combining a labeled drawing and short paragraph

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
