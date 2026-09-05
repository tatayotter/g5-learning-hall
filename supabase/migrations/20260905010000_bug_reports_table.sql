-- Bug reports submitted from the parent dashboard, triaged by Groq (AI) into
-- structured fields. Only the service role (server-side API route / admin
-- tooling) reads or writes this table — parents have no direct access and
-- are updated on progress via manually-written email, logged in
-- parent_update / last_notified_at.

create table public.bug_reports (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- who / where
  parent_id     uuid references public.parents(id),
  parent_name   text,
  parent_email  text not null,   -- snapshotted from auth.users.email at submit time
  source_page   text not null default 'parent-dashboard',

  -- raw input, always saved verbatim regardless of AI triage outcome
  raw_description text not null,

  -- AI-parsed fields (nullable — triage can fail or be skipped)
  ai_title      text,
  ai_category   text check (ai_category in ('login','payments','progress-tracking','content','ui','other')),
  ai_severity   text check (ai_severity in ('low','medium','high','critical')),
  ai_summary    text,
  ai_confidence numeric(3,2),

  -- workflow
  status        text not null default 'new'
                check (status in ('new','needs_manual_triage','in_progress','resolved','wont_fix')),
  status_updated_at timestamptz,
  resolved_at   timestamptz,

  admin_notes   text,           -- internal only, never emailed to parent
  parent_update text,           -- log of the last message manually emailed to the parent
  last_notified_at timestamptz  -- when admin last manually emailed the parent about this ticket
);

create index bug_reports_status_idx on public.bug_reports (status);
create index bug_reports_parent_id_idx on public.bug_reports (parent_id);

-- Lock the table down entirely: no policies for anon/authenticated means
-- only the service role key (used server-side) can read or write.
alter table public.bug_reports enable row level security;
