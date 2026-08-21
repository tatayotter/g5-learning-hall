# Guild Question Generation Prompts

One markdown file per guild per grade. Load the relevant file as context when prompting an AI to generate more questions. The file tells the AI exactly what format to output, what curriculum to cover, and how to calibrate difficulty — saving token overhead on repeated explanations.

## Directory Layout

```
guild-question-prompts/
  lorekeeper-grade-{2-6}.md     — Reading comprehension / general knowledge MCQ
  spellcaster-grade-{2-6}.md    — English spelling word lists
  number-realm-grade-{2-6}.md   — Mathematics problems (standard / fraction / time)
  logic-labyrinth-grade-{2-6}.md — Logic puzzles, sequences, analogies
  lexicon-arena-grade-{2-6}.md  — Vocabulary definition → spelling challenge
```

## Workflow

1. **Open the relevant file** (e.g. `number-realm-grade-5.md`).
2. **Paste it as the system prompt** (or first user message) to Claude / another model.
3. **Add**: `Generate 50 questions. Distribute across tiers: 17 tier-1 / 17 tier-2 / 16 tier-3.`
4. **Copy the JSON output** and paste it into the Admin → Question Bank importer (select the correct guild and grade there — do NOT include `term_id`, `grade_level`, or `is_active` in the JSON; the importer adds those).

Alternatively, wrap the JSON in a SQL migration (see existing migration `20260821000001_sq_guild_questions_g2_g5_batch1.sql` for the INSERT pattern).

## Shared Rules (all guilds)

| Rule | Detail |
|---|---|
| Term | Always `term_id = 1` (current term) |
| Grades | `grade_level` 2–6; questions should be pitched at that grade's DepEd curriculum |
| Active | `is_active = true` always |
| Difficulty | Tier 1 = straightforward recall, Tier 2 = application/understanding, Tier 3 = analysis/reasoning |
| No duplicates | Check existing questions before importing; the importer deduplicates on the field listed per guild |
| Language | English unless the prompt file specifies Filipino content |
| Avoid | Trivially obvious distractors (e.g. "None of the above"); all four choices should be plausible |

## Guild → Table Map

| Guild | Table | Dedup field |
|---|---|---|
| Lorekeeper | `sq_lorekeeper` | `question` |
| SpellCaster | `sq_spellcaster` | `word_string` |
| Number Realm | `sq_number_realm` | `problem_prompt` |
| Logic Labyrinth | `sq_logic_labyrinth` | `puzzle_prompt_text, matrix_image_url` |
| Lexicon Arena | `sq_lexicon_arena` | `correct_spelling` |
