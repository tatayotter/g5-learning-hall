# Writing and publishing blog posts

Everything needed to write a post for learninghallph.com/blog without re-reading old posts.
Posts live in the `blog_posts` table and are written in **Admin → Content → Blog**.

## Publishing a post yourself

1. Admin → Blog → **New post**, pick a template (or Blank post).
2. Fill the fields. Empty fields show hints for that template. **Preview** (top right) shows the
   post exactly as it will look.
3. Add photos with **Upload photo**. Phone photos are fine: they're resized, compressed to WebP
   and stripped of location data in the browser before upload.
4. In **Publishing**: **Publish now**, or **Schedule** a Manila date and time. Scheduled posts go
   live on their own within 5 minutes of that time.
5. Edits to a live post show up on the next page load after **Update post**. **Unpublish** takes
   it off the blog without deleting it.

Ctrl+S (Cmd+S) saves without changing the status.

## Asking Claude to write one

Say which template and give the facts (who, what, when, quotes, photos). Claude follows this file,
then either:

- **inserts it as a draft** straight into `blog_posts` (status `draft`, so nothing goes live), or
- **hands you JSON** to paste into Admin → Blog → New post → **Paste JSON**.

Either way you review it in the admin preview and press Publish yourself.

For Claude: the JSON is the save payload from `editorToPayload` in
`components/admin/blog/editorModel.ts` (a `blog_posts` row without `id`, `status` and
`published_at`):

```json
{
  "slug": "lowercase-words-with-hyphens",
  "title": "...",
  "description": "120 to 170 characters",
  "guild_key": "resources",
  "grade": null,
  "intro": "...",
  "curriculum_note": null,
  "sections": [{ "heading": "...", "paragraphs": ["...", "..."] }],
  "takeaways": ["...", "...", "..."],
  "external_links": [{ "label": "...", "url": "/child-signup" }],
  "faq": [{ "question": "...", "answer": "..." }],
  "image": null,
  "template": "news"
}
```

`guild_key` is one of `lorekeeper` (reading), `spellcaster` (typing), `numberrealm` (math),
`logiclabyrinth` (logic), `lexiconarena` (vocabulary), `resources` (everything else). `grade` is
2 to 6, or `null` for all grades. A section photo is
`"image": { "url", "alt", "width", "height", "caption" }`; the main photo adds
`"credit": { "source": "Learning Hall PH" }` (or `{ "source": "Pexels", "name", "sourceUrl" }`).
Photos for a draft Claude inserts must already be uploaded (admin upload, or `/public/blog-images`
in a PR). To insert a draft directly, `insert into public.blog_posts (...) values (...)` with
`status = 'draft'` through the Supabase MCP `execute_sql`, then tell the user to review it.

## House rules (every post)

- **English only.** No Filipino or Bisaya phrases in the copy.
- **No emojis.**
- **No children's names, faces, uniforms or school cues** in text or photos. Adults in photos only
  with their OK. The founder's own kids are never identified.
- **Honest claims.** Quests and quizzes are generated from the MATATAG curriculum. Teacher vetting
  is a goal, never described as done. Don't claim results the app hasn't measured.
- **Don't criticize schools or teachers.** Teachers read the blog.
- **Quotes** only with the speaker's approval. Founder quotes are drafts until Rowil approves them.
- **Description: 120 to 170 characters.** It's what Google and Facebook show.
- **Plain, calm voice.** Short sentences, concrete examples, hedged where the evidence is soft.
  No hype words ("revolutionary", "best ever").
- **Paragraphs around 60 words.** Intros around 60 to 80 words.
- **Formatting is light:** `**bold**`, `*italic*`, `[link text](/path or https://...)`. A blank
  line starts a new paragraph. Nothing else renders.
- **Cite facts that can change** (exam rules, dates, fees) with a link to the official source.

## Templates

The admin editor pre-fills these (source: `lib/blogTemplates.ts`; keep both in step). Counts are
from the 54 posts on the blog as of 2026-10-04.

| Template | Use it for | Shape | Example |
|---|---|---|---|
| **Grade skill guide** (`skill-guide`, 25 posts) | One skill at one grade | Topic = skill, grade set, curriculum note quoting the real DepEd competency (empty for typing/logic), 3 sections with verb-first tip headings, 1 paragraph each, 3 takeaways, no FAQ, no photo (uses the topic photo) | Grade 4 Reading Comprehension: Moving From Learning to Read to Reading to Learn |
| **Skill tips** (`skill-tips`, 5) | Ways to build a skill at home, any grade | 3 to 5 tip sections, 1 to 2 paragraphs, 3 takeaways | 5 Reading Comprehension Games for Elementary Learners (No Screen Needed) |
| **Research explainer** (`science-explainer`, 6) | Research behind a kind of practice | Intro: instinct vs research. 2 to 3 sections: the study (authors, year, journal), why it works, what to do at home. 4 cited takeaways, 3 FAQ, links to every study plus the guild page | The Testing Effect: Why Quizzing Your Child Beats Having Them Re-Read Notes |
| **Parent guide** (`parent-guide`, 8) | One question parents ask | 3 to 5 sections, own photo, 3 to 4 FAQ, official links. Non-alarmist | Signs Your Child Might Be Falling Behind |
| **Exam or school guide** (`exam-guide`, 8) | Part of a series on RSHS, PSHS, SSES | Grade 6, 4 to 6 sections of checkable facts, "the rule that catches families off guard", next steps, 3 to 6 FAQ, official portal first in links, then the rest of the series | Does My Child Qualify for the PSHS NCE? |
| **How-to** (`how-to`, 1) | Steps for using Learning Hall | "What this does", one section per device, "why we do it this way"; exact button names; troubleshooting FAQ | How to Install Learning Hall on a Phone, Tablet, or Computer |
| **News / press release** (`news`, 1) | School visits, launches, milestones | Dateline intro ("SURIGAO CITY, October 4, 2026."), what happened, a highlight, what happens next, approved founder quote, About boilerplate; own photos; no FAQ | Learning Hall Presents to the Faculty of SCSSES |

### Boilerplate (news posts)

> Learning Hall PH is a learning game for Filipino Grade 2 to 6 pupils, built in Surigao City by
> Rowil Ruelo and co-founder Raphaelle Julien Ruelo. It turns the weekly MATATAG lessons into
> quests, quizzes and battles, and gives parents a dashboard to follow along. Learning Hall is
> free to start at learninghallph.com.
>
> Media and school inquiries: tatay@learninghallph.com

### Useful internal links

`/child-signup` (pupil sign-up), `/register` (parent account), `/curriculum/grade-N`,
`/guilds/<guild>` (lorekeeper, spellcaster, numberrealm, logiclabyrinth, lexiconarena),
`/blog/<slug>`, `/blog/topic/<guild_key>`.

## How it works (for code changes)

- Table and rules: `supabase/migrations/20261004170000_blog_posts.sql`. The public can read a post
  only when `status = 'published'` and `published_at <= now()`. All writes go through
  `/api/admin-blog` (passcode, service role). Photos: public `blog-images` bucket via
  `/api/admin-blog-image`.
- Public pages read through `lib/blogData.ts`: one cached query, refreshed every 5 minutes (which
  is what makes scheduling work) and dropped immediately on every admin save.
- The article renderer `components/blog/BlogArticleBody.tsx` is shared by the public page and the
  admin preview.
- The original 54 posts were seeded by `20261004170100_blog_posts_seed.sql`; their photos stay in
  `/public/blog-images`.
