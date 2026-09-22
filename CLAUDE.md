@AGENTS.md

## Styling

Before styling or restyling any quest, quiz, battle, or event-facing screen, read
`docs/STYLE_GUIDE.md` first. The app uses a deliberate two-layer look (dark shell + parchment
content panels) that's easy to get backwards by copying an older component — that file has the
exact tokens and a checklist.

## Database migrations & deployment

Before adding or editing anything in `supabase/migrations/`, read `docs/database-migrations.md`
first. It covers the idempotency patterns Postgres doesn't give you for free (no
`IF NOT EXISTS` for `ADD CONSTRAINT`/`CREATE POLICY`/`CREATE TRIGGER`), the sharpest edge in
this system (CI's empty-database replay doesn't prove a migration will succeed against real
production data), and how the two CI workflows and the required-approval production deploy
gate work.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
