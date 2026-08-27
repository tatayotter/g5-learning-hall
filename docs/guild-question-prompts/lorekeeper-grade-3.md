# Lorekeeper — Grade 3 Question Generation Prompt

## Guild Mechanic
Students answer multiple-choice questions (4 options). An optional passage is displayed above the question.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "passage": "Plants make their own food through a process called photosynthesis. They use sunlight, water, and carbon dioxide from the air.",
    "question": "What three things do plants need to make food through photosynthesis?",
    "choice_a": "Soil, water, and moonlight",
    "choice_b": "Sunlight, water, and carbon dioxide",
    "choice_c": "Fertilizer, water, and oxygen",
    "choice_d": "Sunlight, salt, and carbon dioxide",
    "correct_choice": "b"
  },
  {
    "question": "What is a coordinating conjunction used for in a compound sentence?",
    "choice_a": "To start a new paragraph",
    "choice_b": "To join two independent clauses",
    "choice_c": "To describe a noun",
    "choice_d": "To ask a question",
    "correct_choice": "b"
  }
]
```

- `passage` is optional.
- `correct_choice` must be exactly `"a"`, `"b"`, `"c"`, or `"d"`.

## Grade 3 Curriculum Topics

### Science
- Plants: parts and functions (root, stem, leaf, flower, fruit, seed), photosynthesis basics, plant life cycle (seed → seedling → plant → fruit)
- Animals: classification by body covering (scales, feathers, fur), by reproduction (egg-laying vs live birth), habitats (land, water, air), life cycles
- Matter: properties of solids, liquids, and gases; simple mixtures (salt in water, soil and water)
- Weather: weather instruments (thermometer, rain gauge, anemometer, weather vane); types of clouds; weather patterns
- Earth: soil types (clay, sandy, loamy) and their uses; rocks and their properties
- Simple machines: lever, wedge, pulley, inclined plane, wheel and axle, screw — basic function and examples

### Araling Panlipunan
- Philippine pre-colonial history: Barangay system, datu, trade with neighboring countries
- Filipino national heroes at Grade 3 level: Jose Rizal, Andres Bonifacio (introductory facts)
- Human rights: basic rights of children; responsibilities at home, school, community
- Needs and wants; basic economy of the community; producers and consumers
- Natural vs human-made structures in the community

### English Language Arts
- Reading comprehension: story elements, sequence of 4–5 events, cause and effect, problem and solution, predicting outcomes, summarizing
- Text types: time-order/procedural, descriptive, explanatory
- Compound sentences: two independent clauses joined by a coordinating conjunction (for, and, nor, but, or, yet, so)
- Vocabulary: synonyms, antonyms, prefixes (un-, re-), suffixes (-ful, -less), context clues
- Grammar: declarative, interrogative, imperative, exclamatory sentences; verb tenses (past, present, future); possessive pronouns

### Filipino
- Mga kwento: pabula (fable), alamat (legend), maikling kwento — pangunahing ideya, tauhan, tagpuan
- Pangungusap: payak at tambalan (simple and compound)
- Bokabularyo: salitang magkatulad (synonymo), salitang magkasalungat (antonimo)
- Karunungang-bayan: salawikain at bugtong — kahulugan at aral
- Tamang baybay ng mga salitang ginagamit sa araw-araw

## Quality Rules
- Pitch language at an 8–9-year-old reading level.
- Passage-based: 3–5 sentences per passage; 1–2 questions per passage.
- Topic mix roughly: 30 % Science, 25 % AP, 25 % English, 20 % Filipino.
- For compound-sentence questions, supply the actual sentence in the question so students don't need prior text.
- Distractors should represent plausible misconceptions (e.g., confusing photosynthesis with respiration).

## Generation Instruction
Generate [N] Lorekeeper questions for Grade 3, Term 1. Return only the JSON array. No commentary.
