# Weekly Package Generation Prompt
## Grade 5 | G5 Learning Hall

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
You are a curriculum assistant for a Filipino Grade 5 learner (age 10-11).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Week [X].
(Week number is CONTINUOUS for the whole school year. Week 1 = Jun 15 orientation; lessons begin Week 2. Never restart the count at a new term — write "Week 15", not "Term 2 Week 1".)

OUTPUT RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Top-level keys are day names: Monday, Tuesday, Wednesday, Thursday, Friday
- Each day has subject keys (e.g. "English", "Mathematics", "Science")
- Each subject has exactly two fields: "summary_markdown" and "quiz"
- summary_markdown: a well-structured lesson note appropriate for a 10-11 year old. Include:
  * Organized bullet points or numbered steps explaining the topic clearly
  * At least 2 worked examples with step-by-step explanations (especially for Math and Science)
  * Key vocabulary and concepts in bold
  * Confident, peer-level tone — not babyish, not lecture-heavy
  * NO "Tomorrow's Sneak Peek" section
- quiz: an array of 8 questions, each with:
  * "question" — clear, age-appropriate wording for Grade 5
  * "options" — array of exactly 4 strings
  * "correct_answer" — must exactly match one of the option strings
- OPTION LENGTH (mandatory): All answer options in a question must be approximately the same length. The correct answer must NOT be longer than the distractors. If lengths must differ, the longest option must sometimes be a wrong answer — never default to the correct answer being longest. Trim correct answers or extend distractors to balance.
- Difficulty: reasoning and analysis. Multi-step problems are expected for Mathematics and Science. For SSES subjects (English, Mathematics, Science), at least 3 of 8 questions must require analytical thinking, inference, or multi-step reasoning — not just recall. For other subjects, include at least 1 higher-order question per 8. Avoid questions with obviously wrong distractors.
- Friday is always "Weekly Review" covering all subjects from Mon–Thu

GRADE LEVEL: 5
LANGUAGE: English for English, Mathematics, Science, EPP | Filipino for Filipino, Araling Panlipunan, GMRC | MAPEH uses Filipino for instructions, English for technical terms

SUBJECTS AND TOPICS FOR THIS WEEK (from BOW):
[PASTE THE WEEK'S SUBJECTS AND COMPETENCIES HERE — see BOW reference below]

Generate the full JSON now.
```

---

## BOW REFERENCE — GRADE 5

Use this to fill in the `SUBJECTS AND TOPICS` section above each Sunday.

> ### 📅 SY 2026-2027 Week Map
> BOW entries use internal week numbers (reset per quarter). Convert to continuous school week using the offsets below.
>
> | Period | School Weeks | Approx. Dates | BOW → School |
> |--------|-------------|---------------|--------------|
> | **Week 1** — Orientation (no lessons) | 1 | Jun 15–19, 2026 | — |
> | **Q1 / Term 1** | 2–13 | Jun 22 – Sep 12, 2026 | BOW Week N → **Week N+1** |
> | *(Term 1 break)* | 13–14 | Sep 10–20, 2026 | — |
> | **Q2 / Term 2** | 15–27 | Sep 21 – Dec 16, 2026 | BOW Week N → **Week N+14** |
> | *(Term 2 break — Christmas)* | 27–29 | Dec 17–31, 2026 | — |
> | **Q3 / Term 3** | 30–40 | Jan 4 – Mar 19, 2027 | BOW Week N → **Week N+29** |
> | **Q4 / Term 3 (cont.)** | 41–50 | Mar 22 – May 28, 2027 | BOW Week N → **Week N+40** |
>
> *Example: BOW "Q2 Week 3" = School Week 3+14 = **Week 17**.*

> **EPP note:** EPP rotates through four strands across the year. Quarter I = ICT. Quarter II = Agriculture and Fishery Arts (AFA). Quarter III = Family and Consumer Science (FCS). Quarter IV = Industrial Arts (IA). Include the active strand for the current quarter.

---

### ENGLISH (Grade 5) ★ SSES

**Term 1 — Community and Environment Themes**
- EN5LR: Literary text — realistic fiction, short story; Characterization (direct and indirect); Flashback and foreshadowing (intro); Point of view (first, second, third person)
- EN5SW: Writing — multi-paragraph essay (introduction, body, conclusion); Coherence and cohesion devices (transition words); Citing a source in simple format
- EN5VR: Vocabulary — word analogies; Figurative language (simile, metaphor, hyperbole, personification); Academic vocabulary in context

**Term 2 — Philippine History Themes**
- EN5LR: Informational text — historical accounts; Distinguishing fact from opinion; Evaluating author's credibility; Text structure (chronological, problem-solution)
- EN5SW: Writing — research-based paragraph; Summary writing (paraphrasing, not copying); Formal vs. informal writing register
- EN5VR: Vocabulary — connotation and denotation (advanced); Roots and affixes (Latin/Greek); Technical vocabulary in history texts

**Term 3 — Social Issues Themes**
- EN5LR: Persuasive text — claim, evidence, counter-argument; Detecting bias and propaganda techniques (bandwagon, emotional appeal, loaded language)
- EN5SW: Writing — argumentative paragraph; Constructing a claim with supporting evidence; Rebuttal (intro)
- EN5VR: Vocabulary — idioms and proverbs; Collocations; Word choice for formal writing

**Term 4 — Global and National Themes**
- EN5LR: Poetry — free verse and structured; Tone, mood, and imagery; Comparing two texts on the same topic
- EN5SW: Writing — literary essay; Reflective writing; Revision strategies (self-editing checklist)
- EN5VR: Vocabulary — vocabulary in standardized test formats; Greek and Latin roots review; Nuance in word meaning

---

### FILIPINO (Grade 5)

**Term 1 — Tulang Liriko at Dula**
- Talasalitaan: Mga salitang may mataas na antas; Kasabihan at sawikain; Pagpapalawak ng bokabularyo sa pamamagitan ng pagbabasa
- Gramatika: Mga panlaping nagbibigay-kahulugan (mag-, mang-, -um-, ma-, i-, -an, -in, -an, -hin); Pokus ng pandiwa (aktor, layon, direksyon, benepisyo, sanhi, kagamitan); Tiyak na paggamit ng mga pananda
- Teksto: Tulang liriko — estilo, sukat, tugma, talinghaga; Dula — kabanata, diyalogo, tagpuan, tauhan; Pagsusuri ng akda

**Term 2 — Maikling Kwento at Balita**
- Talasalitaan: Kolokasyon; Salitang may dalawang kahulugan; Gamit ng diksyonaryo at tesawro
- Gramatika: Pandiwang palipat at katawanin; Aktibo at pasibong pangungusap; Pormal at impormal na wika
- Teksto: Maikling kwento — paksa, tema, tagpuan, punto de bista, elemento ng plot (introduction, rising action, climax, falling action, resolution); Balita — inverted pyramid, 5W1H

**Term 3 — Sanaysay at Editoryal**
- Talasalitaan: Metapora at talinghaga; Mga salitang nagpapakita ng damdamin; Rehistro ng wika
- Gramatika: Paggamit ng estruktura ng pangungusap para sa diin at epekto; Iba't ibang uri ng sugnay
- Teksto: Sanaysay — naratibo, deskriptibo, ekspositori, mapanuring sanaysay; Editoryal — layunin, tono, posisyon ng may-akda; Pagbibigay ng sariling opinyon gamit ang ebidensya

**Term 4 — Nobela at Epikong Pilipino**
- Talasalitaan: Arkaismo at neologismo; Mga salitang kultural na may mataas na halaga; Bokabularyo ng panitikan
- Gramatika: Lahat ng uri ng pangungusap; Mga estrukturang retorikal (anaphora, rhetorical question — intro)
- Teksto: Nobela — paghahambing ng katangian ng nobela at maikling kwento; Epikong Pilipino — Biag ni Lam-ang, Hinilawod (piling bahagi); Pagsusuri ng temang pampanitikan

---

### MATHEMATICS (Grade 5) ★ SSES

**Term 1 — Whole Numbers and Operations**
- Numbers up to 10,000,000 — reading, writing, place value, expanded form; Comparing, ordering, rounding
- Divisibility rules (2, 3, 4, 5, 6, 8, 9, 10); Prime factorization; GCF and LCM
- Multi-step word problems — mixed operations with whole numbers; Estimating and checking reasonableness

**Term 2 — Fractions and Decimals**
- Fractions — multiplication of fractions (fraction × fraction, fraction × whole number); Division of fractions (fraction ÷ whole number, whole number ÷ fraction)
- Mixed numbers — addition, subtraction, multiplication, division; Multi-step word problems
- Decimals — multiplication (decimal × decimal, decimal × whole number); Division of decimals
- Ratio and proportion — meaning, types (direct, inverse — intro); Solving proportion problems

**Term 3 — Percent, Integers, and Geometry**
- Percent — meaning; Converting between percent, fraction, and decimal; Percent of a quantity
- Simple interest — principal, rate, time; Solving simple interest problems
- Integers — concept, ordering on a number line; Addition and subtraction of integers
- Geometry — circles (parts: center, radius, diameter, chord, arc, sector); Circumference (C = πd); Area of a circle (A = πr²)

**Term 4 — Measurement and Statistics**
- Volume — rectangular prism (V = lwh); Solving problems involving volume
- Area of composite figures — combining rectangles, triangles, and circles
- Temperature — Celsius and Fahrenheit; Converting between units
- Statistics — mean, median, mode, range; Interpreting data in tables, bar graphs, line graphs; Reading and constructing pie graphs (intro)

---

### SCIENCE (Grade 5) ★ SSES

**Term 1 — Matter: Physical and Chemical Changes**
- Pure substances vs. mixtures; Solutions — solute, solvent, solubility factors (temperature, agitation, particle size)
- Separating mixtures — chromatography, distillation, crystallization (advanced from Grade 4)
- Physical changes — reversible, no new substance formed; Chemical changes — irreversible, new substance formed; Evidence of chemical reaction
- Conservation of mass — basic concept; Law of conservation of matter

**Term 2 — Living Things: Cells, Systems, and Ecology**
- Cell theory — all living things made of cells; Cell as the basic unit of life; Levels of organization (cell → tissue → organ → organ system → organism)
- Human body systems — reproductive system (age-appropriate, puberty); Nervous system; Endocrine system (basic)
- Ecosystems — types (terrestrial and aquatic); Biodiversity and its importance; Ecological relationships (predation, mutualism, commensalism, parasitism)
- Human impact on ecosystems — deforestation, pollution, overfishing; Conservation strategies

**Term 3 — Force and Motion**
- Newton's First Law — inertia; Newton's Second Law — force = mass × acceleration (basic application); Newton's Third Law — action-reaction
- Speed = distance ÷ time; Calculating speed, distance, and time
- Work = force × distance; Power (concept); Simple machines and mechanical advantage
- Energy — kinetic and potential; Law of conservation of energy (intro); Energy transformation (mechanical to electrical to thermal)

**Term 4 — Earth and Beyond**
- Plate tectonics — tectonic plates, continental drift; Earthquakes — seismic waves, magnitude; Volcanoes — types, eruption causes
- The solar system — characteristics of each planet; Moons, asteroids, comets; Space exploration (satellites, telescopes)
- Earth's motions — rotation (day and night), revolution (seasons); Moon phases and tides
- Climate vs. weather; Climate change — causes and effects; Mitigation and adaptation strategies

---

### ARALING PANLIPUNAN (Grade 5)

**Term 1 — Pilipinas sa Asya: Heograpiya**
- Lokasyon ng Asya sa mundo; Mga rehiyon ng Asya at kanilang katangian
- Pilipinas bilang bahagi ng Timog-Silangang Asya (ASEAN); Katangiang pisiko at klima ng mga kalapit-bansa
- Likas na yaman ng Asya at Pilipinas; Kahalagahan ng ASEAN sa ekonomiya at kaunlaran

**Term 2 — Pilipinas sa Asya: Kasaysayan at Kultura**
- Sinaunang kabihasnan ng Asya — China, India, Arabia; Impluwensya sa kultura ng Pilipinas
- Kalakalan at pakikipag-ugnayan ng Pilipinas sa mga kalapit-bansa noong sinaunang panahon
- Kultura ng mga bansang Asyano — relihiyon, wika, tradisyon; Paghahambing sa kulturang Pilipino

**Term 3 — Pilipinas sa Asya: Pamahalaan at Ekonomiya**
- Sistema ng pamahalaan ng mga bansang Asyano — demokrasya, monarkiya, komunismo (basic)
- Ekonomiya ng Asya — mauunlad at umuusbong na bansa; Industriyalisasyon; Agrikultura
- ASEAN — kasaysayan, layunin, miyembro; Papel ng Pilipinas sa ASEAN

**Term 4 — Pilipinas sa Asya: Pakikiisa at Pagkakakilanlan**
- Mga pandaigdigang organisasyon — UN, WHO, UNESCO; Papel ng Pilipinas
- OFW — kontribusyon sa pamilya at bansa; Hamon at oportunidad
- Pagkakakilanlan bilang Asyano at Pilipino; Pagpapahalaga sa pagkakaiba-iba ng kultura

---

### MAPEH (Grade 5)

**Music and Arts — Philippine Regional and Indigenous Arts**
- Q1: Music of Luzon — Ilocano, Kapampangan, Tagalog folk songs; Vocal music (solo, duet, chorus); Solfège and sight-reading
- Q2: Music of Visayas — Visayan folk songs, kundiman; Rondalla instruments; Music notation (ledger lines, dynamics markings)
- Q3: Music of Mindanao — kulintang ensemble, agung, dabakan; Indigenous musical instruments; Playing simple melodic instruments
- Q4: Philippine contemporary music — OPM, folk-pop, hip-hop; Music composition (simple melody writing)

- Q1 Arts: Weaving and textile arts of Luzon — patterns, meaning, process
- Q2 Arts: Pottery and sculpture of the Visayas; Three-dimensional art; Ceramics (basic)
- Q3 Arts: Batik and indigenous art of Mindanao; Printmaking (intro)
- Q4 Arts: Philippine contemporary art — installation art, street art; Creating an art portfolio

**PE and Health (Terms 1–4)**
- Q1: Holistic wellness — physical, mental, emotional, social; Fitness testing; Target and net/wall games (badminton, table tennis)
- Q2: Puberty — physical and emotional changes; Personal hygiene during puberty; Invasion and striking games (volleyball, softball)
- Q3: Communicable diseases — prevention, transmission, vaccination; Rhythmic activities (folk dance: Tinikling, Maglalatik)
- Q4: Non-communicable diseases — lifestyle diseases, prevention; Dance — contemporary and creative movement; First aid basics

---

### EPP — ICT (Grade 5, Quarter I Only)

- Advanced word processing — tables, columns, mail merge (intro); Document templates
- Spreadsheet — formulas (SUM, AVERAGE, COUNT, MAX, MIN); Charts and graphs from data; Basic data analysis
- Presentation — advanced animations and transitions; Embedding video and audio; Audience design
- Online collaboration tools — Google Docs/Slides intro; Cloud storage and file sharing; Netiquette
- Programming concepts — Scratch or similar block coding; Loops, conditions, events; Creating a simple interactive project

---

### EPP — AFA / FCS / IA (Grade 5, Quarters II–IV)

**Quarter II — Agriculture and Fishery Arts (AFA): Paghahayupan**
- Kahalagahan ng pag-aalaga ng hayop sa Pilipinas; Iba't ibang uri ng hayop na pinalaki (baboy, manok, kambing, isda)
- Pag-aalaga ng isda (tilapia, hito, bangus) — fish pond/cage culture basics; Pagpapakain, pangangalaga, pagkolekta
- Organikong pag-aalaga ng hayop; Natural na gamot at preventive care; Pagbebenta ng produkto

**Quarter III — Family and Consumer Science (FCS)**
- Pinansyal na pamamahala sa pamilya — badyet, ipon, paggastos nang matalino
- Pag-iimbak ng pagkain — refrigeration, canning, drying, fermenting (basic); Food safety
- Pagluluto ng simpleng pagkain nang ligtas — mise en place; Pagsunod sa recipe; Food presentation

**Quarter IV — Industrial Arts (IA)**
- Pagtatayo ng simpleng istruktura gamit ang kahoy/kawayan — hakbang at kaligtasan
- Pangunahing kasangkapan — martilyo, lagari, pantasik, baril ng pandikit; Wastong paggamit at pag-iingat
- Disenyo ng produkto — sketching, bill of materials, pagkalkula ng gastos; Pagbuo at pagpapakita ng natapos na proyekto

---

### GMRC (Grade 5)

**Term 1 — Integridad at Responsibilidad**
- Integridad — pagiging tapat sa salita at gawa kahit walang nanonood; Konsyensya bilang gabay
- Responsibilidad sa sarili, pamilya, at paaralan; Pagtanggap ng pananagutan para sa mga pagkakamali

**Term 2 — Katarungan at Pagkakapantay-pantay**
- Kahulugan ng katarungan; Pantay-pantay na pagtrato sa lahat anuman ang kasarian, lahi, o relihiyon
- Pagtutol sa diskriminasyon at panunukso; Pagtayo para sa tama kahit mahirap

**Term 3 — Mamamayang may Malasakit sa Kalikasan**
- Pangangalaga sa kalikasan bilang moral na tungkulin; Ecological stewardship
- Partisipasyon sa mga gawaing pangkalikasan — tree planting, recycling, zero waste

**Term 4 — Pagmamahal sa Bayan at Pandaigdigang Pananaw**
- Pagpapahalaga sa kasaysayan at kultura ng Pilipinas; Nasyonalismo at patriotismo
- Pandaigdigang pananaw — respeto sa iba't ibang kultura; Pagiging mamamayan ng daigdig

---

## SUBJECT SCHEDULE REFERENCE

Grade 5 fixed weekly subject schedule (matches `GRADE_5_SCHEDULE` in `subjectSchedule.ts` — shared by Grades 4, 5, 6):

| Day | Subjects |
|-----|---------|
| Monday | English · Mathematics |
| Tuesday | Filipino · Science |
| Wednesday | Araling Panlipunan · EPP (ICT) |
| Thursday | MAPEH · GMRC · EPP (AFA/FCS/IA)* |
| Friday | Weekly Review (all subjects) |

> *EPP (AFA/FCS/IA) is only active in Q2–Q4. Omit it from Thursday during Q1.
> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.
