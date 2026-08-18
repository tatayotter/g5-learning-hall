# Weekly Package Generation Prompt
## Grade 4 | G5 Learning Hall

---

## HOW TO USE THIS PROMPT

1. Find the current school week number (e.g. Term 1 Week 5)
2. Look up the matching week in the BOW reference below
3. Fill in the `[DATE]`, `[WEEK NUMBER]`, and `[SUBJECTS]` placeholders
4. Paste the completed prompt into Claude, ChatGPT, or Gemini
5. Copy the JSON output into the Weekly Package Builder in Admin → Save

---

## THE PROMPT

```
You are a curriculum assistant for a Filipino Grade 4 learner (age 9-10).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Term [X] Week [X].

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

Use this to fill in the `SUBJECTS AND TOPICS` section above each Sunday.

> **EPP note:** EPP rotates through four strands across the year. Quarter I = ICT. Quarter II = Agriculture and Fishery Arts (AFA). Quarter III = Family and Consumer Science (FCS). Quarter IV = Industrial Arts (IA). Include the active strand for the current quarter.

---

### ENGLISH (Grade 4) ★ SSES

**Term 1 — Mealtimes and Birthdays (Cultural themes: family and celebration)**
- EN4LR: Literary text — narrative (short stories about mealtimes and family celebrations); Elements of story; Character traits; Figurative language — simile, metaphor
- EN4SW: Writing — descriptive paragraph; Personal narrative; Correct use of comma in a series
- EN4VR: Vocabulary — compound words; Context clues (definition and example type); Synonyms and antonyms review

**Term 2 — Christenings and Weddings (Cultural themes: milestones and community)**
- EN4LR: Informational text — expository; Main idea and supporting details; Text structure (compare-contrast, cause-effect); Author's purpose
- EN4SW: Writing — expository paragraph (topic sentence, supporting details, concluding sentence); Proofreading for capitalization and punctuation
- EN4VR: Vocabulary — multiple-meaning words; Affixes (un-, re-, dis-, pre-, -ful, -less, -ness, -ly); Connotation and denotation

**Term 3 — Funerals and Symposia (Cultural themes: community rites and civic events)**
- EN4LR: Persuasive text — identifying the author's claim and supporting reasons; Propaganda techniques (bandwagon, testimonial — intro); Point of view
- EN4SW: Writing — opinion paragraph; Linking words for argument (however, therefore, as a result); Dialogue writing
- EN4VR: Vocabulary — idioms and expressions; Word analogies; Root words (Latin and Greek roots — basic)

**Term 4 — National Holidays (Cultural themes: Philippine national celebrations)**
- EN4LR: Poetry — stanza, rhyme scheme, rhythm; Imagery; Literary vs. informational text comparison
- EN4SW: Writing — short essay; Narrative composition; Revision and editing checklist
- EN4VR: Vocabulary — review of all strategies; Dictionary and thesaurus use; Vocabulary in context

---

### FILIPINO (Grade 4)

**Term 1 — Alamat at Pabula**
- Talasalitaan: salitang may panlapi (mag-, mang-, -um-); Mga salitang pang-uri (katangian, dami, pamilang); Pagpapalawak ng bokabularyo
- Gramatika: Pandiwa — aspekto (kontemplatibo, progresibo, perpektibo) at pokus (aktor, layon, direksyon, benepisyo); Tamang gamit ng pananda (ang, ng, sa)
- Teksto: Alamat at pabula — tauhan, tagpuan, tunggalian, aral; Pagbibigay ng buod; Pagpapahalaga sa kulturang kinakatawan

**Term 2 — Anekdota at Talaarawan**
- Talasalitaan: Mga idyoma at salawikain; Kahulugan ng salita sa konteksto; Denotasyon at konotasyon
- Gramatika: Pang-abay (pamanahon, panagligan, panggalaw, paraan); Tambalang pangungusap — lahat ng pang-ugnay; Wastong bantas sa diyalogo
- Teksto: Anekdota at talaarawan — paksa, damdamin ng may-akda, tonalidad; Pagkilala sa katotohanan vs. opinyon

**Term 3 — Mito, Epiko, at Talambuhay**
- Talasalitaan: Salitang hango mula sa Ingles at Kastila; Magkasingkahulugang salita; Salitang may mataas na antas
- Gramatika: Hugnayang pangungusap — pangatnig (dahil, bagaman, kung, kapag, habang, upang); Linya ng diyalogo (sinipi at di-sinipi)
- Teksto: Mito at epiko — katangian, nilalaman, layunin; Talambuhay — mahalagang pangyayari, katangian ng bayani; Pagsulat ng maikling talambuhay

**Term 4 — Panuto at Proseso**
- Talasalitaan: Salitang pang-ugnay (pang-ayos ng pagkakasunod-sunod); Teknikal na bokabularyo sa mga piling larangan
- Gramatika: Lahat ng uri ng pangungusap; Pasibong anyo ng pandiwa; Pormal at impormal na wika
- Teksto: Tekstong nagbibigay-panuto — hakbang-hakbang na proseso; Pagsunod at pagsulat ng sariling panuto; Talaan at tsart bilang bahagi ng tekstong impormatibo

---

### MATHEMATICS (Grade 4) ★ SSES

**Term 1 — Whole Numbers to 1,000,000**
- Week 1–3: Numbers up to 1,000,000 — reading, writing, place value, expanded form; Comparing and ordering; Rounding to nearest ten/hundred/thousand
- Week 4–6: Addition and subtraction up to 1,000,000 with regrouping; Estimating; Word problems with multi-step operations
- Week 7–9: Multiplication — 3-4 digit by 2 digit; Estimating products; Factors and multiples; Prime and composite numbers (intro)
- Week 10: Division — 3-4 digit by 1-2 digit; Estimating quotients; Division with remainder; Word problems

**Term 2 — Fractions and Measurement**
- Week 1–3: Fractions — proper, improper, mixed numbers; Equivalent fractions; Comparing and ordering fractions
- Week 4–5: Addition and subtraction of similar and dissimilar fractions; Mixed number operations
- Week 6: Word problems involving fractions
- Week 7–8: Measurement — converting units of length (mm, cm, m, km); mass (g, kg); capacity (mL, L)
- Week 9: Perimeter and area of rectangles and squares; Word problems

**Term 3 — Geometry and Decimals**
- Week 1–2: Angles — measuring with protractor; Types (acute, right, obtuse, straight, reflex); Angle relationships
- Week 3–4: Quadrilaterals — properties of squares, rectangles, parallelograms, rhombuses, trapezoids; Triangles — classifying by sides and angles
- Week 5–6: Decimals — tenths and hundredths; Reading, writing, comparing, ordering; Rounding decimals
- Week 7–8: Addition and subtraction of decimals; Word problems
- Week 9–10: Line graphs — reading and interpreting; Organizing and presenting data; Mean of a data set (intro)

---

### SCIENCE (Grade 4) ★ SSES

**Term 1 — Materials and Mixtures**
- Week 1–3: Physical properties of materials — mass, volume, density (basic); Classifying solids, liquids, gases
- Week 4–6: Mixtures — homogeneous and heterogeneous; Methods of separating mixtures (filtering, evaporation, decanting, magnetic separation, sieving)
- Week 7–9: Physical vs. chemical changes — evidence of chemical change (color change, gas produced, heat released, new smell); Examples from everyday life
- Week 10: Review — materials, mixtures, and changes

**Term 2 — Living Things and Systems**
- Week 1–3: The cell — basic structure and function; Difference between plant and animal cells; Unicellular and multicellular organisms
- Week 4–5: Organ systems — digestive, respiratory, circulatory, skeletal, muscular; Functions and interconnections
- Week 6–7: Ecosystems — biotic and abiotic factors; Habitat; Food chains and food webs; Energy flow
- Week 8–9: Biodiversity — types of ecosystems (forest, coral reef, wetland); Importance of biodiversity; Human impact
- Week 10: Review — cells, systems, ecosystems

**Term 3 — Force, Energy, and Earth**
- Week 1–2: Forces — gravity, friction, magnetic force, applied force; Balanced and unbalanced forces; Net force
- Week 3–4: Magnets — poles, magnetic field, uses; Electricity — simple circuits (series and parallel — intro); Conductors and insulators
- Week 5–6: Sound — vibration, pitch, volume, how sound travels through different media
- Week 7–8: Earth's soil — composition, types (sandy, clay, loam), importance; Water cycle — evaporation, condensation, precipitation, collection
- Week 9: Weather — factors affecting weather; Reading a weather map; Severe weather and safety
- Week 10: Review — force, energy, and Earth science

---

### ARALING PANLIPUNAN (Grade 4)

**Term 1 — Heograpiya ng Pilipinas**
- Lokasyon ng Pilipinas — absolute (latitude/longitude) at relative; Mga katangiang pisiko (bundok, bulkan, ilog, baybayin)
- Rehiyon ng Pilipinas — lokasyon at natatanging katangian; Klima — monsoon, bagyo, tag-init, tag-ulan
- Likas na yaman ng Pilipinas — uri, distribusyon, kahalagahan; Pangangalaga at wastong paggamit

**Term 2 — Ekonomiya ng Pilipinas**
- Mga pangunahing larangan ng ekonomiya — agrikultura, industriya, serbisyo
- Kalakalan — lokal at dayuhang kalakalan; Mga produktong iniluluwas at inilalaglag
- Kabuhayan ng mga Pilipino — iba't ibang uri ng trabaho; Kooperatiba at negosyo

**Term 3 — Pamahalaan ng Pilipinas**
- Tatlong sangay ng pamahalaan — ehekutibo, lehislatibo, hudikatura; Kanilang mga tungkulin
- Konstitusyon ng Pilipinas — kahulugan, kasaysayan, nilalaman (basic); Mga karapatan at tungkulin ng mamamayan
- Lokal na pamahalaan — barangay, munisipyo/lungsod, probinsiya; Mga opisyal at kanilang papel

**Term 4 — Pagkakakilanlan ng Pilipino**
- Kultura ng Pilipinas — mga tradisyon, pagdiriwang, sining at kultura
- Pamilyang Pilipino — pagpapahalaga, sistema ng pamilya, pagbabago ng pamilyang Pilipino
- Pilipino sa mundo — OFW; Pagkakakilanlan bilang Pilipino sa ibang bansa; Ambag ng Pilipino sa daigdig

---

### MAPEH (Grade 4)

**Term 1 — Music and Arts: My Cultural Identity and My Province**
- Music: Folk songs of one's region — melody, rhythm, tempo, dynamics; Playing simple percussion instruments; Singing with proper breath control
- Arts: Traditional arts of one's region — weaving, pottery, wood carving; Elements of art — line, shape, color, texture; Drawing from observation

**Term 2 — Music and Arts: Faiths and Beliefs**
- Music: Religious and ceremonial music — choral singing; Musical notation — notes, rests, time signature (4/4, 3/4)
- Arts: Religious art and architecture in the Philippines; Relief and bas-relief; Creating art inspired by local traditions

**Term 3 — Music and Arts: Legends and Folklore**
- Music: Music from Philippine legends and epics — kulintang, kubing, gong; Characteristics of Mindanao music; Reading and writing musical notation
- Arts: Illustration and storytelling through art; Comic strip and narrative art; Principles of design — balance, emphasis, contrast

**Term 4 — Music and Arts: Celebrations**
- Music: Festival music of the Philippines — Sinulog, Ati-Atihan, Pahiyas; Ensemble playing
- Arts: Festival arts — costumes, props, masks; Collaborative mural; Review of elements and principles of art

**PE and Health (Terms 1–4)**
- Q1: Personal Health (hygiene, nutrition, rest) + Target games (darts, archery activities)
- Q2: Family Health (family planning concepts, age-appropriate) + Invasion games (flag football, basketball modified)
- Q3: Food Literacy (reading food labels, balanced diet) + Rhythmic activities and folk dances
- Q4: Consumer Health (evaluating health products) + Rhythmic activities and creative movement

---

### EPP — ICT (Grade 4, Quarter I Only)

- Introduction to Computer: Importance of computers; Parts of a computer system and peripherals; Basic computer operations (booting, shutting down, keyboard and mouse techniques)
- Digital Citizenship: Digital health and wellness; Screen time and posture; Online security and safety rules for children
- Word Processing: User interface; Page size, orientation, margin; Font type/style/size/color; Text alignment; Creating a word document
- Presentation Software: User interface; Page design/theme; Inserting and formatting textbox, WordArt, shapes, and images; Creating a presentation
- Desktop Publishing: User interface; Templates; Inserting and formatting elements; Creating a desktop publishing document
- Spreadsheet Software: User interface; Borders; Basic formula (MDAS); Creating a spreadsheet
- Block Coding: Algorithm — steps to solve everyday problems; Basic process flowchart; Creating an algorithm and flowchart for a given task

---

### EPP — AFA / FCS / IA (Grade 4, Quarters II–IV)

**Quarter II — Agriculture and Fishery Arts (AFA): Paghahalaman**
- Agrikultura at mga sangay sa paghahalaman (agronomy, horticulture, forestry); Pamamaraan ng pagtatanim (natural, organic, intercropping, contour farming, multiple cropping); Alternatibong paraan (urban gardening, vertical gardening, hydroponics, aquaponics)
- Compost at organikong pataba; Natural na pestisidyo (OHN 1, OHN 2, Neem tree oil)
- Pagtatanim ng halamang ornamental, gulay, at punong-prutas; Pangangalaga, pag-aani, pag-iimbak, at pagbebenta ng mga tanim

**Quarter III — Family and Consumer Science (FCS)**
- Tungkulin sa Sarili: Pangangalaga sa katawan; Angkop na kagamitan; Wastong pananamit sa panahon ng pagbibinata/pagdadalaga
- Tungkuling Pantahanan: Pagsasaing (conventional at rice cooker); Paghuhugas ng pinggan; Paglilinis ng iba't ibang bahagi ng tahanan; Paglalaba (conventional at washing machine); Pamamalantsa

**Quarter IV — Industrial Arts (IA)**
- Kasangkapan at materyales sa pagguhit; Sistema ng pagsukat (English at Metric; unit conversion)
- Free-hand drawing (basic sketching, outlining, shading); Lettering styles; Alphabet of lines
- Orthographic drawing; Isometric drawing; Pagre-recycle — pagbuo ng malikhaing proyekto mula sa recyclable materials; Pagtutuos ng gastos at posibleng kita

---

### GMRC (Grade 4)

**Term 1 — Katapatan at Pananagutan**
- Katapatan sa sarili, sa pamilya, at sa Diyos; Katapatan bilang pundasyon ng tiwala
- Pananagutan sa sariling gawi at pagpapasya; Pagtanggap ng kahihinatnan ng mga pagpili

**Term 2 — Pagmamahal at Malasakit**
- Pagmamahal sa kapuwa bilang pangunahing aral; Malasakit at empatiyang ipinakita sa araw-araw
- Pakikiisa sa mga gawain para sa kapakanan ng komunidad

**Term 3 — Katarungan at Karangalan**
- Kahulugan ng katarungan; Pantay na pagtrato sa lahat anuman ang pinagmulan
- Karangalan — pagpapahalaga sa sarili at sa iba; Pagiging huwaran ng mabuting pag-uugali

**Term 4 — Pagmamahal sa Bayan**
- Pagkilala sa kasaysayan at kultura ng Pilipinas bilang batayan ng pagmamahal sa bayan
- Pagtupad ng tungkulin bilang batang Pilipino; Pangangalaga ng kalikasan bilang bahagi ng pagmamahal sa bayan

---

## SUBJECT SCHEDULE REFERENCE

Grade 4 typical weekly schedule (verify against actual school schedule):

| Day | Subjects |
|-----|---------|
| Monday | English + Araling Panlipunan |
| Tuesday | GMRC + Filipino |
| Wednesday | English + Mathematics |
| Thursday | Filipino + Science |
| Friday | Weekly Review (all subjects) |

> MAPEH and EPP (ICT or AFA/FCS/IA depending on the quarter) are scheduled on rotating days — typically 2–3 days per week. Confirm with the learner's actual schedule. On weeks where MAPEH or EPP is included, add it to the relevant day's subjects.
