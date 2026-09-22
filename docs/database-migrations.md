# Database migrations & deployment

How schema changes get from a local file to production in this repo, what the two CI
workflows actually do, and the checklist to run through before adding a migration that
touches an existing table. Written 2026-09-22, the day this whole system went from "doesn't
really exist" to what's described here — see **History** at the bottom for why that matters
if you ever see something that looks odd in `supabase/migrations/`.

## The short version

1. Add a `.sql` file to `supabase/migrations/`, named `YYYYMMDDHHMMSS_short_description.sql`.
2. Open a PR. `database-tests.yml` replays every migration against a fresh empty database,
   then runs the pgTAP suite in `supabase/tests/database/`. It has to pass before merging.
3. Merge to `main`. `deploy-migrations.yml` re-runs that same check, then pauses for manual
   approval (GitHub Environments → `supabase-production` → **Review deployments**). Once
   approved, it runs `supabase db push` against the real hosted project.
4. That's it — merging is deploying, once you click approve. Nobody should ever need to run
   `supabase db push` by hand again.

## Writing a migration

- **Idempotency is not optional.** Every migration should be safe to re-run. This matters
  because `supabase test db` replays the *entire* history from scratch on every PR, and
  because the deploy pipeline's dry-run step means a migration could in principle be
  attempted more than once.
  - `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`,
    `CREATE OR REPLACE VIEW`, and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` are all
    natively idempotent — just use them normally.
  - Postgres has **no** `IF NOT EXISTS` for `ADD CONSTRAINT`, `CREATE POLICY`, or
    `CREATE TRIGGER`. Wrap these in an explicit existence check, not a bare
    `EXCEPTION WHEN duplicate_object` handler (that doesn't catch every case — a second
    primary key raises `invalid_table_definition`, a different exception, discovered the hard
    way while building the baseline below). Pattern:
    ```sql
    do $$ begin
      if not exists (
        select 1 from pg_constraint
        where conname = 'my_constraint_name' and conrelid = 'public.my_table'::regclass
      ) then
        alter table only public.my_table add constraint my_constraint_name ...;
      end if;
    end $$;
    ```
    Same idea via `pg_policies` for `CREATE POLICY`, `pg_trigger` for `CREATE TRIGGER`.

- **Check for version-number collisions.** Every migration filename starts with a 14-digit
  timestamp; two files can't share one (it's a literal primary-key violation in Supabase's own
  tracking table). Both CI workflows check this automatically and fail fast with a clear error
  if they collide — but if you're hand-picking a timestamp, just make sure it's not already
  used.

- **The empty-database replay does not prove your migration will succeed against real data.**
  This is the sharpest edge in the whole system, worth internalizing: `database-tests.yml` and
  the deploy pipeline's `test` job both replay migrations into a *fresh, empty* database. That
  proves the schema is internally consistent, but it proves nothing about whether a migration
  will succeed against production's actual rows. Concretely:
  - Adding `NOT NULL` to an existing column, or a `CHECK` constraint that existing rows might
    violate, will pass CI every time (nothing to violate in an empty table) and can still fail
    when it actually reaches production — *after* your approval click, not before it.
  - If you're changing an existing table's constraints in a way existing data might violate:
    write the backfill/cleanup **in the same migration**, before the constraint, the same way
    `20260902090000_normalize_content_week_to_sunday.sql` repoints bad `content_weeks` rows
    before adding its `CHECK` constraint. Don't assume "CI is green" means "this will apply
    cleanly."
  - When in doubt, sanity-check the migration against production data first (a rolled-back
    `begin; ...; rollback;` transaction via the Supabase SQL editor or MCP tools is the
    established way to do this without writing anything).

- **Write a pgTAP test** in `supabase/tests/database/` for anything security- or
  correctness-sensitive (a new RLS policy, an identity check, an idempotency guarantee). Look
  at the existing three files for the pattern: self-contained fixtures (fresh random test
  identities, never real user data), `plan(N)` matching the actual assertion count, and
  `set_config('request.jwt.claims', ...)` to simulate an authenticated session when testing
  RLS.

## The two workflows

**`database-tests.yml`** (on every PR touching `supabase/migrations|tests|config.toml`):
spins up a local Supabase stack in Docker, replays every migration, runs `supabase test db`.
Never touches the hosted project. This is the only thing that has to pass to merge.

**`deploy-migrations.yml`** (on push to `main` touching `supabase/migrations|config.toml`,
also runnable manually via `workflow_dispatch`): re-runs the same replay+pgTAP check as a
`test` job, then a `deploy` job (`needs: test`) that requires manual approval before it can
run, via the `supabase-production` GitHub Environment. Once approved: links to the real
project and runs `supabase db push --dry-run` (visible in the log, does nothing) followed by
the real `supabase db push`.

Required repo secrets (Settings → Secrets and variables → Actions), set directly by whoever
owns the repo — never generated or entered by an AI session:
- `SUPABASE_ACCESS_TOKEN` — from supabase.com/dashboard/account/tokens. Scope it to this
  project only if the token generator offers that option.
- `SUPABASE_DB_PASSWORD` — Project Settings → Database on the Supabase dashboard. If you
  don't already have it, there's a **Reset database password** button there — safe to use,
  since nothing in this app connects via a raw DB connection string (it's all API keys).

If `deploy` ever fails at the link/push step, check these two secrets exist and haven't
expired before looking anywhere else.

## Troubleshooting: "Remote migration versions not found in local migrations directory"

`supabase db push` refuses to run at all if **any** version recorded in production's
`supabase_migrations.schema_migrations` table has no exact-match local file — not just new
migrations, any mismatch anywhere in the whole history. It prints the offending version
numbers and suggests:

```
supabase migration repair --status reverted <versions...>
supabase db pull
```

`migration repair --status reverted` removes a version's row from that tracking table (it
only touches this bookkeeping table — it never re-runs or undoes the actual schema/data that
migration already applied). Use this when the row has no meaningful local file, e.g. it was
superseded by a later migration, consolidated, or its content ended up folded into a
different file. Do **not** use `db pull` reflexively — it generates a *new* migration file
from whatever's live, which can create a redundant/conflicting file if you already have the
real source of truth locally.

If a flagged version genuinely *does* correspond to a real local file just under a different
version number (this happened for all 5 of this baseline's own files, see History below), the
fix is a direct `UPDATE` of that one row's `version` (and `name`, if it drifted too) to match
the local filename — not a repair/revert.

## History

Until 2026-09-22, this repo's entire foundational schema (51 tables, 62 functions, RLS
policies, `pg_cron`) had been built directly in the Supabase dashboard before migration
discipline began, and was never captured in any migration file. `supabase test db` had never
actually worked end-to-end for this repo — every previous "verification" was a dry-run against
production, which already has every object and so can't reveal something missing from
scratch.

Fixing that took 5 baseline files (`supabase/migrations/20260806230001` through
`20260826010001`, named `initial_schema_baseline_*`) generated directly from production's live
schema via Postgres introspection, split and *deliberately mis-ordered by version* relative to
when they were actually applied — their filenames are dated 2026-08-06/08-26 so a from-scratch
replay puts them before everything that depends on them, even though the content wasn't
captured until 2026-09-22. If you're ever confused why those files' version numbers don't line
up with git blame, that's why — read each file's own header comment for the specific ordering
constraint it exists to satisfy (e.g. `e_trigger` has to come after
`20260826010000_auto_approve_parents.sql`, not with the rest of the baseline, because the
function its trigger calls isn't defined until then).

Getting an actual from-scratch replay to pass surfaced (and this repo fixed) several more
pre-existing bugs unrelated to the baseline itself: three pairs of migrations sharing the same
version number, a data repoint a later migration's own comment claimed was "done by hand" but
was never written down, and — found only after this deploy pipeline's first real run — 93
places where a migration's local filename version didn't match what Supabase had actually
recorded when it was applied, some of which `db push` refuses to run at all until fixed (see
Troubleshooting above). All of it is reconciled as of today; `supabase migration list` should
show a clean, fully-synced state going forward as long as new migrations follow the rules
above.
