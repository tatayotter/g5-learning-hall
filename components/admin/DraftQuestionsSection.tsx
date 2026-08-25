'use client';
import { useState, useEffect } from 'react';
import { getScheduledDay } from '@/lib/subjectSchedule';
import { callAdminApi } from '@/lib/adminApi';
import { GRADE_LEVELS } from '@/lib/userSession';
import { CURRENT_TERM } from '@/lib/guildConfig';

interface DraftSummary {
  id: string;
  week_starting_date: string;
  grade: number;
  subject: string;
  summary_markdown: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  reviewed_at: string | null;
}

interface DraftQuestion {
  id: string;
  week_starting_date: string;
  grade: number;
  subject: string;
  tier: number;
  topic: string;
  question: string;
  options: string[];
  correct_answer: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  reviewed_at: string | null;
}

const DRAFT_GRADES = GRADE_LEVELS.map(grade => ({ grade, label: `Grade ${grade}` }));

const WEEKDAYS_FOR_PUBLISH = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const DRAFT_STATUS_COLORS: Record<DraftQuestion['status'], string> = {
  pending_review: 'bg-neutral-800 text-gray-400 border-neutral-700',
  approved: 'bg-blue-900/30 text-blue-400 border-blue-800',
  rejected: 'bg-red-900/30 text-red-400 border-red-800',
  published: 'bg-green-900/30 text-green-400 border-green-800',
};

function DraftQuestionRow({ draft, selected, onToggleSelect, onReload, passcode }: {
  draft: DraftQuestion;
  selected: boolean;
  onToggleSelect: () => void;
  onReload: () => void;
  passcode: string;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    question: draft.question,
    options: [...draft.options],
    correct_answer: draft.correct_answer,
    topic: draft.topic,
    tier: draft.tier,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.question || form.options.some(o => !o) || !form.correct_answer || !form.topic) {
      alert('Question, all 4 options, correct answer, and topic are required.');
      return;
    }
    if (!form.options.includes(form.correct_answer)) {
      alert('Correct answer must exactly match one of the options.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-draft-questions', { passcode, action: 'update_draft', id: draft.id, ...form });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      setEditing(false);
      onReload();
    }
    setSaving(false);
  };

  const handleStatus = async (status: 'approved' | 'rejected' | 'pending_review') => {
    const result = await callAdminApi('/api/admin-draft-questions', { passcode, action: 'set_status', id: draft.id, status });
    if (!result.success) {
      alert(`❌ Status update failed: ${result.error}`);
      return;
    }
    onReload();
  };

  if (editing) {
    return (
      <div className="bg-neutral-950 border border-blue-800 rounded-lg p-4 space-y-3">
        <textarea
          value={form.question}
          onChange={e => setForm({ ...form, question: e.target.value })}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          rows={2}
        />
        <div className="grid grid-cols-2 gap-2">
          {form.options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={e => {
                const next = [...form.options];
                next[i] = e.target.value;
                setForm({ ...form, options: next });
              }}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
              placeholder={`Option ${i + 1}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.correct_answer}
            onChange={e => setForm({ ...form, correct_answer: e.target.value })}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Select correct answer…</option>
            {form.options.filter(Boolean).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
          <select
            value={form.tier}
            onChange={e => setForm({ ...form, tier: Number(e.target.value) })}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value={1}>Tier 1</option>
            <option value={2}>Tier 2</option>
            <option value={3}>Tier 3</option>
          </select>
        </div>
        <input
          value={form.topic}
          onChange={e => setForm({ ...form, topic: e.target.value })}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          placeholder="Topic"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex items-start gap-3">
      {draft.status === 'approved' && (
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${DRAFT_STATUS_COLORS[draft.status]}`}>
            {draft.status.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-gray-500">Tier {draft.tier} · {draft.topic}</span>
        </div>
        <p className="text-white text-sm mb-1">{draft.question}</p>
        <p className="text-xs text-gray-500">
          {draft.options.join(' · ')} — <span className="text-green-500">{draft.correct_answer}</span>
        </p>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {draft.status === 'pending_review' && (
          <>
            <button onClick={() => setEditing(true)} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Edit</button>
            <button onClick={() => handleStatus('approved')} className="bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Approve</button>
            <button onClick={() => handleStatus('rejected')} className="bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Reject</button>
          </>
        )}
        {draft.status === 'approved' && (
          <button onClick={() => handleStatus('pending_review')} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Unapprove</button>
        )}
      </div>
    </div>
  );
}

function DraftSummaryCard({ summary, onReload, passcode, publishDay, publishWeek }: {
  summary: DraftSummary;
  onReload: () => void;
  passcode: string;
  publishDay: typeof WEEKDAYS_FOR_PUBLISH[number];
  publishWeek: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(summary.summary_markdown);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) {
      alert('Summary markdown cannot be empty.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-draft-questions', { passcode, action: 'update_summary', id: summary.id, summary_markdown: text });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      setEditing(false);
      onReload();
    }
    setSaving(false);
  };

  const handleStatus = async (status: 'approved' | 'rejected' | 'pending_review') => {
    const result = await callAdminApi('/api/admin-draft-questions', { passcode, action: 'set_summary_status', id: summary.id, status });
    if (!result.success) {
      alert(`❌ Status update failed: ${result.error}`);
      return;
    }
    onReload();
  };

  const handlePublish = async () => {
    setPublishing(true);
    const result = await callAdminApi('/api/admin-draft-questions', {
      passcode, action: 'publish_summary',
      id: summary.id, grade: summary.grade, day: publishDay, subject: summary.subject, week_starting_date: publishWeek,
    });
    if (!result.success) {
      alert(`❌ Publish failed: ${result.error}`);
    } else {
      onReload();
    }
    setPublishing(false);
  };

  return (
    <div className="bg-neutral-950 border border-amber-900/50 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-amber-900/20 text-amber-400 border-amber-800">
          Summary
        </span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${DRAFT_STATUS_COLORS[summary.status]}`}>
          {summary.status.replace('_', ' ')}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
            rows={5}
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-300 text-sm whitespace-pre-wrap mb-3">{summary.summary_markdown}</p>
      )}

      {!editing && (
        <div className="flex items-center gap-2 flex-wrap">
          {summary.status === 'pending_review' && (
            <>
              <button onClick={() => setEditing(true)} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Edit</button>
              <button onClick={() => handleStatus('approved')} className="bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Approve</button>
              <button onClick={() => handleStatus('rejected')} className="bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Reject</button>
            </>
          )}
          {summary.status === 'approved' && (
            <>
              <button onClick={() => handleStatus('pending_review')} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-lg transition-colors">Unapprove</button>
              <button
                onClick={handlePublish}
                disabled={publishing || !publishWeek}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ml-auto"
              >
                {publishing ? 'Publishing…' : `Publish summary to ${publishDay}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DraftSubjectGroup({ subject, drafts, summary, grade, selectedIds, onToggleSelect, onSelectAll, onReload, passcode }: {
  subject: string;
  drafts: DraftQuestion[];
  summary?: DraftSummary;
  grade: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], selected: boolean) => void;
  onReload: () => void;
  passcode: string;
}) {
  const publishDay = getScheduledDay(subject, grade);
  const [publishWeek, setPublishWeek] = useState(drafts[0]?.week_starting_date || summary?.week_starting_date || '');
  const [publishing, setPublishing] = useState(false);

  const idsInThisSubject = drafts.filter(d => selectedIds.has(d.id)).map(d => d.id);
  const approvedIds = drafts.filter(d => d.status === 'approved').map(d => d.id);
  const allApprovedSelected = approvedIds.length > 0 && approvedIds.every(id => selectedIds.has(id));

  const handlePublish = async () => {
    if (idsInThisSubject.length === 0) return;
    setPublishing(true);
    const result = await callAdminApi('/api/admin-draft-questions', {
      passcode, action: 'publish',
      ids: idsInThisSubject, grade, day: publishDay, subject, week_starting_date: publishWeek, term: CURRENT_TERM,
    });
    if (!result.success) {
      alert(`❌ Publish failed: ${result.error}`);
    } else {
      onReload();
    }
    setPublishing(false);
  };

  return (
    <div className="mb-6">
      <h3 className="text-white font-bold text-sm mb-2">{subject}</h3>
      {approvedIds.length > 0 && (
        <label className="flex items-center gap-2 mb-2 text-xs text-gray-400 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={allApprovedSelected}
            onChange={() => onSelectAll(approvedIds, !allApprovedSelected)}
          />
          Select all {approvedIds.length} approved
        </label>
      )}
      {summary && (
        <DraftSummaryCard summary={summary} onReload={onReload} passcode={passcode} publishDay={publishDay} publishWeek={publishWeek} />
      )}
      <div className="space-y-2 mb-3">
        {drafts.map(d => (
          <DraftQuestionRow
            key={d.id}
            draft={d}
            selected={selectedIds.has(d.id)}
            onToggleSelect={() => onToggleSelect(d.id)}
            onReload={onReload}
            passcode={passcode}
          />
        ))}
      </div>
      {(idsInThisSubject.length > 0 || summary?.status === 'approved') && (
        <div className="bg-neutral-900 border border-blue-800 rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-blue-400 font-bold">
            {idsInThisSubject.length > 0 ? `${idsInThisSubject.length} selected` : 'Publish target'}
          </span>
          <span
            title="Day is fixed by the subject schedule"
            className="text-[10px] font-bold px-2 py-1 rounded-md bg-neutral-800 text-white"
          >
            🔒 {publishDay}
          </span>
          <input
            type="date"
            value={publishWeek}
            onChange={e => setPublishWeek(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
          />
          {idsInThisSubject.length > 0 && (
            <button
              onClick={handlePublish}
              disabled={publishing || !publishWeek}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ml-auto"
            >
              {publishing ? 'Publishing…' : `Publish ${idsInThisSubject.length} to ${publishDay}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DraftQuestionsSection({ passcode }: { passcode: string }) {
  const [grade, setGrade] = useState(5);
  const [statusFilter, setStatusFilter] = useState<DraftQuestion['status']>('pending_review');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [summaries, setSummaries] = useState<DraftSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    // draft_questions/draft_summaries deny all direct client reads (RLS) —
    // correct_answer for content still pending review shouldn't be readable
    // by anyone holding the public anon key. Routed through the same
    // passcode-gated, service-role admin API every mutation here already uses.
    const result = await callAdminApi<{ questions: DraftQuestion[]; summaries: DraftSummary[] }>(
      '/api/admin-draft-questions',
      { passcode, action: 'list_drafts', grade, statuses: [statusFilter] }
    );
    setDrafts(result.success ? result.questions || [] : []);
    setSummaries(result.success ? result.summaries || [] : []);
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => { reload(); }, [grade, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[], selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => selected ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const bySubject: Record<string, DraftQuestion[]> = {};
  drafts.forEach(d => {
    if (!bySubject[d.subject]) bySubject[d.subject] = [];
    bySubject[d.subject].push(d);
  });

  const summaryBySubject: Record<string, DraftSummary> = {};
  summaries.forEach(s => { summaryBySubject[s.subject] = s; });

  // Union of subjects present in either questions or summaries — a subject
  // may have a pending summary before any questions exist for it, or vice versa.
  const allSubjects = Array.from(new Set([...Object.keys(bySubject), ...Object.keys(summaryBySubject)])).sort();

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">📝 Draft Questions</h2>
      <p className="text-gray-500 text-sm mb-6">
        AI-generated Main Quest questions and lesson summaries, tiered and topic-tagged, awaiting review
        before publishing into a grade's shared weekly content. Publishing does not touch the 5 Guilds.
      </p>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1">
          {DRAFT_GRADES.map(g => (
            <button
              key={g.grade}
              onClick={() => setGrade(g.grade)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                grade === g.grade ? 'bg-white text-black' : 'bg-neutral-800 text-gray-400 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DraftQuestion['status'])}
          className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white"
        >
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading drafts...</p>}
      {!loading && allSubjects.length === 0 && (
        <p className="text-gray-600 text-sm">No {statusFilter.replace('_', ' ')} drafts for this grade.</p>
      )}
      {!loading && allSubjects.map(subject => (
        <DraftSubjectGroup
          key={subject}
          subject={subject}
          drafts={bySubject[subject] || []}
          summary={summaryBySubject[subject]}
          grade={grade}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onReload={reload}
          passcode={passcode}
        />
      ))}
    </div>
  );
}
