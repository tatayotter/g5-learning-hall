# Weekly Package Generation Prompt
## Grade 6 | Learning Hall

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
You are a curriculum assistant for a Filipino Grade 6 learner (age 11-12).
Generate a weekly package JSON for the week of [DATE e.g. July 20, 2026] — Week [X].
(Week number is CONTINUOUS for the whole school year. Week 1 = Jun 15 orientation; lessons begin Week 2. Never restart the count at a new term — write "Week 15", not "Term 2 Week 1".)

OUTPUT RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Top-level keys are day names: Monday, Tuesday, Wednesday, Thursday, Friday
- Each day has subject keys (e.g. "English", "Mathematics", "Science")
- Each subject has exactly two fields: "summary_markdown" and "quiz"
- summary_markdown: a well-structured lesson note appropriate for an 11-12 year old. Include:
  * Organized bullet points or numbered steps; clear concept explanations with real-world relevance
  * At least 2 worked examples with full reasoning shown (especially for Math and Science)
  * Key vocabulary and concepts in bold
  * Mature, respectful tone — treat the learner as capable of critical thinking
  * NO "Tomorrow's Sneak Peek" section
- quiz: an array of 8 questions, each with:
  * "question" — clear, Grade 6-appropriate wording; may include short stimulus text or data for higher-order questions
  * "options" — array of exactly 4 strings
  * "correct_answer" — must exactly match one of the option strings
- OPTION LENGTH (mandatory): All answer options in a question must be approximately the same length. The correct answer must NOT be longer than the distractors. If lengths must differ, the longest option must sometimes be a wrong answer — never default to the correct answer being longest. Trim correct answers or extend distractors to balance.
- Difficulty: analysis, inference, and evaluation. For SSES subjects (English, Mathematics, Science), at least 4 of 8 questions must require critical thinking — multi-step reasoning, inference, interpretation, or evaluation. Avoid questions with obviously incorrect distractors; all four options should be plausible to a learner who partially understands the topic. For other subjects, include at least 2 higher-order questions per 8.
- Friday is always "Weekly Review" covering all subjects from Mon–Thu

GRADE LEVEL: 6
LANGUAGE: English for English, Mathematics, Science, EPP | Filipino for Filipino, Araling Panlipunan, GMRC | MAPEH uses Filipino for instructions, English for technical terms

SUBJECTS AND TOPICS FOR THIS WEEK (from BOW):
[PASTE THE WEEK'S SUBJECTS AND COMPETENCIES HERE — see BOW reference below]

Generate the full JSON now.
```

---

## BOW REFERENCE — GRADE 6

_Regenerated 2026-08-26 directly from the DepEd-audited `budget_of_work` Supabase table (the app's public `/curriculum/grade-6` source), so this file and that table no longer diverge — including merging that table's own leftover "Ikaapat na Termino"/"Term 4" sections into Term 3, since MATATAG runs 3 terms. See [[project_bow_dual_source_discovery]]. Grade 6's own DepEd-CG accuracy audit has not been done yet — only Grades 2, 3, and 5 have been verified against the official curriculum guides so far._

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

> **EPP note:** EPP is tracked as two BOW rows — ICT (Term 1 only) and AFA/FCS/IA (Term 2 = Fishery Arts, Term 3 = FCS + IA combined).

---

### ENGLISH (Grade 6) ★ SSES

All terms share the same purpose/context focus: culture-based texts (Indigenous Peoples and regional celebrations).

**Term 1 — Narrative and Persuasive Texts**
- Literary: story-grammar elements; sequence 8+ events; flashback plot; hyperbole/irony; inferring author's/speaker's purpose, message, audience; predictions; conclusions; main idea; summary
- Informational: inductive-deductive (diamond) outlining; persuasive text type; author's purpose; fact vs. opinion; propaganda (name-calling, glittering generalities, transfer)
- Writing: context clues from punctuation; almanac use; intransitive verbs; perfect tenses; prepositional phrases as adjectives; order of adverbs; noun/pronoun/adjective complements; compound-complex sentences; evidence-based writing; non-verbal cues; printed personal-data survey form

**Term 2 — Persuasive and Informational Texts**
- Same literary/informational progression, continued; propaganda adds testimonials, plain folks, bandwagon
- Writing: directories as reference; open-ended printed survey form; same grammar repertoire continued

**Term 3 — Critical Reading, Research, and Literary Analysis**
- Synthesizing multiple sources; comparing perspectives; evaluating author credibility; propaganda adds fear, half-truths/spin, bad logic, card stacking
- Writing: handbooks/manuals as reference; research-based essay; in-text citation; oral and digital/online survey forms; literary essay; reflective essay; self-editing/peer review
- Philippine and world literature excerpts; comparing cultural perspectives; extended metaphor/symbolism

---

### FILIPINO (Grade 6)

**Term 1 — Tulang Pambata, Dula, Maikling Kwento, Siyensyang Piksyon; Eksposisyon**
- Talasalitaan: arkaismo/neologismo, jargon, salitang pilosopiko
- Gramatika: lahat ng pokus ng pandiwa; uri ng sugnay; empatikong pangungusap
- Teksto: siyensyang piksyon; eksposisyon (thesis, argumento, katibayan, kongklusyon)

**Term 2 — Tula, Dula, Maikling Kwento, Siyensyang Piksyon; Eksposisyon (2nd part)**
- Talasalitaan: kolokasyon/idyoma sa kontekstong pangkultura
- Gramatika: apositibo, relatibong sugnay
- Teksto: mas malalim na pagsusuri ng dula; paghahambing ng dalawang akda

**Term 3 — Lahat ng Genre; Persweysib at Editoryal**
- Talasalitaan: bokabularyo ng panitikan/pagsusuri; salitang kultural/historikal
- Gramatika: pasibo/aktibong anyo; retorika ng argumento; pagsulat ng mataas na antas
- Teksto: persweysibong sanaysay (claim/warrant/backing); editoryal; nobela (tema, simbolismo, punto de bista); malikhaing akda

---

### MATHEMATICS (Grade 6) ★ SSES

**Term 1 — Tessellation and Transformations; Decimals, Fractions, Whole/Mixed Numbers**
- Tessellation exploration; translation/reflection/rotation of shapes
- Adding/subtracting decimals to 4 places incl. money; mental multiply/divide decimals by powers of 10; repeating decimal quotients
- Multiplying/dividing combinations of fractions, whole numbers, mixed numbers

**Term 2 — Ratio, Proportion, Percent, Exponential Form**
- Ratio (part-whole, part-part); equivalent ratios; proportion via tables/double number line
- Percent-fraction-decimal relationships and uses
- Exponential form — writing, evaluating, GEMDAS with exponents

**Term 3 — Volume, Perimeter/Area, Circles, Area of Circle, Data, GCF/LCM**
- Volume of cube/rectangular prism (units, conversion cu.cm↔L)
- Area of composite figures; perimeter/area of triangles, parallelograms, trapezoids
- Circles — parts, circumference (C=πd/2πr), inductive area (A=πr²); shaded regions
- Pie graphs — angle/percentage, constructing, interpreting, drawing conclusions
- GCF and LCM via listing, prime factorization, continuous division

---

### SCIENCE (Grade 6) ★ SSES

**Term 1 — Materials: Changes of State, Mixtures, Separation Techniques**
- Changes of state (melting, evaporation, freezing, condensation) and heat energy
- Physical (reversible) vs. chemical (irreversible) changes
- Uniform/non-uniform mixtures (solutions, suspensions); air as a mixture
- Separation techniques (decantation, winnowing, filtering, magnets); fair-test features, 3+ trials

**Term 2 — Living Things: Circulatory System, Plant Reproduction, Vertebrates/Invertebrates, Food Webs**
- Circulatory system parts and function
- Plant reproduction — pollination, seed production, propagation (cutting, budding, layering, grafting); fair-test investigation of propagation methods
- Vertebrates vs. invertebrates; producers/consumers/scavengers/decomposers in a food web; biotic vs. abiotic factors

**Term 3 — Force/Motion/Energy (Simple Machines, Waves) and Earth/Space**
- Simple machines (inclined planes, wedges, levers, pulleys) — advantages/limitations; levers changing force
- Waves carry energy; water-wave investigation; longitudinal vs. transverse waves; sound and moving source/receiver
- Volcanoes — formation, nearest local volcano, PHIVOLCS Alert Levels
- Philippine seasons; Earth's rotation (day/night) and Sun-Earth-Moon model (seasons, eclipses); constellations and indigenous night-sky knowledge

---

### ARALING PANLIPUNAN (Grade 6)

_Paksang-Taunan: Mga Hamon at Pagtugon sa Pagkabansa — kasaysayan ng Pilipinas 1872 hanggang kontemporanyong panahon_

**Term 1 — Tungo sa Kalayaan ng Pilipinas**
- Katipunan — pagkakatatag, layunin, paglaganap; Himagsikang Pilipino (1896-98) — Pugadlawin, Tejeros, Biak-na-Bato
- Deklarasyon ng Kasarinlan (1898), Konstitusyon ng Malolos, Republika ng Malolos; papel ng kababaihan sa Himagsikan

**Term 2 — Ang Pilipinas sa Harap ng Imperyalismong Amerikano at Hapones**
- Digmaang Pilipino-Amerikano; Batas Sedisyon, edukasyon, kalakalan sa ilalim ng Amerikano
- Philippine Bill 1902, Pilipinisasyon, Batas Jones; Komonwelt (Saligang Batas 1935, women's suffrage)
- Imperyalismong Hapones — Bataan-Corregidor, Death March; HUKBALAHAP at kilusang gerilya

**Term 3 — Mga Hamon Bilang Malayang Bansa (1946-Kasalukuyan)**
- Ikatlong Republika; Cold War; neokolonyalismo (Parity Rights, Bell Trade Act)
- Diktadurang Marcos — Batas Militar, karapatang pantao; EDSA People Power I
- Saligang Batas 1987; mga administrasyon pagkatapos ng EDSA; kontemporaryong hamon (kahirapan, korupsiyon, kalamidad); Pilipinas sa UN/ASEAN, OFW/diaspora

---

### MAPEH (Grade 6)

**Term 1 — Music/Arts: Revolutionary Period (1801-1898); PE/Health — Holistic Wellness & Target/Invasion Games**
- Music: timbre, dynamics in sacred/secular music of the period; Arts: theater forms, character/conflict focus; dance forms
- Health: interdependence of holistic-wellness dimensions (physical, mental, emotional, social, spiritual, occupational, cultural, financial, environmental)
- PE: modified target/invasion games — movement concepts, locomotor/manipulative skills, fitness

**Term 2 — Music/Arts: American Colonial Period (1898-1935); PE/Health — Sexual/Reproductive Health & Striking-Fielding/Net-Wall Games**
- Music: rhythm/meter/tempo of classical/semi-classical/popular music; Arts: symbolic/seditious theater, dramatic structure; dance
- Health: healthy sexuality, early-pregnancy prevention, assertive/refusal skills, family's role
- PE: modified striking/fielding or net/wall games

**Term 3 — Music/Arts: Commonwealth/Japanese Occupation (1935-46) and Contemporary "My Filipino Identity"; PE/Health — Disease Prevention, Environmental Health, Rhythmic Activities**
- Music: melody/harmony in period folk music; texture/form in contemporary period; Arts: staging/spectacle then Filipino-identity performance works
- Health: common communicable diseases (transmission, chain of infection, vaccination); environmental health/One Health, sanitation, 8Rs waste management
- PE: Dance Exercise, local/regional street dance and festival, traditional/national dances
- Year-end project: contemporary creative work on historical/cultural/national identity + PE/Health showcase

---

### EPP (ICT) (Grade 6, Term 1 Only)

**Term 1: Online Collaboration Tools, Productivity Software, and Block Coding**
- Web conferencing, online form builders, cloud storage/file management — safe and responsible use
- Word processing (watermark, borders, headers/footers), slide recording, desktop publishing (master page, guides), spreadsheets (charts, data validation)
- Block coding — sensing, operators, variables for an animation/game/digital story

---

### EPP (AFA/FCS/IA) (Grade 6, Terms 2-3)

**Term 2 (AFA — Fishery Arts): Natural Fish Raising, Harvesting, Selling**
- Fish culture/capture/processing branches; support agencies (DA, BFAR, DENR); successful fish raisers
- Requirements for natural fish raising (water supply, stocking density, feeds); fish anatomy; common diseases
- Procedure — pond/tank prep, stocking, feeding, water/aeration management, monitoring, harvesting, selling with income/expense recording

**Term 3 (FCS & IA): Family Resources/Food Prep/Preservation; Wood/Metal/Electrical Works**
- FCS: family resources/budget; meal planning and food hygiene/safety; kitchen tools, measuring/cutting techniques, dry/moist-heat cooking; food preservation (salting, sugar-concentration, pickling, drying), packaging/labeling, selling
- IA: wood/bamboo joints and finishing; sheet metal joining/finishing; basic electrical (current types, circuit parts, splicing) — all with safety precautions
- Product Development — creating and selling a simple wood/metal/electrical project

---

### GMRC (Grade 6)

**Term 1 — Pagpapaunlad ng Positibong Pagkilala sa Sarili**
- Pagkilala sa sarili bilang may dignidad; positibong pagtingin sa sarili; mapanagutang pagpapasiya; pakikipag-ugnayan sa Diyos; pagtitipid ng enerhiya; pagkilala sa mga Pilipinong may kontribusyon sa bayan

**Term 2 — Pamilya Katuwang sa Paglinang ng mga Mabuting Gawi**
- Ugnayan sa mga nakatatanda; pagpapahayag ng saloobin; pagtupad ng tungkulin sa pamilya; sama-samang pagsamba; paglilingkod ng pamilya; pagsunod sa batas-pangkapaligiran; pakikipagbayanihan

**Term 3 — Paglalapat ng mga Mabuting Gawi sa Pakikipagkapuwa**
- Pagtugon sa pambubulas ng kapuwa (Lakas ng loob) → Pagtugon sa emosyon ng kapuwa (Mapagpasensiya) → Pagiging patas sa kapuwa (Makatarungan) → Pananampalataya tungo sa pakikipagkapuwa (Pananalig sa Diyos) → Espirituwalidad sa pakikipagkapuwa (Mapagmalasakit) → Pagiging mabuting katiwala ng kalikasan (Mapagmalasakit) → Musika/sayaw ng lahi (Nasyonalismo)
- **(Term 3, continued) — Pamayanan Bilang Tagapaglinang ng mga Mabuting Gawi para sa Bayan:** Pagkalinga sa napapabayaan ng lipunan (Mapagmalasakit) → Pananagutan sa sariling kilos sa pamayanan (Mapanagutan) → Pakikipag-ugnayan sa awtoridad (Magalang) → Kawanggawa bunga ng pananampalataya (Pananalig sa Diyos) → Tradisyon/gawain mula sa pananampalataya (Pakikiisa) → Isyung pangkapaligiran (Pakikiisa) → Pagkabukod-tangi ng lahing Pilipino (Nasyonalismo)

---

## SUBJECT SCHEDULE REFERENCE

Grade 6 fixed weekly subject schedule (matches `GRADE_5_SCHEDULE` in `subjectSchedule.ts` — shared by Grades 4, 5, 6):

| Day | Subjects |
|-----|---------|
| Monday | English · Mathematics |
| Tuesday | Filipino · Science |
| Wednesday | Araling Panlipunan · EPP (ICT) |
| Thursday | MAPEH · GMRC · EPP (AFA/FCS/IA)* |
| Friday | Weekly Review (all subjects) |

> *EPP (AFA/FCS/IA) is only active in Terms 2–3. Omit it from Thursday during Term 1.
> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.
