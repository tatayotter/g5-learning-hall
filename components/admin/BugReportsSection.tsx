'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Mail, MailCheck, RefreshCw } from 'lucide-react';
import { callAdminApi } from '@/lib/adminApi';
import {
  Badge, Button, Card, cx, EmptyState, ErrorBanner, Field, PageHeader, SearchInput, Segmented, Skeleton, Textarea, useToast,
} from '@/components/admin/ui';

interface BugReport {
  id: string;
  created_at: string;
  parent_name: string | null;
  parent_email: string;
  source_page: string;
  raw_description: string;
  ai_title: string | null;
  ai_category: string | null;
  ai_severity: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  status: 'new' | 'needs_manual_triage' | 'in_progress' | 'resolved' | 'wont_fix';
  admin_notes: string | null;
  parent_update: string | null;
  last_notified_at: string | null;
}

type Status = BugReport['status'];
const STATUSES: Status[] = ['new', 'needs_manual_triage', 'in_progress', 'resolved', 'wont_fix'];
const STATUS_LABEL: Record<Status, string> = {
  new: 'New', needs_manual_triage: 'Needs triage', in_progress: 'In progress', resolved: 'Resolved', wont_fix: "Won't fix",
};
const STATUS_TONE = {
  new: 'info', needs_manual_triage: 'warning', in_progress: 'info', resolved: 'good', wont_fix: 'neutral',
} as const;
const SEVERITY_TONE: Record<string, 'neutral' | 'warning' | 'critical'> = {
  low: 'neutral', medium: 'warning', high: 'critical', critical: 'critical',
};
const OPEN: Status[] = ['new', 'needs_manual_triage', 'in_progress'];

const fmt = (ts: string) =>
  new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function BugReportsSection({ passcode }: { passcode: string }) {
  const toast = useToast();
  const [reports, setReports] = useState<BugReport[] | null>(null);
  const [listError, setListError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all' | Status>('open');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { admin_notes: string; parent_update: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    callAdminApi<{ reports: BugReport[] }>('/api/bug-reports-admin', { passcode, action: 'list' }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setListError(result.error || 'Failed to load reports');
        setReports((r) => r ?? []);
        return;
      }
      setListError('');
      setReports(result.reports || []);
    });
    return () => { cancelled = true; };
  }, [passcode, reloadTick]);

  const reload = () => setReloadTick((t) => t + 1);

  const toggleExpand = (r: BugReport) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    setDrafts((prev) => ({
      ...prev,
      [r.id]: prev[r.id] || { admin_notes: r.admin_notes || '', parent_update: r.parent_update || '' },
    }));
  };

  const update = async (id: string, body: Record<string, unknown>, done: string) => {
    setBusyId(id);
    const result = await callAdminApi('/api/bug-reports-admin', { passcode, action: 'update', id, ...body });
    setBusyId(null);
    if (!result.success) { toast(result.error || 'Update failed', 'error'); return; }
    toast(done);
    reload();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, open: 0 };
    for (const s of STATUSES) c[s] = 0;
    for (const r of reports ?? []) {
      c.all++;
      c[r.status]++;
      if (OPEN.includes(r.status)) c.open++;
    }
    return c;
  }, [reports]);

  const q = search.trim().toLowerCase();
  const filtered = (reports ?? []).filter((r) =>
    (statusFilter === 'all' || (statusFilter === 'open' ? OPEN.includes(r.status) : r.status === statusFilter)) &&
    (!q || [r.ai_title, r.ai_summary, r.raw_description, r.parent_email, r.parent_name, r.ai_category]
      .some((v) => (v ?? '').toLowerCase().includes(q))),
  );

  const setDraft = (id: string, field: 'admin_notes' | 'parent_update', value: string) =>
    setDrafts((prev) => ({
      ...prev,
      [id]: { admin_notes: prev[id]?.admin_notes ?? '', parent_update: prev[id]?.parent_update ?? '', [field]: value },
    }));

  return (
    <div>
      <PageHeader
        title="Bug reports"
        description="Parent-submitted reports, triaged by AI. Emails to parents are written and sent manually."
        actions={<Button icon={RefreshCw} onClick={reload}>Refresh</Button>}
      />

      {listError && <div className="mb-4"><ErrorBanner message={listError} onRetry={reload} /></div>}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'open', label: `Open ${counts.open}` },
            { value: 'resolved', label: `Resolved ${counts.resolved}` },
            { value: 'wont_fix', label: `Won't fix ${counts.wont_fix}` },
            { value: 'all', label: `All ${counts.all}` },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search title, description or parent" className="min-w-[240px] flex-1" />
      </div>

      {!reports ? (
        <Skeleton className="h-48 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={statusFilter === 'open' ? 'No open bug reports' : 'No reports match'}
            description={statusFilter === 'open' ? 'Everything parents reported has been handled.' : undefined}
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)]">
          {filtered.map((r, i) => {
            const open = expandedId === r.id;
            return (
              <div key={r.id} className={cx(i > 0 && 'border-t border-[var(--a-border)]')}>
                <button
                  type="button"
                  onClick={() => toggleExpand(r)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-[var(--a-surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--a-accent)]"
                >
                  <ChevronRight size={16} className={cx('mt-0.5 shrink-0 text-[var(--a-muted)] transition-transform', open && 'rotate-90')} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[var(--a-ink)]">{r.ai_title || 'Untriaged report'}</p>
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.ai_severity && <Badge tone={SEVERITY_TONE[r.ai_severity] ?? 'neutral'}>{r.ai_severity}</Badge>}
                      {r.ai_category && <span className="text-xs text-[var(--a-muted)]">{r.ai_category}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--a-ink-2)]">{r.ai_summary || r.raw_description}</p>
                    <p className="mt-1 text-xs text-[var(--a-muted)]">
                      {r.parent_name || 'Unknown parent'} · {r.parent_email} · {fmt(r.created_at)}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-[var(--a-muted)] sm:block">
                    {r.last_notified_at ? `Emailed ${new Date(r.last_notified_at).toLocaleDateString()}` : 'Not emailed'}
                  </span>
                </button>

                {open && (
                  <div className="space-y-4 border-t border-[var(--a-border)] bg-[var(--a-surface-2)]/40 px-5 py-4 sm:pl-12">
                    <div>
                      <p className="mb-1 text-xs font-medium text-[var(--a-muted)]">Parent&apos;s description</p>
                      <p className="whitespace-pre-wrap text-sm text-[var(--a-ink-2)]">{r.raw_description}</p>
                      {r.source_page && <p className="mt-1 text-xs text-[var(--a-muted)]">From: {r.source_page}</p>}
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-medium text-[var(--a-muted)]">Status</p>
                      <div className="overflow-x-auto">
                        <Segmented
                          ariaLabel="Set status"
                          value={r.status}
                          onChange={(s) => {
                            if (s !== r.status && busyId !== r.id) update(r.id, { status: s }, `Marked ${STATUS_LABEL[s].toLowerCase()}.`);
                          }}
                          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                        />
                      </div>
                    </div>

                    <Field label="Admin notes (internal only)">
                      <Textarea rows={2} value={drafts[r.id]?.admin_notes ?? ''} onChange={(e) => setDraft(r.id, 'admin_notes', e.target.value)} />
                    </Field>
                    <Field label="Message sent to the parent (log what you emailed)">
                      <Textarea
                        rows={3}
                        placeholder="Paste the email you sent the parent, for the record"
                        value={drafts[r.id]?.parent_update ?? ''}
                        onChange={(e) => setDraft(r.id, 'parent_update', e.target.value)}
                      />
                    </Field>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        disabled={busyId === r.id}
                        onClick={() => update(r.id, { admin_notes: drafts[r.id]?.admin_notes ?? '', parent_update: drafts[r.id]?.parent_update ?? '' }, 'Notes saved.')}
                      >
                        Save notes
                      </Button>
                      <Button icon={MailCheck} disabled={busyId === r.id} onClick={() => update(r.id, { mark_notified: true }, 'Marked as emailed.')}>
                        Mark as emailed
                      </Button>
                      <a
                        href={`mailto:${r.parent_email}?subject=${encodeURIComponent('Re: your Learning Hall bug report')}&body=${encodeURIComponent(drafts[r.id]?.parent_update || '')}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-[var(--a-ink-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]"
                      >
                        <Mail size={16} aria-hidden /> Open email draft
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
