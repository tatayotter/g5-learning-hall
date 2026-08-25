# Claude.ai Projects — Weekly Content Generation

One project per grade. Paste the system prompt once. Every week, type one line.

---

## Setup (one-time per grade, ~2 minutes)

1. Go to [claude.ai](https://claude.ai) → **Projects** → **New Project**
2. Name it: `Learning Hall — Grade 5` (or 2, 3, 4, 6)
3. Click **Project instructions** → paste the contents of the matching file below:

| Grade | File | Project name |
|---|---|---|
| 2 (Tala) | `grade2-project.md` | Learning Hall — Grade 2 |
| 3 | `grade3-project.md` | Learning Hall — Grade 3 |
| 4 | `grade4-project.md` | Learning Hall — Grade 4 |
| 5 | `grade5-project.md` | Learning Hall — Grade 5 |
| 6 | `grade6-project.md` | Learning Hall — Grade 6 |

4. Save. Done.

---

## Weekly workflow (every Sunday, ~3 minutes per grade)

1. Open the grade's project in Claude.ai
2. Type: **`Week 13`** (or whatever the current school week is)
3. Claude outputs the full JSON — no explanation, just JSON
4. Copy it
5. Go to Admin → **Weekly Package Builder** → paste → Save

That's it. No prompt copying, no BOW lookup, no filling in placeholders.

---

## Which week is it?

Check the Admin panel → **Prompts** → **Prompt Builder** — it auto-detects the current school week and shows the term label.

Or use this reference:

| Week | Date (Monday) | Period |
|---|---|---|
| 9 | Aug 10, 2026 | Term 1 Week 8 |
| 10 | Aug 17 | Term 1 Week 9 |
| 11 | Aug 24 | Term 1 Week 10 |
| 12 | Aug 31 | Term 1 Week 11 |
| **13** | **Sep 7** | **Term 1 Week 12 (last before break)** |
| 14 | Sep 14 | Term 1 break |
| 15 | Sep 21 | Term 2 Week 1 |
| 16 | Sep 28 | Term 2 Week 2 |

---

## Tips

- Claude remembers the project instructions — never paste the prompt again
- If Claude adds explanation text before/after the JSON: start your next message with `JSON only. Week 13.`
- For the Weekly Review (Friday), Claude generates it automatically — just paste the whole JSON as-is
- The project files live in `docs/claude-projects/` — update them here if the curriculum changes
