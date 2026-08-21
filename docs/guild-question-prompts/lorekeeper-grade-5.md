# Lorekeeper — Grade 5 Question Generation Prompt

## Guild Mechanic
Students answer multiple-choice questions (4 options). An optional passage is shown above.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "passage": "Mang Tasyo trudged to the market each morning despite the heavy rain. His rough hands clasped his basket tightly. He would not let his family go hungry.",
    "question": "What can you infer about Mang Tasyo's character from this passage?",
    "choice_a": "He is lazy and careless",
    "choice_b": "He is determined and devoted to his family",
    "choice_c": "He is wealthy and buys everything he wants",
    "choice_d": "He is afraid of the rain",
    "correct_choice": "b",
    "difficulty_tier": 2
  },
  {
    "question": "What is Newton's First Law of Motion?",
    "choice_a": "Force equals mass times acceleration",
    "choice_b": "For every action there is an equal and opposite reaction",
    "choice_c": "An object at rest stays at rest unless acted upon by an unbalanced external force",
    "choice_d": "Objects with greater mass fall faster",
    "correct_choice": "c",
    "difficulty_tier": 3
  }
]
```

- `passage` is optional.
- `correct_choice` must be exactly `"a"`, `"b"`, `"c"`, or `"d"`.
- `difficulty_tier` must be `1`, `2`, or `3`.

## Difficulty Tiers

| Tier | Label | Cognitive Level |
|---|---|---|
| 1 | Easy | Direct recall of a key fact or definition |
| 2 | Developing | Understanding, application, short inference from text, or comparison of two concepts |
| 3 | Advanced | Analysis, multi-step reasoning, historical interpretation, literary analysis, evaluation |

## Grade 5 Curriculum Topics

### Science
- Matter: three states; physical vs chemical changes; mixtures (heterogeneous/homogeneous); compounds vs elements; separation techniques; properties (mass, volume, density introductory)
- Cells: cell as basic unit of life; plant cell vs animal cell (key organelles: nucleus, mitochondria, cell membrane, cell wall, chloroplast, vacuole); cell functions
- Ecosystems: food chains and food webs; trophic levels (producer, primary/secondary/tertiary consumer, decomposer); biodiversity; adaptations; human impact on ecosystems
- Force and motion: Newton's three laws; speed, velocity, acceleration (conceptual); gravity and friction
- Energy: kinetic vs potential; forms (chemical, thermal, light, sound, electrical, mechanical); energy transformation; photosynthesis equation (CO₂ + H₂O + light → glucose + O₂)
- Earth: the Ring of Fire; Philippine volcanoes and earthquakes; layers of the Earth

### Philippine History (Araling Panlipunan)
- Pre-colonial Philippines: social classes (datu, maharlika, alipin), economy, trade
- Spanish colonization: encomienda system, galleon trade, reduccion, forced labor (polo y servicio), doctrina, role of the Church
- The Ilustrado class and the Propaganda Movement: Jose Rizal, Marcelo del Pilar, Graciano Lopez Jaena; La Solidaridad; Noli Me Tangere and El Filibusterismo
- The Katipunan: founding by Andres Bonifacio, Cry of Pugad Lawin, role of Emilio Aguinaldo, Pact of Biak-na-Bato
- Philippine Revolution and Independence: Declaration of Independence (June 12, 1898); Philippine-American War; Emilio Aguinaldo
- Notable women heroes: Gabriela Silang, Teresa Magbanua, Melchora Aquino
- ASEAN: member countries, goals, economic cooperation

### English Language Arts
- Reading comprehension: inference, author's purpose, fact vs opinion, theme, main idea and supporting details, text structure
- Literary devices: simile, metaphor, personification, hyperbole, alliteration, onomatopoeia, allusion, irony (dramatic and situational), symbolism
- Point of view: first-person, third-person limited, third-person omniscient
- Essay writing: thesis statement, topic sentences, supporting details, concluding sentence; narrative and expository essays
- Grammar: compound-complex sentences, active vs passive voice, reported speech (introductory), conditional sentences (Type 1)
- Vocabulary: connotation vs denotation, context clues, etymology (Latin/Greek roots)

### Filipino (Panitikan)
- Epiko Pilipino: Bidasari, Hinilawod, Ibalon, Lam-ang — pangunahing tema at tauhan
- Tayutay: simili, metapora, personipikasyon, pagmamalabis, anaphora, onomatopeya
- Parabula vs pabula: pagkakaiba at halimbawa
- Sanaysay: layunin, istraktura (introduksyon, katawan, konklusyon)
- Pang-abay, panghalip, pangatnig — wastong paggamit sa pangungusap
- Denotasyon at konotasyon ng mga salita

## Quality Rules
- Language level: 10–11-year-old; academic language is appropriate, define terms only when necessary.
- Passage-based: 4–7 sentences; test inference, not just recall; include both literary and informational passages.
- Topic mix: 30 % Science, 30 % Philippine History/AP, 25 % English, 15 % Filipino.
- Tier distribution: 25 % tier 1 / 40 % tier 2 / 35 % tier 3.
- Historical questions must be factually accurate; cite specific names, dates, or terms when possible.
- For literary device questions, always include the actual sentence example in the stem.
- Distractors: common misconceptions (e.g., confusing Newton's laws; confusing Katipunan with Propaganda Movement).

## Generation Instruction
Generate [N] Lorekeeper questions for Grade 5, Term 1. Return only the JSON array. No commentary.
