# Lorekeeper — Grade 2 Question Generation Prompt

## Guild Mechanic
Students answer multiple-choice questions (4 options). An optional passage is displayed above the question. Correct answers earn XP and gold; adaptive difficulty advances through tiers.

## JSON Format
Output a **JSON array**. Do NOT include `id`, `term_id`, `grade_level`, or `is_active`.

```json
[
  {
    "passage": "Ana plants vegetables in her garden. She waters them every morning.",
    "question": "What does Ana do every morning?",
    "choice_a": "She picks the vegetables",
    "choice_b": "She waters her plants",
    "choice_c": "She pulls weeds",
    "choice_d": "She plants new seeds",
    "correct_choice": "b",
    "difficulty_tier": 1
  },
  {
    "question": "What do we call animals that eat only plants?",
    "choice_a": "Carnivores",
    "choice_b": "Herbivores",
    "choice_c": "Omnivores",
    "choice_d": "Predators",
    "correct_choice": "b",
    "difficulty_tier": 2
  }
]
```

- `passage` is optional; include it for reading-comprehension questions, omit for standalone questions.
- `correct_choice` must be exactly `"a"`, `"b"`, `"c"`, or `"d"`.
- `difficulty_tier` must be `1`, `2`, or `3`.
- All four choices must be plausible — avoid "None of the above" or trivially wrong options.

## Difficulty Tiers

| Tier | Label | Cognitive Level |
|---|---|---|
| 1 | Easy | Direct recall of a single fact (e.g., "How many legs does a dog have?") |
| 2 | Developing | Basic understanding or short inference (e.g., "Why do plants need sunlight?") |
| 3 | Advanced | Multi-step reasoning, cause-and-effect, or vocabulary/text inference for this age group |

## Grade 2 Curriculum Topics

### Science
- Living vs non-living things; characteristics of living things
- Animals: classification (mammal, bird, fish, reptile, amphibian, insect), body parts, habitat, basic life cycle
- Plants: parts (root, stem, leaf, flower, fruit, seed) and their functions; what plants need to grow
- Human body: five senses and their organs; basic healthy habits
- Weather and seasons: tag-araw vs tag-ulan; weather tools (thermometer, rain gauge)
- Water: states of water (solid, liquid, gas); simple water cycle (evaporation, condensation, rain)
- Materials: basic properties of common materials (hard/soft, rough/smooth, heavy/light)

### Araling Panlipunan / Social Studies
- Community helpers and their roles (doctor, teacher, police, farmer, bus driver, etc.)
- Needs vs wants; basic economic choices
- Philippine national symbols (flag, anthem, hero, bird, flower, animal)
- Basic Philippine geography: our country, regions, capital city Manila
- Filipino values: pagmamahal, paggalang, mano po, bayanihan
- Rights and responsibilities of a good citizen

### English Language Arts
- Reading comprehension: characters, setting, problem, solution, main idea
- Sequence of events; cause and effect at story level
- Vocabulary: synonyms, antonyms, context clues
- Parts of speech: nouns, verbs, adjectives (introductory level)
- Sentence types: declarative, interrogative, exclamatory
- Simple literary devices appropriate for G2 (personification, rhyme, repetition)

### Filipino
- Mahahalagang bahagi ng kwento (tauhan, tagpuan, banghay)
- Mga uri ng pangungusap (pasalaysay, patanong, padamdam)
- Kahulugan ng mga salita at parirala sa konteksto
- Pabula at alamat: aral at mensahe
- Filipino values sa pang-araw-araw na buhay

## Quality Rules
- Pitch language at a 7–8-year-old reading level (short sentences, common words).
- Passage-based questions: write 2–4 sentences per passage, then 1–2 questions about it.
- Mix topics across subjects (aim for roughly: 35 % Science, 25 % AP/Social Studies, 25 % English, 15 % Filipino).
- Distribute tiers roughly 40 % / 40 % / 20 % (tier 1 / 2 / 3).
- Wrong options should be common misconceptions or plausible near-misses, not obviously absurd.

## Generation Instruction
Generate [N] Lorekeeper questions for Grade 2, Term 1. Return only the JSON array. No commentary.
