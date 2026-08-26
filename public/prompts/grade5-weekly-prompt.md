# Weekly Package Generation Prompt
## Grade 5 | Learning Hall

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

_Regenerated 2026-08-26 directly from the DepEd-audited `budget_of_work` Supabase table (the app's public `/curriculum/grade-5` source), so this file and that table no longer diverge. See [[project_bow_dual_source_discovery]] and [[project_grade5_bow_deped_audit]] — AP and EPP (AFA/FCS/IA) below reflect the corrected content from that audit (poultry/sewing/repair strands, corrected AP Wk1-5)._

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

> **EPP note:** EPP is tracked as two BOW rows — ICT (Term 1 only) and AFA/FCS/IA (Terms 1-3: poultry/animal production → sewing → repair).

---

### ENGLISH (Grade 5) ★ SSES

**Term 1 (context: national holidays)**
- Receptive/literary: story grammar (character/setting/plot/conflict/theme); sequencing 7+ events; sequential vs. other plot structures; sound devices (alliteration, onomatopoeia, rhyme) and figurative language (simile, metaphor, personification); inferring feelings/traits/motives; predictions; main idea/details; summary
- Receptive/informational: text structures (outlining, inverted pyramid); explanation vs. news report; author's purpose; fact vs. opinion
- Productive: denotative vs. connotative meaning (analogy context clue); verb-forming suffixes (-ize/-ify/-en); dictionary use; formal tone; SVA with collective/concrete/abstract nouns; demonstrative/relative pronouns; helping/linking/transitive verbs; progressive tenses; adjective order; adverbs of manner/time; noun complements; compound-complex sentences
- Composing: narrative/explanation/news-report text types; friendly letters; non-verbal cues; enrollment forms, permission slips
- Viewing: visual layout (headlines, captions, images); tone/mood in visuals; media stereotypes (age/gender/socio-economic); audio elements

**Term 2 (context: Ramadan & Chinese New Year)**
- Adds: flashback as plot pattern; metaphor/personification/hyperbole; appositives as context clue; glossary use
- Productive: adverb-forming suffixes (-ly/-ward/-wise); possessive/compound nouns; relative pronouns in complex sentences; adverbs of place/frequency/intensity; noun/pronoun complements
- Composing: bank and government forms (deposit slip, application)
- Viewing: directionality in visual texts; video-specific multimedia elements

**Term 3 (context: Indigenous Peoples & regional celebrations)**
- Adds: personification/hyperbole in cultural texts; encyclopedia use
- Productive: reflexive pronouns; degrees of comparison for adverbs; noun/pronoun/adjective complements
- Composing: original short multimedia text researching an Indigenous group or regional celebration

---

### FILIPINO (Grade 5)

**Term 1 (tekstong naratibo: mito/epiko/tulang pambata/kuwentong kababalaghan; impormatibo: panuto/hakbang/proseso)**
- Pag-unawa: 7+ pangyayari, tayutay (simili, metapora, personipikasyon), context clues
- Gramatika: denotasyon/konotasyon, kasingkahulugan/kasalungat, diksiyon, hugnayang pangungusap, pang-uri (palansak/pahambing), pang-abay (panang-ayon/panalungat), pandiwa ayon sa pokus (actor/object)
- Pagsulat: liham pangkaibigan, enrolment form; Sanggunian: diksiyonaryo, ensayklopidya, direktoryo

**Term 2 (kuwentong katatakutan, maikling kuwento, dulang pambata; balita/balitang lathalain) — Ramadan, Chinese New Year**
- Pag-unawa: kabalintunaan/ironiya, 5W1H, punto de bista ng manunulat
- Gramatika: langkapang pangungusap, pang-uri (superlative), pang-abay na kondisyonal, pandiwa ayon sa pokus (object/instrumental)
- Pagsulat: ID form, Library Card form; Sanggunian: almanac, atlas

**Term 3 (tulang pambata, kuwentong katatakutan, dulang pambata; eksposisyon) — katutubo/panrehiyong pagdiriwang**
- Pag-unawa: pagmamalabis/hyperbole, sanhi-bunga sa eksposisyon, paghahambing ng dalawang teksto
- Gramatika: pang-uri (patakda), pandiwa ayon sa pokus (causative, benefactive, directional)
- Pagsulat: Request Form/liham-kahilingan; Sanggunian: pahayagan, magasin, handbook

---

### MATHEMATICS (Grade 5) ★ SSES

**Term 1**
- Wk1: 12/24-hour time conversion; elapsed-time word problems
- Wk2: World time zones vs. Philippine Standard Time
- Wk3-4: GMDAS with 3+ operations; multiplying fractions (area/array models)
- Wk5: Multi-step fraction-multiplication word problems
- Wk6-7: Area formulas — parallelogram, triangle, trapezoid; identifying height; grid estimation
- Wk8: Dividing fractions using visual models
- Wk9: Multi-step fraction-division word problems
- Wk10: Decimal place value through thousandths

**Term 2**
- Wk11: Terminating decimals ↔ fractions; comparing/ordering decimals
- Wk12: Rounding decimals; adding/subtracting to 3 decimal places
- Wk13: Multi-step decimal addition/subtraction word problems incl. money
- Wk14-15: Divisibility rules (2,5,10 / 3,6,9 / 4,8,11,12); prime vs. composite (Sieve of Eratosthenes)
- Wk16: Collecting/organizing data; bar graph vs. line graph
- Wk17-18: Constructing/interpreting double bar and double line graphs
- Wk19: Reading/comparing values on double bar/line graphs
- Wk20: Theoretical probability of simple events

**Term 3**
- Wk21-22: Estimating and multiplying decimals (2 decimal places); word problems incl. money
- Wk23-24: Estimating and dividing decimals; word problems incl. money
- Wk25: GMDAS combining fractions and decimals
- Wk26: Solid figures (cube, prism, cylinder, cone, sphere, pyramid)
- Wk27: Prisms vs. pyramids (vertices/faces/edges); nets
- Wk28: Surface area by summing face areas
- Wk29: Surface-area word problems
- Wk30: Volume estimation (unit cubes); rotation about a point

---

### SCIENCE (Grade 5) ★ SSES

**Term 1**
- Wk1-2: Matter has mass and volume; three states of matter
- Wk2-4: Properties of solids/liquids/gases; measuring volume; thermometer; heating/cooling causing state change
- Wk5-7: Steps of a scientific investigation; units for mass/temperature; planning a simple investigation
- Wk8-10: Classifying plants/animals/microorganisms; specialized plant structures (rhizomes, tubers, thorns, bulbs, aerial roots)

**Term 2**
- Wk11-13: Animal body systems — digestive, respiratory, and reproductive (age-appropriate, functional level)
- Wk14-16: Viviparous vs. oviparous animals; adaptations (mimicry, camouflage); life cycles of mammals/birds/plants
- Wk17: Contact forces (push/pull)
- Wk18-19: Friction — surface texture, heat, reducing/increasing it; controlled investigation
- Wk20-21: Gravity as a non-contact force

**Term 3**
- Wk22-23: Static electricity; simple series circuit; conductors/insulators; electromagnet
- Wk24-26: Landforms and bodies of water; rock classification; soil formation, weathering, erosion
- Wk27: Water cycle stages
- Wk28-30: Philippine weather disturbances; PAGASA Storm Warning Signals; cyclone safety
- Wk31-32: Solar system structure; Earth's rotation/revolution; Moon phases

---

### ARALING PANLIPUNAN (Grade 5)

**Term 1: Pinagmulan at Kalinangan ng Sinaunang Pilipinas**
- Wk1: Kahulugan ng kasaysayan, pinagkukunang-bagay, pamamaraan ng pag-aaral
- Wk2: Pinagmulan ng Pilipinas — agham (land bridge), kaalamang-bayan (alamat), relihiyon
- Wk3: Pinagmulan ng sinaunang tao — Wave Migration (Beyer), Core Population (Jocano), Tabon/Callao Man
- Wk4: Heograpikong lokasyon at ugnayan sa kasaysayan
- Wk5: Sinaunang bayang Pilipino — organisasyong panlipunan (barangay, datu), pang-ekonomiya, pampolitika
- Wk6: Papel ng kababaihan; konsepto ng kalinangan
- Wk7: Paniniwala, relihiyon, tradisyon (animismo, anito, babaylan)
- Wk8: Sinaunang sining, palamuti, arkitektura (bahay-kubo, torogan, rice terraces)
- Wk9: Pagdating ng Islam sa Mindanao/Sulu; Sultanato ng Sulu/Maguindanao
- Wk10: Ugnayang pangkalakalan/kultural sa Tsina, Indya, Arabia, Timog Silangang Asya

**Term 2: Kolonyalismong Espanyol**
- Wk11-12: Kolonisasyon/imperyalismo; God-Gold-Glory; Magellan/Legazpi; Unang Misa; Kasunduan ng Tordesillas
- Wk13-15: Patakarang kolonyal — pamahalaan, ekonomiya (encomienda, polo y servicio, bandala), panlipunan (reduccion, antas-panlipunan)
- Wk16-17: Pag-aangkop/pagtugon ng Pilipino — sinkretismo, pag-aalsa (Dagohoy, Tamblot, Sumuroy, Silang)
- Wk18: Katayuan ng kababaihan sa kolonyal na panahon (Maria Clara, Gabriela Silang)
- Wk19-20: Pagpupunyagi ng iba't ibang sektor; malayang Cordillera at Sultanato

**Term 3: Nasyonalismo at Pagkakakilanlang Pilipino**
- Wk21: Konsepto ng nasyonalismo
- Wk22-23: Kaisipang liberal — French Revolution, Konstitusyon ng Cadiz, Suez Canal
- Wk24-25: Ambag ng ilustrado; Educational Decree of 1863
- Wk26: Sekularisasyon at Pilipinisasyon ng Parokya (Pelaez, Burgos)
- Wk27: Cavite Mutiny at GOMBURZA
- Wk28-29: Layunin ng Kilusang Propaganda; La Solidaridad
- Wk30: Mga personalidad ng Kilusang Propaganda (Rizal, Lopez Jaena, del Pilar, Ponce)

---

### MAPEH (Grade 5)

**Term 1 — Music/Arts: Pre-Colonial Period; PE/Health**
- Music: timbre (Hornbostel-Sachs), dynamics; Theater: local forms/symbolisms; Dance: local forms/functions
- Visual Arts: subjects/themes/mediums of local pre-colonial art
- Health: mental/emotional health, stress-coping, anti-bullying/harassment skills; puberty changes and family support
- PE: Striking/Fielding Games (kickball, syato) and Net/Wall Games (pickleball, ringo) — positioning, scoring, defending

**Term 2 — Music/Arts: Early Spanish Colonial Period (1521-1600); PE/Health**
- Music: melody, musical form; Theater/Dance/Visual Arts of the period, applied to local creative works
- Health: proper medicine use vs. misuse; effects of gateway drugs
- PE: Rhythmic Activities/Dances in 2/4 time (DepEd Galaw Pilipinas, movement exploration, social dance mixers)

**Term 3 — Music/Arts: Middle Spanish Colonial Period (1600-1800); PE/Health**
- Music: harmony (intervals); Theater/Dance/Visual Arts of the period, evaluated against period conventions
- Health: home/school/community/outdoor safety hazards; road safety; injury prevention
- PE: Rhythmic Activities/Dances in 3/4 time

---

### EPP (ICT) (Grade 5, Term 1 Only)

**Term 1: Internet Safety**
- Wk1: Netiquette
- Wk2: Web browsers — kinds and parts
- Wk3-6: Safe/responsible search engine use — keywords, credibility, misinformation
- Wk7-10: Safe/responsible email — interface, composing, attachments, etiquette, phishing awareness

---

### EPP (AFA/FCS/IA) (Grade 5, Terms 1-3)

**Term 1 — Agriculture and Fishery Arts: Animal Production (Poultry)**
- Wk1: Animal production definition/branches; importance of raising poultry naturally
- Wk2: Laws/agencies/NGOs relevant to poultry-raising
- Wk3: Successful poultry raisers and their traits
- Wk4: Factors in raising poultry — housing, ventilation, feed, water, cleanliness
- Wk5: Poultry breeds; common diseases — causes, signs, prevention, treatment
- Wk6-7: Natural care/management — feeding, cleaning, vitamins, weighing
- Wk8: Harvesting poultry and products (eggs, meat)
- Wk9-10: Selling — computing capital, price, expected profit

**Term 2 — Family and Consumer Science: Sewing (Pananahi)**
- Wk1: Importance of sewing; sewing tools
- Wk2: Basic hand stitches (running, back, baste, blanket, whip)
- Wk3: Identifying/repairing simple clothing damage
- Wk4: Sewing machine parts/use; materials for household items
- Wk5: Common machine-sewing problems and solutions
- Wk6-7: Making a simple household item by machine
- Wk8: Embroidery and crochet tools/procedure
- Wk9: Making crochet stitches
- Wk10: Selling the finished household item

**Term 3 — Industrial Arts: Repair (Pagkukumpuni)**
- Wk1: Common defects/repair methods for wood, bamboo, metal, electrical products
- Wk2: Careful tool use; repair materials
- Wk3: Proper care/storage of tools and materials
- Wk4-5: Repairing wood/bamboo items
- Wk6-7: Repairing metal items
- Wk8-9: Repairing electrical items
- Wk10: Computing service cost (manual or spreadsheet)

---

### GMRC (Grade 5)

**Term 1 (self-understanding)**
- Wk1: Respect for life
- Wk2: Valuing oneself, puberty changes
- Wk3: Promptness (saving/budgeting)
- Wk4-5: Faith (prayer, scripture)
- Wk6: Prudence (e-waste disposal)
- Wk7: Obedience (traffic rules)
- Wk8: Gratitude (appreciating parents/guardians)

**Term 2 (caring for others)**
- Wk9: Compassion (sick/elderly/PWD); Wk10: Gratitude (OFWs); Wk11: Respect (welcoming family)
- Wk12: Accountability (family duties); Wk13: Faith (family religious practices); Wk14: Gratitude (thanking God)
- Wk15: Cleanliness (home tidiness); Wk16: Nationalism (local products); Wk17: Patience (self-emotion regulation); Wk18: Respect (elders)

**Term 3 (community & faith)**
- Wk19: Faith (respecting others' religious symbols); Wk20: Faith (discernment/wise counsel)
- Wk21: Carefulness (accident prevention); Wk22: Promptness (punctuality); Wk23: Cheerfulness (neighbors)
- Wk24: Obedience (community rules); Wk25: Hope; Wk26: Optimism; Wk27: Accountability (environmental care); Wk28: Nationalism (regional artworks)

---

## SUBJECT SCHEDULE REFERENCE

Grade 5 fixed weekly subject schedule (matches `GRADE_5_SCHEDULE` in `subjectSchedule.ts` — shared by Grades 4, 5, 6):

| Day | Subjects |
|-----|---------|
| Monday | English · Mathematics |
| Tuesday | Filipino · Science |
| Wednesday | Araling Panlipunan · EPP (ICT) |
| Thursday | MAPEH · GMRC · EPP (AFA/FCS/IA) |
| Friday | Weekly Review (all subjects) |

> ⚠️ This schedule is fixed in the app — subjects placed on the wrong day will fail the bulk import validator.
