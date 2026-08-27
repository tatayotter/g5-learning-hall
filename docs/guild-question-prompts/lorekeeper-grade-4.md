# Lorekeeper — Grade 4 Question Generation Prompt

## Guild Mechanic
Students answer multiple-choice questions (4 options). An optional passage is shown above.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "passage": "Physical changes alter the form of a material but do not create a new substance. Cutting paper, melting ice, and dissolving sugar in water are examples of physical changes.",
    "question": "Which of the following is a physical change?",
    "choice_a": "Burning wood",
    "choice_b": "Rusting iron",
    "choice_c": "Melting butter",
    "choice_d": "Cooking an egg",
    "correct_choice": "c"
  },
  {
    "question": "What literary device compares two unlike things using the words 'like' or 'as'?",
    "choice_a": "Metaphor",
    "choice_b": "Simile",
    "choice_c": "Personification",
    "choice_d": "Hyperbole",
    "correct_choice": "b"
  }
]
```

- `passage` is optional.
- `correct_choice` must be exactly `"a"`, `"b"`, `"c"`, or `"d"`.

## Grade 4 Curriculum Topics

### Science
- Matter: properties (color, texture, shape, size, mass, volume); physical vs chemical changes; mixtures (heterogeneous) and solutions (homogeneous); separation methods (filtering, evaporation, decanting)
- Force and motion: types of forces (contact: push/pull, friction; non-contact: gravity, magnetism); effects of force on objects (move, stop, change direction, change shape); speed as distance ÷ time (introductory)
- Energy: forms of energy (heat, light, sound, mechanical, electrical, chemical); heat transfer (conduction, convection, radiation — introductory); conductors and insulators
- Light and sound: properties of light (reflection, refraction, absorption); properties of sound (pitch, volume, echoes); how we hear and see
- Ecosystems: food chains and food webs; producers, consumers (primary, secondary), decomposers; habitats and adaptations

### Araling Panlipunan
- Pre-colonial Philippine civilizations: Tabon Cave people, early Malay settlers, trading kingdoms (Laguna Copperplate Inscription, Srivijaya/Majapahit influence)
- Philippine geography: 3 major island groups (Luzon, Visayas, Mindanao), major bodies of water, mountain ranges, active volcanoes
- ASEAN: member countries, flags, capitals; purpose and goals of ASEAN
- Natural resources of the Philippines: mineral, forest, marine, agricultural; sustainable use
- Economic activities: farming, fishing, manufacturing, trade and commerce

### English Language Arts
- Text types: narrative, descriptive, expository, persuasive — identifying the type and its purpose
- Reading comprehension: drawing conclusions, making inferences, identifying author's purpose, distinguishing fact from opinion
- Figurative language: simile, metaphor, personification, hyperbole, onomatopoeia — identifying and interpreting
- Grammar: complex sentences (main clause + subordinate clause), relative pronouns, verb tenses (perfect tenses introductory), active vs passive voice
- Vocabulary: roots and affixes (pre-, mis-, -tion, -ment), connotation vs denotation, synonyms and antonyms

### Filipino
- Uri ng teksto: paglalarawang-salita, nagbibigay-impormasyon, salaysay, persuasibo
- Tayutay: simili, metapora, personipikasyon, pagmamalabis, onomatopeya
- Epiko, pabula, alamat, maikling kwento — pagkilala sa tayutay at aral
- Pangngalan, pandiwa, panguri, pang-abay — pagkilala at wastong paggamit
- Pagsulat ng talata: paksang pangungusap, mga detalyeng sumusuporta, pangwakas na pangungusap

## Quality Rules
- Language level: 9–10-year-old (compound-complex sentences in questions are fine).
- Passage-based: 3–6 sentences; can introduce a concept then test understanding or inference.
- Topic mix: 30 % Science, 25 % AP, 25 % English, 20 % Filipino.
- For figurative language questions: always include the actual sentence in the question stem.
- Science distractors should target common misconceptions (physical vs chemical change confusion is very common).

## Generation Instruction
Generate [N] Lorekeeper questions for Grade 4, Term 1. Return only the JSON array. No commentary.
