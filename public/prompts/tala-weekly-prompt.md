# TALA — Weekly Package Generation Prompt
## Grade 2 | Learning Hall

---

## HOW TO USE THIS PROMPT

1. Find the current school week number (e.g. **Week 9**) — continuous from school opening, does NOT restart per term
2. Look up the matching week in the BOW reference below
3. Fill in the `[DATE]`, `[WEEK NUMBER]`, and `[SUBJECTS]` placeholders
4. Paste the completed prompt into Claude, ChatGPT, or Gemini
5. Copy the JSON output into the Weekly Package Builder in Admin → Save for Tala

---

## THE PROMPT

```
You are a curriculum assistant for a Filipino Grade 2 learner named Tala (age 7-8).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Week [X].
(Week number is CONTINUOUS for the whole school year. Week 1 = Jun 15 orientation; lessons begin Week 2. Never restart the count at a new term — write "Week 15", not "Term 2 Week 1".)

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
LANGUAGE: English for English, Mathematics, Science, Computer subjects | Filipino for Filipino, GMRC, Makabansa subjects

SUBJECTS AND TOPICS FOR THIS WEEK (from BOW):
[PASTE THE WEEK'S SUBJECTS AND COMPETENCIES HERE — see BOW reference below]

Generate the full JSON now.
```

---

## BOW REFERENCE — TALA GRADE 2

_Regenerated 2026-08-26 directly from the DepEd-audited `budget_of_work` Supabase table (the app's public `/curriculum/grade-2` source), so this file and that table no longer diverge. See [[project_bow_dual_source_discovery]]._

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

### ENGLISH (Grade 2)

**Term 1 — Oneself and Family**
- Phonological awareness: rhymes, onset/rime; CVC words, sight words
- Nouns (common/proper, gender), verbs, adjectives, personal pronouns
- Declarative and interrogative sentences (capitalization, punctuation, intonation); time-order markers
- Narrative comprehension: elements, sequencing 3+ events, problem/solution, feelings/traits, cause-effect, predicting, summary
- Informational text: 3+ details, problem/solution, time-order/procedural type
- Composing: greetings, retelling myths/legends/fables, reacting to a story, summary

**Term 2 — School and Community**
- Word patterns expand to CVCe, CVVC; vocabulary shifts to school then community topics
- Adds interrogative pronouns (who/what/which/whose), then possessive pronouns (mine/yours/his/hers)
- Adds imperative and exclamatory sentences — all 4 sentence types by term end
- Comprehension: sequencing grows to 3-4 events; informational texts add description text type
- Composing centers on school/community experiences using expanded vocabulary and all sentence types

**Term 3 — Physical Environment**
- Word patterns expand to CVCC, CCVC (clusters/diphthongs), VCV, VCCV
- Vocabulary: physical environment (land/water forms, weather, plants, animals, seasons) + Science terms
- Completes word-function set with possessive and demonstrative pronouns (this/that/these/those); introduces synonyms/antonyms
- All 4 sentence types used, sequenced, parsed into subject/predicate, correctly punctuated
- Comprehension: summarizing narratives, identifying main message/lesson; informational texts continue 3-4 details
- Composing: reacting to and summarizing texts on physical-environment/Science topics using synonyms/antonyms

---

### MATHEMATICS (Grade 2)

**Term 1 — Numbers to 1000, Shapes, Addition, Money**
- Circles/half/quarter circles; composite figures (squares, rectangles, triangles, circles) using cut-outs and grids
- One-direction multi-step slide (translation) of basic shapes
- Numbers to 1000: count, read/write, represent, count by 2s/5s/10s/20s/50s/100s, order, place value (ones/tens/hundreds)
- Ordinal numbers to 20th
- Addition to 1000 (expanded form, with/without regrouping); identity/commutative/associative properties
- Philippine coins and bills to ₱1000 (centavo/peso coins/bills, combined); comparing values
- Addition word problems including money, with/without regrouping

**Term 2 — Length, Subtraction, Patterns, Pictographs, Multiplication Intro**
- Measuring/comparing/estimating length and distance (m, cm) using appropriate tools; solving length/distance problems
- Subtraction where both numbers <100 with regrouping, then <1000 with/without regrouping; 1- and 2-step word problems including money
- Increasing/decreasing patterns (numbers, letters, rhythm, visual art, repetitions) — determine next term, create new patterns
- Pictographs with a scale: present raw/tabular data as pictograph and vice versa; interpret with/without scale
- Multiplication as repeated addition — equal groups ("5 groups of 3"); models: groups, arrays, counting by multiples, number line

**Term 3 — Multiplication/Division Tables, Fractions, Time, Perimeter**
- Multiplication and division using 2, 3, 4, 5, 10 tables, including money word problems
- Division as equal sharing/repeated subtraction; missing number in multiplication/division sentences; even/odd via division by 2
- Unit fractions (denominators 2,3,4,5,6,8) — represent, read/write, order; similar fractions — represent, read/write, order
- Duration via calendar (days/weeks); telling time in hours/minutes with a.m./p.m. on an analog clock
- Elapsed time (minutes/hour, hours/day, days/week, timetables); straight vs. curved lines, flat vs. curved surfaces
- Perimeter: measure using tools; find and solve problems for triangles, squares, rectangles

---

### FILIPINO (Grade 2)

**Term 1 — Sarili at Pamilya**
- Kamalayang ponolohikal: tunog ng Alpabeto, tugmang salita, pagbibilang ng pantig, onset-rime, blending/segmenting
- Sight words (ako, ikaw, siya, ang, ng, sa...); salitang CVC/CVCV; pagbasa ng payak na pangungusap
- Talasalitaan: pambungad-sa-sarili, pamilya, GMRC/MAKABANSA-tuong salita; pangngalan, pandiwa, pang-uri, panghalip panao
- Gramatika: payak na pangungusap — paturol at patanong; salitang-pananong; malaking titik at bantas
- Teksto naratibo: tauhan/tagpuan/pangyayari, damdamin ng tauhan, suliranin-solusyon, sanhi-bunga, buod
- Teksto impormatibo: tiyak na detalye (sino/ano/saan); pagsasalaysay ng sariling karanasan; personal na reaksiyon

**Term 2 — Sarili at Komunidad**
- Dagdag na tunog: diptonggo (ay/aw/iw/oy/uy), klaster (pl/pr/tr/bl); mas mabilis at may-ekspresyong pagbasa
- Talasalitaan: paaralan at komunidad; panghalip na pananong (sino/ano/alin/kanino/ilan)
- Gramatika: pangungusap na pakiusap/pautos at padamdam; pangngalang kongkreto vs. di-kongkreto; pangngalang paari
- Teksto: pagsunod at pagsasalaysay ng 3-4 pangyayari; pangunahing ideya ng talata; maikling talata (3-5 pangungusap)

**Term 3 — Sarili, Komunidad, at Kapaligiran**
- Dagdag na tunog: KPK/KKP na pantig; mas mataas na antas ng fluency sa 2-3 talataan
- Talasalitaan: kapaligiran (kalikasan, ilog, bundok, dagat, hangin, ulan, polusyon, basura, pagtatanim); pamatlig; magkasalungat/magkasingkahulugan
- Gramatika: simuno at panaguri; paglawak gamit ang pang-uri at pang-abay na panlunan/panahon
- Teksto: pagsunod sa 4-5 pangyayari; mensahe/aral ng kuwento; buod (3-4 pangungusap)
- Pagsulat: tekstong impormatibo tungkol sa pangangalaga sa kapaligiran, babala, balitang pambata (5W)

---

### GMRC (Grade 2)

**Term 1 — Pagpapahalaga sa Sarili**
- Wk1-2: Batayang impormasyon ng sarili at pamilya — pangalan, edad, kaarawan, tirahan (Valuing oneself)
- Wk3-4: Pangangalaga sa kalusugan gabay ang pamilya — kalinisan, kaligtasan (Valuing oneself)
- Wk5-6: Sariling damdamin — pagkilala at wastong pagpapahayag (Sincerity)
- Wk7-8: Pansariling panalangin — pasasalamat, kahilingan (Prayerful)
- Wk9-10: Pagtitipid na nakabubuti sa kapaligiran (Prudent)
- Wk11: Mga tungkulin ng batang Pilipino sa pamayanan (Obedience)
- Wk12-13: Pagkilala ng sariling kakayahan/talento sa tulong ng pamilya (Self-confidence)

**Term 2 — Pakikitungo sa Kapuwa**
- Wk1-2: Wastong paraan ng pakikipagkapuwa (Accountability)
- Wk3-4: Disiplinang pansarili sa pampublikong pasilidad (Compassion)
- Wk5-6: Maayos na pag-uusap sa loob ng pamilya (Patience)
- Wk7: Katapatan sa pamilya bilang gabay sa pakikipagkapuwa (Honesty)
- Wk8-9: Gawaing panrelihiyon o paniniwala ng pamilya (Obedience)
- Wk10-11: Kalinisan sa tahanan (Orderliness)
- Wk12: Mabuting pagtanggap ng pamilya sa bisita (Hospitality)
- Wk13: Paggawa ng kabutihan sa kapuwa (Loving)
- Wk14: Pagkilala sa kabutihan ng kapuwa (Gratitude)

**Term 3 — Pakikibahagi sa Komunidad**
- Wk1: Paggalang sa iba't ibang relihiyon o paniniwala ng kapuwa (Respect)
- Wk2-3: Pangangalaga sa kapaligiran katuwang ang kapuwa-bata (Compassion)
- Wk4-5: Pagbabayanihan ng kapuwa-bata para sa pamayanan (Helpful)
- Wk6-7: Pakikiisa ng pamilya sa pamayanan (Accountability)
- Wk8-9: Mga pagdiriwang sa pamayanan (Friendly)
- Wk10: Gawain ng relihiyon na tumutulong sa pamayanan (Cooperation)
- Wk11: Pangangalaga ng kapaligiran sa pamayanan (Compassion)
- Wk12-13: Mga kabayanihan sa sariling bayan (Love of Country)

---

### MAKABANSA (Grade 2)

**Term 1 — Ang Ating Komunidad**
- Wk1: Konsepto ng komunidad
- Wk2-5: Sariling komunidad — lokasyon, lawak/sukat, palatandaang heograpikal
- Wk6-8: Mga bumubuo sa komunidad (mga tao, institusyon)
- Wk9-10: Pagpapahalaga sa mga bumubuo ng komunidad

**Term 2 — Ang Kultura ng Ating Komunidad**
- Wk1-2: Kahulugan ng kultura
- Wk3-5: Kulturang materyal at di-materyal ng komunidad
- Wk6-8: Kaugnayan ng kultura sa paghubog ng pagkakakilanlan
- Wk9-10: Pagpapahalaga sa kultura ng komunidad

**Term 3 — Pakikipagkapuwa at Pakikibahagi**
- Wk1-3: Uri ng kabuhayan — agrikultural, industriyal, pampinansyal, panserbisyo
- Wk4-6: Pamumuhay at serbisyo ng komunidad
- Wk7: Pagpapahalaga sa pamumuhay at serbisyo
- Wk8: Konsepto ng pakikipagkapuwa at pakikibahagi
- Wk9: Pamamaraan ng pakikipagkapuwa at pakikibahagi
- Wk10: Pagpapahalaga sa pakikipagkapuwa at pakikibahagi

---

### COMPUTER (Grade 2 — App-Added Bonus Subject)

_Not part of official MATATAG Grade 2 (which has only 5 subjects) — see [[project_grade2_bow_deped_audit]] — but included in the regular weekly generation schedule as of 2026-08-26, same as any other Grade 2 subject._

**Term 1 — Getting to Know My Computer**
- What a computer is; recognizing everyday examples (desktop, laptop, tablet, smartphone)
- Main parts (monitor, CPU, keyboard, mouse) and accessories (speakers, printer, webcam)
- Turning a computer on/off safely; caring for equipment
- Mouse skills — grip, single/double-click, click-and-drag, scroll, opening icons

**Term 2 — My Keyboard and Simple Computer Programs**
- Keyboard layout, special keys (Shift, Backspace, Enter); typing one's name and simple words
- Simple drawing/paint program — tools, coloring, erasing
- Simple word-processing/typing program — short sentences, basic formatting
- Saving and opening a file with adult guidance

**Term 3 — Using Computers Safely and Creatively**
- What is the internet (age-appropriate); recognizing content made for kids vs. not
- Screen-time basics; always asking an adult before going online
- Keeping personal information private; digital manners; recognizing and reporting unsafe situations
- Combining mouse/keyboard skills in a simple project; year-end review of care habits and online-safety rules

### SCIENCE (Grade 2 — App-Added Bonus Subject)

_Not part of official MATATAG Grade 2 (which has only 5 subjects) — see [[project_grade2_bow_deped_audit]] — but included in the regular weekly generation schedule as of 2026-08-26, same as any other Grade 2 subject._

**Term 1 — Living/Nonliving Things, My Body and Senses**
- Living vs. nonliving things — characteristics; sorting objects
- Basic needs of living things (air, food, water, space, shelter)
- External body parts; the five senses and how they work together
- Healthful habits protecting senses/body; safety practices at home and school

**Term 2 — Plants and Animals, Weather and Seasons**
- Plant parts and their jobs; what plants need to grow; observing a growing seed
- Animals by habitat and movement; animal basic needs and self-protection; simple life cycles
- Caring for plants and animals
- Everyday weather conditions and simple weather tools; the two Philippine seasons (rainy/dry)
- How weather/seasons affect daily life

**Term 3 — Matter, Force and Simple Machines, Earth and Sky, Environment**
- Matter and its observable properties; three states of matter; simple changes (melting, evaporation)
- Push and pull; simple machines (lever, wheel-and-axle, inclined plane, pulley, wedge)
- Day and night, shadows; simple observations of the moon and stars
- Caring for the environment — reduce/reuse/recycle, waste segregation; saving water/electricity

---

## SUBJECT SCHEDULE REFERENCE

Tala's fixed weekly subject schedule (matches `GRADE_2_SCHEDULE` in `subjectSchedule.ts`):

| Day | Subjects |
|-----|---------|
| Monday | English · Mathematics |
| Tuesday | Filipino · Science |
| Wednesday | Makabansa · Computer |
| Thursday | GMRC |
| Friday | Weekly Review (all subjects) |

> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.

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
