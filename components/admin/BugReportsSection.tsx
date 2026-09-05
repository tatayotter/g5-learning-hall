'use client';
import { useEffect, useState } from 'react';
import { callAdminApi } from '@/lib/adminApi';

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

const STATUS_STYLES: Record<BugReport['status'], string> = {
  new: 'bg-indigo-900/50 text-indigo-300 border border-indigo-800',
  needs_manual_triage: 'bg-amber-900/50 text-amber-400 border border-amber-800',
  in_progress: 'bg-sky-900/50 text-sky-300 border border-sky-800',
  resolved: 'bg-[#223616]/50 text-[#7fae52] border border-[#33501f]',
  wont_fix: 'bg-neutral-800/50 text-gray-500 border border-neutral-700',
};

const SEVERITY_STYLES: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-[#e0605a] font-bold',
};

export default function BugReportsSection({ passcode }: { passcode: string }) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BugReport['status']>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { admin_notes: string; parent_update: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReports = async () => {
    setListError('');
    const result = await callAdminApi<{ reports: BugReport[] }>('/api/bug-reports-admin', { passcode, action: 'list' });
    setLoading(false);
    if (!result.success) {
      setListError(result.error || 'Failed to load reports');
      return;
    }
    setReports(result.reports || []);
  };

  useEffect(() => { loadReports(); }, []);

  const toggleExpand = (r: BugReport) => {
    if (expandedId === r.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(r.id);
    setDrafts((prev) => ({
      ...prev,
      [r.id]: prev[r.id] || { admin_notes: r.admin_notes || '', parent_update: r.parent_update || '' },
    }));
  };

  const handleSetStatus = async (id: string, status: BugReport['status']) => {
    setBusyId(id);
    const result = await callAdminApi('/api/bug-reports-admin', { passcode, action: 'update', id, status });
    setBusyId(null);
    if (!result.success) {
      setListError(result.error || 'Update failed');
      return;
    }
    loadReports();
  };

  const handleSaveNotes = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setBusyId(id);
    const result = await callAdminApi('/api/bug-reports-admin', {
      passcode, action: 'update', id,
      admin_notes: draft.admin_notes,
      parent_update: draft.parent_update,
    });
    setBusyId(null);
    if (!result.success) {
      setListError(result.error || 'Save failed');
      return;
    }
    loadReports();
  };

  const handleMarkNotified = async (id: string) => {
    setBusyId(id);
    const result = await callAdminApi('/api/bug-reports-admin', { passcode, action: 'update', id, mark_notified: true });
    setBusyId(null);
    if (!result.success) {
      setListError(result.error || 'Update failed');
      return;
    }
    loadReports();
  };

  if (loading) return <p className="text-[#8a7c66] text-sm">Loading…</p>;

  const filtered = reports.filter((r) => statusFilter === 'All' || r.status === statusFilter);

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Bug Reports</h2>
      <p className="text-[#8a7c66] text-sm mb-6">Parent-submitted bug reports, triaged by Groq. Emails to parents are written and sent manually.</p>

      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3]">
          <option value="All">All Statuses</option>
          <option value="new">New</option>
          <option value="needs_manual_triage">Needs Manual Triage</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="wont_fix">Won&apos;t Fix</option>
        </select>
      </div>

      {listError && <p className="text-[#e0605a] text-sm mb-4">{listError}</p>}
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-[#8a7c66] text-sm">No bug reports match this filter.</p>}
        {filtered.map((r) => (
          <div key={r.id} className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(r)}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-[#ede4d3] font-bold text-sm">{r.ai_title || '(untriaged report)'}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_STYLES[r.status]}`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                  {r.ai_severity && (
                    <span className={`text-[10px] font-bold uppercase ${SEVERITY_STYLES[r.ai_severity] || 'text-gray-500'}`}>
                      {r.ai_severity}
                    </span>
                  )}
                  {r.ai_category && <span className="text-[10px] text-gray-600">{r.ai_category}</span>}
                </div>
                <p className="text-[#8a7c66] text-xs">{r.parent_name || 'Unknown parent'} · {r.parent_email}</p>
                <p className="text-gray-600 text-xs">{new Date(r.created_at).toLocaleString()}</p>
                {r.ai_summary && <p className="text-[#a89c86] text-xs mt-2 line-clamp-2">{r.ai_summary}</p>}
                {!r.ai_summary && <p className="text-[#a89c86] text-xs mt-2 line-clamp-2">{r.raw_description}</p>}
              </div>
              <div className="flex-shrink-0 text-[#8a7c66] text-xs">
                {r.last_notified_at ? `Emailed ${new Date(r.last_notified_at).toLocaleDateString()}` : 'Not emailed yet'}
              </div>
            </div>

            {expandedId === r.id && (
              <div className="mt-4 pt-4 border-t border-[#3d3225] space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Raw description</p>
                  <p className="text-[#a89c86] text-sm whitespace-pre-wrap">{r.raw_description}</p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['new', 'needs_manual_triage', 'in_progress', 'resolved', 'wont_fix'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSetStatus(r.id, s)}
                        disabled={busyId === r.id || r.status === s}
                        className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                          r.status === s ? STATUS_STYLES[s] : 'border border-[#3d3225] text-[#8a7c66] hover:text-[#ede4d3]'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Admin notes (internal only)</p>
                  <textarea
                    value={drafts[r.id]?.admin_notes ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], admin_notes: e.target.value, parent_update: prev[r.id]?.parent_update ?? '' } }))}
                    rows={2}
                    className="w-full rounded-lg bg-neutral-950 border border-[#3d3225] px-3 py-2 text-sm text-[#ede4d3] resize-none"
                  />
                </div>

                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Message sent to parent (log what you emailed)</p>
                  <textarea
                    value={drafts[r.id]?.parent_update ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], parent_update: e.target.value, admin_notes: prev[r.id]?.admin_notes ?? '' } }))}
                    rows={3}
                    placeholder="Paste the email you sent the parent, for the record…"
                    className="w-full rounded-lg bg-neutral-950 border border-[#3d3225] px-3 py-2 text-sm text-[#ede4d3] resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleSaveNotes(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[#ede4d3] text-xs font-bold px-4 py-2"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => handleMarkNotified(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-[#3d3225] text-[#8a7c66] hover:text-[#ede4d3] disabled:opacity-50 text-xs font-bold px-4 py-2"
                  >
                    Mark as Emailed
                  </button>
                  <a
                    href={`mailto:${r.parent_email}?subject=${encodeURIComponent('Re: your Learning Hall bug report')}&body=${encodeURIComponent(drafts[r.id]?.parent_update || '')}`}
                    className="rounded-lg border border-[#3d3225] text-[#8a7c66] hover:text-[#ede4d3] text-xs font-bold px-4 py-2"
                  >
                    Open Email Draft
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
