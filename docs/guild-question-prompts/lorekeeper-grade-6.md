# Lorekeeper — Grade 6 Question Generation Prompt

## Guild Mechanic
Students answer multiple-choice questions (4 options). An optional passage is shown above.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "passage": "Plate tectonics is the theory that Earth's lithosphere is divided into several large plates that move slowly over the mantle. The Philippines lies along the Pacific Ring of Fire, where several plates meet, causing frequent earthquakes and volcanic eruptions.",
    "question": "Why does the Philippines experience frequent earthquakes and volcanic activity?",
    "choice_a": "Because it is located near the equator",
    "choice_b": "Because it lies along the Pacific Ring of Fire where tectonic plates meet",
    "choice_c": "Because it is an archipelago with many islands",
    "choice_d": "Because of its tropical climate",
    "correct_choice": "b"
  },
  {
    "question": "What is the difference between a persuasive and an informational essay?",
    "choice_a": "Persuasive essays have a longer introduction; informational essays do not",
    "choice_b": "Persuasive essays aim to convince the reader of a position; informational essays aim to explain or describe a topic objectively",
    "choice_c": "Persuasive essays only use facts; informational essays use opinions",
    "choice_d": "They are the same type of writing",
    "correct_choice": "b"
  }
]
```

- `passage` is optional.
- `correct_choice` must be exactly `"a"`, `"b"`, `"c"`, or `"d"`.

## Grade 6 Curriculum Topics

### Science
- Biodiversity and ecosystems: classification of organisms (6 kingdoms — bacteria, archaea, protista, fungi, plantae, animalia); taxonomic levels (kingdom, phylum, class, order, family, genus, species); food webs and energy flow; threats to biodiversity (habitat loss, pollution, invasive species, climate change); conservation strategies
- Earth science — Plate tectonics: theory of plate tectonics; types of plate boundaries (convergent, divergent, transform); earthquakes (focus, epicenter, seismic waves, Richter scale); volcanoes (types: shield, cinder cone, composite/stratovolcano); volcanic products; weathering and erosion
- Electricity and magnetism: static vs current electricity; electric circuits (series vs parallel); conductors and insulators; electromagnets; uses of electricity at home and in industry
- Reproductive health: human reproductive system (male and female); stages of human development (embryo, fetus, infant, child, adolescent, adult); puberty changes; responsible decision-making

### Philippine and Asian History (Araling Panlipunan)
- Ancient Asian civilizations: Mesopotamia, Indus Valley, China (Han Dynasty), Japan; contributions to world culture
- Philippine history: American colonial period (1898–1946) — education system (Thomasites), Commonwealth, WWII Japanese occupation; independence on July 4, 1946
- Post-independence Philippines: major presidents and their contributions; Martial Law (1972–1986); People Power Revolution (1986); EDSA
- Economics: supply and demand; taxation; government budget; economic institutions (banks, cooperatives)
- Governance: branches of Philippine government (executive, legislative, judicial); LGUs; bill to law process
- ASEAN and global organizations: UN, WHO, UNICEF, WTO — roles and relevance to the Philippines

### English Language Arts
- Literary analysis: theme, symbol, motif, irony, allegory, point of view, narrative technique
- Argumentative/persuasive writing: claim, evidence, warrant, counterargument, rebuttal
- Research skills: evaluating sources (primary vs secondary; reliable vs unreliable); avoiding plagiarism; citation basics
- Complex grammar: conditional sentences (Types 1, 2, 3); reported speech; relative clauses; gerunds and infinitives
- Vocabulary: nuance between near-synonyms; idiomatic expressions; advanced academic vocabulary

### Filipino (Panitikan at Wika)
- Dulaan (drama): uri ng dula, elemento (tagpuan, tauhan, banghay, diyalogo), tayutay sa dula
- Talambuhay (biography) at Awtobiyograpiya: layunin, istraktura, pagtataya ng nilalaman
- Retorika: uri ng pahayag (deduktibo, induktibo), paggamit ng ebidensya
- Kritikal na pagbabasa: pagtukoy ng punto de bista, pagtatasa ng katuwiran, pagtukoy ng hilig (bias)
- Pandiwang aspekto: perpektibo, imperpektibo, kontemplatibo

## Quality Rules
- Language level: 11–12-year-old academic language; technical terms are expected and appropriate.
- Passage-based: 5–8 sentences; include both informational/scientific and literary passages.
- Topic mix: 30 % Science, 30 % Philippine/Asian History + Governance, 25 % English, 15 % Filipino.
- Historical questions must be factually accurate; use precise dates and names.
- Science questions should test understanding of mechanisms, not just label memorization.
- Avoid questions that can be answered purely by elimination.

## Generation Instruction
Generate [N] Lorekeeper questions for Grade 6, Term 1. Return only the JSON array. No commentary.
