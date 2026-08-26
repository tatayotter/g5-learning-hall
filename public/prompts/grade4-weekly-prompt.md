# Weekly Package Generation Prompt
## Grade 4 | Learning Hall

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
You are a curriculum assistant for a Filipino Grade 4 learner (age 9-10).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Week [X].
(Week number is CONTINUOUS for the whole school year. Week 1 = Jun 15 orientation; lessons begin Week 2. Never restart the count at a new term — write "Week 15", not "Term 2 Week 1".)

OUTPUT RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Top-level keys are day names: Monday, Tuesday, Wednesday, Thursday, Friday
- Each day has subject keys (e.g. "English", "Mathematics", "Science")
- Each subject has exactly two fields: "summary_markdown" and "quiz"
- summary_markdown: a rich markdown lesson note appropriate for a 9-10 year old. Include:
  * Clear bullet points explaining the topic
  * At least 2 worked examples with step-by-step explanations
  * Key vocabulary in bold
  * Encouraging but not babyish tone
  * NO "Tomorrow's Sneak Peek" section
- quiz: an array of 8 questions, each with:
  * "question" — clear, age-appropriate wording for Grade 4
  * "options" — array of exactly 4 strings
  * "correct_answer" — must exactly match one of the option strings
- OPTION LENGTH (mandatory): All answer options in a question must be approximately the same length. The correct answer must NOT be longer than the distractors. If lengths must differ, the longest option must sometimes be a wrong answer — never default to the correct answer being longest. Trim correct answers or extend distractors to balance.
- Difficulty: application and reasoning. Multi-step problems are appropriate for Mathematics and Science. For SSES subjects (English, Mathematics, Science), include at least 2 of 8 questions that require inference, analysis, or multi-step reasoning — not just recall. For other subjects, straightforward application is sufficient.
- Friday is always "Weekly Review" covering all subjects from Mon–Thu

GRADE LEVEL: 4
LANGUAGE: English for English, Mathematics, Science, EPP | Filipino for Filipino, Araling Panlipunan, GMRC | MAPEH uses Filipino for instructions, English for technical terms

SUBJECTS AND TOPICS FOR THIS WEEK (from BOW):
[PASTE THE WEEK'S SUBJECTS AND COMPETENCIES HERE — see BOW reference below]

Generate the full JSON now.
```

---

## BOW REFERENCE — GRADE 4

_Regenerated 2026-08-26 directly from the DepEd-audited `budget_of_work` Supabase table (the app's public `/curriculum/grade-4` source), so this file and that table no longer diverge — including merging that table's own leftover "Ikaapat na Termino"/"Term 4" sections into Term 3, since MATATAG runs 3 terms. See [[project_bow_dual_source_discovery]]._

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

> **EPP note:** EPP rotates through three strands across the year, tracked as one BOW row (EPP AFA/FCS/IA) plus a separate ICT row. ICT = Term 1. AFA = Term 2. FCS and IA are both taught within Term 3.

---

### ENGLISH (Grade 4) ★ SSES

Grade 4 begins Key Stage 2: subdomains are Listening and Reading (LR), Speaking and Writing (SW), Viewing and Representing (VR) — coded EN4LR/EN4SW/EN4VR.

**Term 1 — mealtimes and birthdays — text type: enumeration-description**
- LR: Enumeration-description texts about mealtimes/birthdays; topic + ordered details; multisyllabic-word decoding; grade-level fluency
- SW: Enumeration-description paragraph about a family mealtime/tradition; friendly letter of excuse or invitation (parts); topic-appropriate vocabulary/sentences
- VR: Interpreting photos/menus/invitations; purpose of visual design choices

**Term 2 — christenings and weddings — text type: + time order/chronology-procedural**
- LR: Time-order/procedural texts about christening/wedding customs; sequencing steps/events; ceremonial vocabulary
- SW: Procedural/chronological text on ceremony steps; friendly letter of pagbati (greeting/congratulations)
- VR: Analyzing ceremony photos/programs for sequence/purpose; graphic organizer (flow chart)

**Term 3 — funerals/symposia, then national holidays — text type: recount**
- LR: Recount texts about funerals/symposia and (later) national holidays; sequence of past events; distinguishing recount from procedural/enumeration-description; cause-effect between historical events and present celebrations
- SW: Recount paragraph about a past gathering; friendly letter of pakikiramay (condolence); recount paragraph on a national holiday tying personal/family experience to historical significance; friendly letter of pasasalamat (thanks) — using all four friendly-letter types learned this year
- VR: Images/clips from gatherings — mood and purpose; posters/photos/videos about national holidays; creating a poster or timeline

---

### FILIPINO (Grade 4)

**Term 1 — Alamat at Pabula**
- Talasalitaan: salitang may panlapi (mag-, mang-, -um-); pang-uri (katangian, dami, pamilang)
- Gramatika: pandiwa — aspekto at pokus (aktor, layon, direksyon, benepisyo); pananda (ang, ng, sa)
- Teksto: alamat/pabula — tauhan, tagpuan, tunggalian, aral; buod; pagpapahalaga sa kulturang kinakatawan

**Term 2 — Anekdota at Talaarawan**
- Talasalitaan: idyoma, salawikain; denotasyon/konotasyon
- Gramatika: pang-abay (pamanahon, panagligan, panggalaw, paraan); tambalang pangungusap — lahat ng pang-ugnay; bantas sa diyalogo
- Teksto: anekdota/talaarawan — paksa, damdamin ng may-akda, tonalidad; katotohanan vs. opinyon

**Term 3 — Mito, Epiko, Talambuhay, at Panuto**
- Talasalitaan: salitang hango sa Ingles/Kastila; magkasingkahulugan; salitang mataas na antas; salitang pang-ugnay ng pagkakasunod-sunod; teknikal na bokabularyo
- Gramatika: hugnayang pangungusap — pangatnig; linya ng diyalogo; lahat ng uri ng pangungusap; pasibong anyo; pormal/impormal na wika
- Teksto: mito/epiko — katangian, layunin; talambuhay — mahalagang pangyayari, katangian ng bayani; tekstong panuto — hakbang-hakbang; talaan/tsart

---

### MATHEMATICS (Grade 4) ★ SSES

**Term 1 — Angles, Quadrilaterals, and Whole Numbers to 1,000,000**
- Wk1-2: Angles — right/acute/obtuse using models; measure/draw with a protractor
- Wk3-4: Triangles and quadrilaterals — properties, classify by sides/angles, differentiate types
- Wk5: Perimeter of non-square/rectangle quadrilaterals and composite figures
- Wk6-7: Numbers to 1,000,000 — read/write, place value/value of a digit in a 6-digit number
- Wk8: Comparing (=, <, >) and rounding to the nearest hundred thousand
- Wk9-10: Estimating sums/differences; add/subtract to 1,000,000 with and without regrouping

**Term 2 — Multiplication, Division, Measurement Conversion, and Similar Fractions**
- Wk11-12: Multiplication — 3-4 digit × 1 digit, 2-3 digit × 2 digit, with/without regrouping, products to 1,000,000; estimating products
- Wk13-14: Division — 3-4 digit ÷ 1 digit, 2-3 digit ÷ 2 digit; estimating quotients
- Wk15: Number sentences; MDAS rules; multi-step word problems incl. money
- Wk16-17: Converting units — length (m/cm, km/m), mass (kg/g, g/mg), capacity (L/mL), time (seconds–years) incl. elapsed time
- Wk18-20: Similar fractions — proper/improper/mixed, converting forms, plotting on a number line, add/subtract similar fractions

**Term 3 — Dissimilar Fractions, Factors, Symmetry, Data, and Decimals**
- Wk21-22: Dissimilar/equivalent fractions — represent/compare/order, generate equivalents, reduce to simplest form
- Wk23: Factors and multiples of numbers up to 100
- Wk24-25: Adding/subtracting dissimilar fractions and mixed numbers; multi-step word problems
- Wk26-27: Symmetry with respect to a line; reflection (incl. glide reflection)
- Wk28: Patterns — describe the rule; number sentences (commutative property, equivalent facts)
- Wk29-30: Data in tables and single line graphs — collect, present, interpret, solve for at most 2 variables
- Wk31-33: Decimals to hundredths — model, read/write, place value, convert to/from fractions, plot on a number line
- Wk34-35: Comparing/ordering/rounding decimals to hundredths and nearest tenth

---

### SCIENCE (Grade 4) ★ SSES

**Term 1 — Materials**
- Wk1-2: Science inventions — Filipino/foreign scientists; a science invention's impact on everyday life
- Wk3-4: Chemical properties of materials (burnt, reactive, degradable/biodegradable); property changes under heat
- Wk5-6: Handling materials safely; minimizing harmful changes
- Wk7-8: Gathering scientific information — local environmental issues; guided survey (grouping, classifying, communicating)
- Wk9-10: Term project — invention model/story, or fertilizer-from-waste sample

**Term 2 — Living Things**
- Wk11-12: Body systems — muscular, skeletal, digestive, circulatory, respiratory
- Wk13-14: Plant root and shoot systems
- Wk15-16: Habitats — terrestrial/aquatic/aerial; Philippine animal/plant examples
- Wk17-18: Life cycles — butterfly, frog, chicken, human
- Wk19-20: Food chains — herbivores, carnivores, omnivores

**Term 3 — Force, Motion, Energy, and Earth**
- Wk21-22: Forces and movement — speed, measuring distance/time, speed graphs
- Wk23-24: Pushes/pulls changing speed, direction, and shape of objects
- Wk25-26: Magnet properties — attraction/repulsion, effects on materials
- Wk27-28: Sound, light, and heat energy — sources and uses
- Wk29-30: Term project (heat-energy poster or light/sound safety guide) with a design-iteration step
- Wk31-32: Soil types (sandy, clay, silt, loam) and water-holding ability
- Wk33-34: Effect of soil type on plant growth
- Wk35-36: Weather instruments — temperature, pressure, wind, humidity, rain, cloud cover
- Wk37-38: Reading/interpreting a local weather chart; extreme-weather safety
- Wk39-40: The Sun — composition, size, energy; shadows; importance to living things

---

### ARALING PANLIPUNAN (Grade 4)

_Paksang-Taunan: Ang Bansang Pilipinas — expanding environment model (sariling pook → buong bansa)_

**Term 1 — Heograpiya ng Pilipinas**
- Ganap at kaugnay na lokasyon ng Pilipinas sa mundo/Timog-Silangang Asya; batayan ng pambansang teritoryo
- Heyograpiyang pisikal (kabundukan, ilog, katubigan) at pantao (populasyon, pamamahagi)
- Paglalarawan ng lokasyon/hugis gamit ang mapa; mga rehiyon, lalawigan; ugnayan ng heograpiya sa pamumuhay

**Term 2 — Pambansang Ekonomiya**
- Likas na yaman at gawaing pangkabuhayan (agrikultura, pangingisda, industriya, turismo)
- Sustainable development at pangangalaga sa kapaligiran
- Ugnayan ng gawaing pangkabuhayan sa likas na yaman; epekto ng desisyong pangkabuhayan

**Term 3 — Pambansang Pamahalaan at Pagkakakilanlan**
- Mga elemento ng pagkabansa (teritoryo, mamamayan, pamahalaan, soberanya); unitary presidential system (executive/legislative/judicial)
- Mga serbisyo ng pamahalaan (edukasyon, kalusugan, imprastraktura) batay sa pambansang badyet
- Mga sagisag pambansa (watawat, awit, ibon/bulaklak) at kahalagahan; konsepto ng pagkamamamayan — karapatang sibil/pampulitika/panlipunan-pangkabuhayan
- Kapakanang sibiko bilang pananagutan; pakikilahok sa gawaing sibiko sa paaralan/komunidad

---

### MAPEH (Grade 4)

_Music & Arts and PE & Health are graded separately, each with its own term grade, then averaged._

**Term 1 — Music & Arts: My Cultural Identity and My Province; PE & Health — Personal Health & Target Games**
- Music: Timbre and dynamics in local performances; active listening/performing
- Arts: Elements (line, shape, space, rhythm, color) and composition (balance, proportion) in local cultural performances/dance
- Personal Health: Importance of personal health; hygiene practices; health appraisal (BMI, hearing, vision, dental)
- PE: Target-game concepts (positioning, propelling) via Philippine traditional games (Tatsing, Tumbang Preso, Bati-Cobra)

**Term 2 — Music & Arts: Faiths and Beliefs; PE & Health — Family Health & Invasion Games**
- Music: Rhythm and tempo in music tied to faiths/beliefs
- Arts: Composition focused on rhythm/pattern/movement in local rituals/religious dance
- Family Health: Healthy-family characteristics; one's role in family health; family activities that build health
- PE: Invasion-game concepts (attacking/defending space) via traditional games (Agawan Base, Patintero, Langit-Lupa)

**Term 3 — Music & Arts: Legends/Folklore and Celebrations; PE & Health — Healthy Eating, Consumer Health, Rhythmic Activities**
- Music: Melody in music tied to legends/folklore; form and texture in celebration music
- Arts: Local theater/dance forms tied to legends/folklore and celebrations; principles of emphasis/subordination
- Food Literacy: Safe/healthy eating; essential nutrients; balanced meals and physical activity
- Consumer Health: Child's health rights; Filipino consumer rights/responsibilities; critical-thinking as an informed consumer
- PE: Dance Exercise, movement exploration, Fundamental Dance Steps in 2/4 then 3/4 time, Social Dance Mixers
- Year-end project: creative work based on a province/region celebration + PE/Health rhythmic-activity showcase

---

### EPP (ICT) (Grade 4, Term 1 Only)

**Term 1 — Information and Communications Technology**
- Introduction to Computer: importance, parts/peripherals, basic operations (booting, shutdown, keyboard/mouse)
- Digital Citizenship: digital health/wellness, screen time/posture, online security/safety rules
- Word Processing, Presentation, Desktop Publishing, and Spreadsheet software — interface, formatting, creating a document in each
- Block Coding intro — algorithm and basic process flowchart for everyday tasks

---

### EPP (AFA/FCS/IA) (Grade 4, Terms 2–3)

**Term 2 — Agriculture and Fishery Arts (AFA): Paghahalaman**
- Agrikultura at mga sangay (agronomy, horticulture, forestry); natural/organic/alternatibong pamamaraan ng pagtatanim
- Kahalagahan ng paghahalaman; mga batas/ahensya/NGO (RA 10068, DA, DENR); matagumpay na magsasaka
- Compost, organikong pataba, natural na pestisidyo; mga salik sa paghahalaman
- Pagtatanim, pangangalaga, pagpaparami, pag-aani, pag-iimbak, at pagbebenta ng mga tanim

**Term 3 — Family and Consumer Science (FCS) & Industrial Arts (IA)**
- FCS — Tungkulin sa Sarili: pangangalaga sa katawan, angkop na kagamitan/pananamit sa pagdadalaga/pagbibinata
- FCS — Tungkuling Pantahanan: pagsasaing, paghuhugas, paglilinis ng tahanan, paglalaba, pamamalantsa
- IA: kasangkapan/materyales sa pagguhit; sistema ng pagsukat; free-hand drawing, lettering styles, alphabet of lines
- IA: orthographic at isometric drawing; pagre-recycle — pagbuo ng proyekto mula sa recyclable materials, pagtutuos ng gastos/kita

---

### GMRC (Grade 4)

_GMRC is taught as one value/topic every 1-2 weeks (fortnight), not one broad topic per term — 6 topics per markahan._

**Term 1 — Paghubog sa Sariling Kamalayan Tungo sa mga Mabuting Gawi**
- Sariling Kakayahang Mag-isip at Magmahal (Pagpapahalaga sa Sarili) → Mabuting Pakikitungo sa Kasapi ng Pamilya (Matapat) → Karapatan ng Kapuwa-Bata (Magalang) → Sariling Pananampalataya (Pananalig sa Diyos) → Pangangalaga sa Puno/Halaman (Mapanagutan) → Mabuting Kaugaliang Pilipino (Pagmamahal sa Bayan)

**Term 2 — Pamilya Bilang Gabay sa Pagpapaunlad ng mga Mabuting Gawi**
- Pagpapaunlad ng Kakayahan/Talento/Hilig (Tiwala sa Sarili) → Pagtupad sa Gawain sa Pamilya (Matiyaga) → Pamilya bilang Gabay sa Komunikasyon (Mapagpasensiya) → Pananampalataya sa Pamilya (Masunurin) → Kalinisan ng Tubig (Mabuting Katiwala) → Gawi ng Pamilya ayon sa Kaugaliang Pilipino (Pagmamahal sa Bayan)

**Term 3 — Paghubog ng mga Mabuting Gawi Kasama at Para sa Kapuwa; Yaman ng Pamayanan**
- Pagtitipid/Pag-iimpok para sa Kapuwa (Matipid) → Tungkulin ng Pamilya sa Kapuwa (Mapagmalasakit) → Pagkakapantay-pantay sa Kabila ng Pagkakaiba (Magalang) → Kababaang-loob bilang Pananampalataya (Mapagpakumbaba) → Kalinisan ng Kapaligiran (Kalinisan) → Laro ng Lahi (Nasyonalismo)
- **(Term 3, continued):** Pagkilala sa PWD sa Pamayanan (Mapagpasalamat) → Alituntunin ng Pamayanan (Masunurin) → Katangian ng Lider-Estudyante (Karunungan) → Katapatan sa Pamayanan bilang Pananampalataya (Matapat) → Pangangalaga sa Hayop (Mapagmalasakit) → Makasaysayang Lugar sa Pamayanan (Nasyonalismo)

---

## SUBJECT SCHEDULE REFERENCE

Grade 4 fixed weekly subject schedule (matches `GRADE_5_SCHEDULE` in `subjectSchedule.ts` — shared by Grades 4, 5, 6):

| Day | Subjects |
|-----|---------|
| Monday | English · Mathematics |
| Tuesday | Filipino · Science |
| Wednesday | Araling Panlipunan · EPP (ICT) |
| Thursday | MAPEH · GMRC · EPP (AFA/FCS/IA)* |
| Friday | Weekly Review (all subjects) |

> *EPP (AFA/FCS/IA) is only active in Terms 2–3. Omit it from Thursday during Term 1.
> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.
