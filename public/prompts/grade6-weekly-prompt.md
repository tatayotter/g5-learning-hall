# Weekly Package Generation Prompt
## Grade 6 | G5 Learning Hall

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

Use this to fill in the `SUBJECTS AND TOPICS` section above each Sunday.

> ### 📅 SY 2026-2027 Week Map
> BOW entries use internal week numbers (reset per quarter). Convert to continuous school week using the offsets below.
>
> | Period | School Weeks | Approx. Dates | BOW → School |
> |--------|-------------|---------------|--------------|
> | **Week 1** — Orientation (no lessons) | 1 | Jun 15–19, 2026 | — |
> | **Q1 / Term 1** | 2–13 | Jun 22 – Sep 12, 2026 | BOW Week N → **Week N+1** |
> | *(Term 1 end / break)* | 13–14 | Sep 13–19, 2026 | — |
> | **Q2 / Term 2** | 15–27 | Sep 22 – Dec 18, 2026 | BOW Week N → **Week N+14** |
> | *(Term 2 end / break)* | 28–29 | Dec 21, 2026 – Jan 2, 2027 | — |
> | **Q3 / Term 3** | 30–40 | Jan 5 – Mar 20, 2027 | BOW Week N → **Week N+29** |
> | **Q4 / Term 3 (cont.)** | 41–50 | Mar 23 – May 29, 2027 | BOW Week N → **Week N+40** |
>
> *Example: BOW "Q2 Week 3" = School Week 3+14 = **Week 17***.
> *Next week (Aug 24–28) = **School Week 11** = BOW Q1 Week 10 (Review week).*

> **EPP note:** EPP rotates through four strands across the year. Quarter I = ICT. Quarter II = Fishery Arts (AFA). Quarter III = Family and Consumer Science (FCS). Quarter IV = Industrial Arts (IA). Include the active strand for the current quarter.

---

### ENGLISH (Grade 6) ★ SSES

**Term 1 — Narrative and Expository Texts**
- EN6LR: Literary text — narrative; Elements (plot, characterization, setting, theme, conflict resolution); Author's craft (diction, imagery, tone, mood); Inferencing character motives
- EN6SW: Writing — narrative composition with literary devices; Survey form (print format); Using evidence from text to support interpretations
- EN6VR: Vocabulary — propaganda techniques in texts (bandwagon, testimonial, plain folks, card stacking); Nuanced word meaning; Figurative language in context

**Term 2 — Persuasive and Informational Texts**
- EN6LR: Persuasive text — claim, evidence, counter-argument, rebuttal; Evaluating the strength of evidence; Identifying logical fallacies (intro); Bias detection
- EN6SW: Writing — persuasive essay (5-paragraph); Oral survey form; Conducting and reporting a simple survey
- EN6VR: Vocabulary — advanced propaganda techniques (glittering generalities, name-calling, transfer); Denotation and connotation at the nuanced level; Academic language for argumentation

**Term 3 — Critical Reading and Research**
- EN6LR: Synthesizing information from multiple sources; Comparing texts with different perspectives on the same topic; Evaluating author credibility and purpose
- EN6SW: Writing — research-based essay; Digital survey form creation; In-text citation (basic MLA or APA format); Paraphrasing and quoting correctly
- EN6VR: Vocabulary — domain-specific vocabulary across subject areas; Etymology and word roots

**Term 4 — Literary Analysis and Reflection**
- EN6LR: Philippine and world literature — short novels, novellas (selected excerpts); Literary criticism (basic); Comparing cultural perspectives in literature
- EN6SW: Writing — literary essay; Reflective essay; Self-editing and peer review process
- EN6VR: Vocabulary — review of all vocabulary strategies; Vocabulary in standardized test formats; Extended metaphor and symbolism

---

### FILIPINO (Grade 6)

**Term 1 — Tulang Pambata, Dula, Maikling Kwento at Siyensyang Piksyon + Eksposisyon**
- Talasalitaan: Arkaismo at neologismo; Jargon at teknikal na salita sa iba't ibang larangan; Salitang may pilosopikong kahulugan
- Gramatika: Lahat ng pokus ng pandiwa — gamit at epekto sa pagpapahayag; Mga uri ng sugnay at estruktura ng pangungusap para sa retorikal na layunin; Pahayagang may diin (empatikong pangungusap)
- Teksto: Siyensyang piksyon — katangian, paksa, realismo at imahinasyon; Tulang pambata bilang mapanuring teksto; Eksposisyon — istruktura (thesis, argumento, katibayan, kongklusyon)

**Term 2 — Tula, Dula, Maikling Kwento at Siyensyang Piksyon + Eksposisyon (ikalawang bahagi)**
- Talasalitaan: Kolokasyon at idiom sa kontekstong pangkultura; Salitang may mataas na antas mula sa panitikang Pilipino
- Gramatika: Pagpapalawak ng pangungusap gamit ang apositibo at relatibong sugnay; Pahayag at patanong na retorikal
- Teksto: Mas malalim na pagsusuri ng dula — dramatikong teknik, diyalogo, stage direction; Paghahambing ng dalawang akda tungkol sa iisang paksa

**Term 3 — Lahat ng Tekstong Panpanitikan + Persweysib at Editoryal**
- Talasalitaan: Mga salitang nagpapakita ng posisyon at argumento; Metapora at simbolismo sa panitikan
- Gramatika: Pasibong anyo at aktibong anyo — epekto sa diin at tono; Retorika ng argumento sa wikang Filipino
- Teksto: Persweysibong sanaysay — pagtukoy ng claim, warrant, at backing (Toulmin model — basic); Editoryal — pakikinig at pagtugon sa iba't ibang pananaw; Pagsulat ng sariling editoryal

**Term 4 — Lahat ng Genre + Persweysib (panghuling bahagi)**
- Talasalitaan: Bokabularyo ng panitikan at pagsusuri; Salitang may kultural at historikal na kabuluhan
- Gramatika: Pagsulat ng mataas na antas — pagpili ng salita, istilo, at tono ayon sa layunin at mambabasa
- Teksto: Nobela — tema, symbolismo, punto de bista, naratibong estilo; Panghuling pagsusuri ng lahat ng genre na pinag-aralan; Pagsulat ng malikhaing akda (sariling pagpili ng genre)

---

### MATHEMATICS (Grade 6) ★ SSES

**Term 1 — Transformations and Ratio**
- Geometric transformations — translation, reflection, rotation, dilation; Describing transformations on the coordinate plane; Tessellations — creating and describing
- Ratio and rate — simplifying ratios, equivalent ratios; Rate problems (speed, price per unit, density)
- Proportion — direct and inverse proportion; Solving proportions in real-world contexts; Scale drawings and maps

**Term 2 — Percent and Exponents**
- Percent — percent increase and decrease; Discount, sales tax, commission; Simple interest revisited; Percent problems in real-world contexts
- Exponents — meaning and notation; Evaluating expressions with exponents; Scientific notation (intro)
- Order of operations (PEMDAS) — with exponents and grouping symbols; Evaluating algebraic expressions

**Term 3 — Volume, Area, and Circles**
- Volume — prisms (rectangular, triangular); Cylinders (V = πr²h); Composite 3D figures
- Area — circles (A = πr²); Composite figures combining polygons and circles; Surface area of prisms and cylinders (intro)
- Coordinate geometry — plotting and reading points in all four quadrants; Distance between two points (horizontal/vertical); Real-world applications

**Term 4 — Statistics and Number Theory**
- Circle (pie) graphs — reading, interpreting, constructing; Percent to degrees; Connecting pie graphs to fractions and percent
- Statistics — measures of central tendency (mean, median, mode) and spread (range); Choosing the best measure; Misleading graphs and statistics
- GCF and LCM — revisited with prime factorization; Applications in fractions and real-world problems
- Number patterns and sequences — arithmetic and geometric sequences; Finding the nth term (intro)

---

### SCIENCE (Grade 6) ★ SSES

**Term 1 — Materials: Mixtures and Separation**
- Review of mixtures — extending to colloids, suspensions, and solutions; Tyndall effect
- Separation techniques — distillation, chromatography, fractional distillation (concept); Industrial applications
- Acids and bases — properties, pH scale, indicators; Everyday acids and bases; Neutralization (basic)
- Chemical changes — types of chemical reactions (combination, decomposition, combustion — basic); Conservation of mass in reactions

**Term 2 — Living Things: Circulatory System, Reproduction, and Food Webs**
- Circulatory system — heart structure and function; Blood vessels (arteries, veins, capillaries); Blood components; Blood pressure and pulse
- Plant reproduction — sexual (flower, pollination, fertilization, seed dispersal) and asexual (vegetative propagation); Advantages of each
- Food webs — energy pyramids; Trophic levels; Biomagnification (intro); Importance of producers
- Human impact — antibiotic resistance (basic); GMOs (balanced overview); Endangered species

**Term 3 — Force, Motion, and Waves**
- Simple machines — revisited; Mechanical advantage calculation; Compound machines
- Work and power — Work = Force × distance; Power = Work ÷ time; Unit analysis
- Waves — properties (wavelength, frequency, amplitude, speed); Transverse vs. longitudinal waves; Sound and light as waves
- Electromagnetic spectrum — radio, microwave, infrared, visible, UV, X-ray, gamma; Applications and safety

**Term 4 — Earth and Space: Volcanoes, Seasons, and Earth's Motions**
- Volcanoes — magma vs. lava; Types (shield, composite, cinder cone); Philippine volcanoes; Volcanic hazards and monitoring
- Seasons — Earth's axial tilt; Revolution and the seasons; Equinoxes and solstices; Philippine dry and wet seasons
- Moon — phases and their causes; Lunar and solar eclipses; Tidal patterns
- Beyond Earth — exoplanets (intro); Space exploration milestones; Careers in astronomy and space science

---

### ARALING PANLIPUNAN (Grade 6)

> **Theme: Mga Hamon at Pagtugon sa Pagkabansa — Philippine History 1872 to the Present**

**Term 1 — Katipunan at Rebolusyon (1872–1898)**
- Kalagayan ng Pilipinas bago ang Rebolusyon — ekonomiya, pulitika, kultura sa ilalim ng Espanyol
- Propaganda Movement — sina Jose Rizal, Marcelo del Pilar, Graciano Lopez Jaena; La Liga Filipina
- Andres Bonifacio at ang Katipunan — pagkatatag, layunin, Cry of Pugad Lawin; Emilio Aguinaldo at Tejeros Convention
- Paghahari ng Amerikano — Labanan sa Manila Bay; Malolos Republic; Kasunduan ng Paris (1898); Filipino-American War

**Term 2 — Panahon ng Amerikanong Kolonyalismo (1898–1941)**
- Amerikanong pamamalakad — edukasyon, demokrasya, ekonomiya; Mga pagbabago sa lipunan at kultura
- Philippine Commonwealth — Manuel Quezon; Paghahanda para sa kalayaan; Saligang Batas ng 1935
- Paghahanda ng mga Pilipino para sa kalayaan — repormang panlipunan, ekonomiya, pulitikal
- Panahon ng Hapon — pananakop (1941); HUKBALAHAP; Pampublikong administrasyon sa ilalim ng Hapon; Paglaya (1945)

**Term 3 — Ikatlong Republika at Batas Militar (1946–1986)**
- Ikatlong Republika — pagkamit ng kalayaan (Hulyo 4, 1946); Mga unang pangulo; Mga hamon sa pagkabansa (Huk rebellion, pabahay, kabuhayan)
- Administrasyon ni Marcos — maagang panahon; Batas Militar (1972) — dahilan, epekto sa batas at kalayaan; Marcos era ekonomiya
- People Power Revolution (EDSA 1986) — dahilan, mga nangyari, kinalabasan; Papel ng simbahan, militar, at mamamayan

**Term 4 — Ikalimang Republika (1987–Kasalukuyan)**
- Saligang Batas ng 1987 — nilalaman at kahalagahan; Tatlong sangay ng gobyerno
- Mga administrasyon pagkatapos ng EDSA — pangunahing programa at hamon (Aquino, Ramos, Estrada, Arroyo, Aquino II, Duterte, Marcos Jr.)
- Mga kontemporaryong hamon — kahirapan, korupsiyon, terorismo, kalamidad; Papel ng kabataan sa pagbabago
- Pilipinas sa pandaigdigang komunidad — UN, ASEAN, bilateral na relasyon; OFW at diaspora

---

### MAPEH (Grade 6)

**Music and Arts — Philippine History Through Arts**
- Q1 Music: Revolutionary Period music — patriotic songs (Lupang Hinirang, Bayan Ko); Kundiman; Music as protest and identity; Choral arrangement
- Q2 Music: American Colonial Period music — brass bands, rondalla, harana; OPM origins; Influence of Western music on Philippine music
- Q3 Music: Commonwealth and Japanese Occupation period music — wartime songs, folk music preservation; Music as cultural resistance
- Q4 Music: Contemporary Filipino music — OPM, indie, hip-hop, pop; Music production basics (concept); Filipino artists in world music

- Q1 Arts: Revolutionary and late colonial art — Juan Luna, Felix Resurreccion Hidalgo; Portrait and historical painting; Analyzing visual propaganda
- Q2 Arts: American Period arts — architecture (Escolta, Intramuros), photography, printmaking; Art deco in the Philippines
- Q3 Arts: Contemporary Philippine visual art — installation, mixed media, street art; Art as social commentary; Creating art with a message
- Q4 Arts: "My Filipino Identity" — creating a personal artwork that expresses Filipino identity using learned techniques and elements; Artist statement writing

**PE and Health (Terms 1–4)**
- Q1: Holistic Wellness (physical, mental, emotional, social, spiritual dimensions) + Target and invasion games (basketball, soccer — tactical thinking)
- Q2: Early Pregnancy Prevention — reproductive health, responsible decision-making, peer pressure; Striking and fielding games (softball, cricket modified)
- Q3: Communicable Disease Prevention (HIV/AIDS basics, age-appropriate; immunization; handwashing and hygiene) + Rhythmic Activities and Philippine folk dances (Pandanggo sa Ilaw, Cariñosa)
- Q4: Environmental Health and One Health (ecosystem health linked to human health; zoonotic diseases; climate and health) + Creative and contemporary dance; First aid and BLS basics

---

### EPP — ICT (Grade 6, Quarter I Only)

- Web conferencing tools — meeting etiquette, screen sharing, breakout rooms; Responsible online communication
- Online form builders — creating surveys and quizzes using Google Forms or similar; Data collection and analysis from form responses
- Cloud storage and file management — organizing, sharing, and collaborating on documents; Version control basics
- Advanced productivity software — mail merge, spreadsheet pivot tables (concept), presentation design principles
- Block coding — loops, conditionals, functions, and event handlers in Scratch or similar; Creating a fully interactive project (quiz game, animation, or story)

---

### EPP — AFA / FCS / IA (Grade 6, Quarters II–IV)

**Quarter II — Agriculture and Fishery Arts (AFA): Pangisdaan**
- Kahalagahan ng pangingisda at pag-aalaga ng isda sa Pilipinas; Iba't ibang uri ng aquaculture (tilapia, bangus, hipon, talaba)
- Fish pond at cage culture — pagpili ng lugar, pagtatayo, pagbibigay ng pagkain, pamamahala ng tubig
- Natural at organikong pag-aalaga ng isda; Paggalaw, pag-aani (harvest), pag-iingat (post-harvest)
- Pagbebenta ng produkto — presyo, market linkage, record-keeping gamit ang spreadsheet

**Quarter III — Family and Consumer Science (FCS)**
- Pamamahala ng likas na yaman ng pamilya — oras, pera, talento; Paggawa ng family budget
- Pangangalaga at pag-iimbak ng pagkain — food safety at hygiene; Preservation techniques (salting, pickling, smoking, drying, canning)
- Pagluluto ng kumpletong simpleng pagkain — pagpaplano ng menu, recipe scaling, costing; Food presentation at serving etiquette

**Quarter IV — Industrial Arts (IA)**
- Mga pangunahing kasangkapan sa carpentry (kahoy/kawayan), metalworking, at electrical works — ligtas na paggamit
- Pagtatayo ng simpleng istruktura — hakbang, disenyo, bill of materials; Kaligtasan sa paggawa
- Basic electrical wiring — light circuit (concept only, safety emphasized); Pagkilala ng mga bahagi ng simple circuit
- Pagbuo ng produkto — disenyo, gastos, pagpepresyo, pagtatanghal; Entrepreneurship basics

---

### GMRC (Grade 6)

**Term 1 — Integridad, Katotohanan, at Katarungan**
- Integridad sa panahon ng pagsubok — pagiging tapat kahit may presyon mula sa kapuwa; Moral courage
- Katotohanan at responsibilidad ng impormasyon — fake news, source evaluation, responsible social media use
- Katarungang panlipunan — kahulugan, halimbawa; Pagtutol sa kawalan ng katarungan sa araw-araw na buhay

**Term 2 — Pagkakapantay-pantay at Dignidad ng Tao**
- Dignidad ng tao — lahat ng tao ay may likas na karangalan; Pagtanggi sa anumang anyo ng diskriminasyon
- Kasarian at pagkakapantay-pantay — gender equality at age-appropriate na talakayan; Hamon sa stereotyping
- Karapatan ng bata — UN Convention on the Rights of the Child; Pagiging tagapagtanggol ng sariling karapatan

**Term 3 — Mamamayang may Responsibilidad**
- Civic responsibility — pagboto (sa hinaharap), pagsunod sa batas, pakikilahok sa komunidad
- Kalikasan at Buhay — climate change at responsibilidad ng bawat isa; Sustainable living
- Pagiging aktibong mamamayan — paano makatutulong ang isang Grade 6 learner sa pamamagitan ng simpleng aksyon

**Term 4 — Pandaigdigang Mamamayan at Pilipinong Pagkakakilanlan**
- Global citizenship — respeto sa iba't ibang kultura, relihiyon, at pananaw; Empathy across borders
- Pilipinong pagkakakilanlan sa mundo — OFW, diaspora, Filipino contributions to global culture
- Pagtingin sa kinabukasan — mga kareer at pagkakataon; Pagiging handa bilang susunod na henerasyon ng Pilipino

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

> *EPP (AFA/FCS/IA) is only active in Q2–Q4. Omit it from Thursday during Q1.
> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.
