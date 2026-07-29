'use client';
import { useState, useEffect } from 'react';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import {
  CustomEvent,
  EventQuest,
  fetchAllEvents,
  fetchEventQuests,
  countEventQuests,
} from '@/lib/customEvents';
import { callAdminApi } from '@/lib/adminApi';
import { GRADE_LEVELS } from '@/lib/userSession';

const EMPTY_EVENT_FORM = {
  title: '',
  banner_url: '',
  details_markdown: '',
  reward_lore_markdown: '',
  reward_monster_id: '',
  start_date: '',
  end_date: '',
};

function EventManager({ events, questCounts, onReload, passcode }: {
  events: CustomEvent[];
  questCounts: Record<string, number>;
  onReload: () => void;
  passcode: string;
}) {
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [monsterFilter, setMonsterFilter] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handlePosterUpload = async (file: File) => {
    setUploadingPoster(true);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('passcode', passcode);
      body.append('file', file);
      const res = await fetch('/api/admin-upload-poster', { method: 'POST', body });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Upload failed');
      setForm(f => ({ ...f, banner_url: result.url }));
    } catch (e: any) {
      setUploadError(`❌ Upload failed: ${e.message}`);
    }
    setUploadingPoster(false);
  };

  const monsterOptions = Object.values(ALL_MONSTERS).filter(m =>
    m.name.toLowerCase().includes(monsterFilter.toLowerCase())
  );

  const startEdit = (ev: CustomEvent) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      banner_url: ev.banner_url || '',
      details_markdown: ev.details_markdown || '',
      reward_lore_markdown: ev.reward_lore_markdown || '',
      reward_monster_id: ev.reward_monster_id,
      start_date: ev.start_date,
      end_date: ev.end_date,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_EVENT_FORM);
  };

  const handleSave = async () => {
    if (!form.title || !form.reward_monster_id || !form.start_date || !form.end_date) {
      alert('Title, curio reward, start date, and end date are required.');
      return;
    }
    if (form.end_date < form.start_date) {
      alert('End date must be on or after the start date.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-events', { passcode, action: 'upsert_event', id: editingId, ...form });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      resetForm();
      onReload();
    }
    setSaving(false);
  };

  const handleStatusChange = async (ev: CustomEvent, status: CustomEvent['status']) => {
    if ((status === 'scheduled' || status === 'active') && (questCounts[ev.id] || 0) === 0) {
      alert('This event has no quests yet — add Event Quests below before scheduling or activating it.');
      return;
    }
    const result = await callAdminApi('/api/admin-events', { passcode, action: 'set_status', id: ev.id, status });
    if (!result.success) {
      alert(`❌ Status update failed: ${result.error}`);
      return;
    }
    onReload();
  };

  const STATUS_COLORS: Record<CustomEvent['status'], string> = {
    draft: 'bg-neutral-800 text-gray-400 border-neutral-700',
    scheduled: 'bg-blue-900/30 text-blue-400 border-blue-800',
    active: 'bg-green-900/30 text-green-400 border-green-800',
    archived: 'bg-neutral-900 text-gray-600 border-neutral-800',
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">🎪 Event Manager</h2>
      <p className="text-gray-500 text-sm mb-6">
        Create a Custom Event now — title, banner, details, curio reward, and dates. Quests can be added
        later in the Event Quest Editor below (an event can't be scheduled or activated until it has at
        least one quest).
      </p>

      {/* Existing events list */}
      <div className="space-y-2 mb-8">
        {events.length === 0 && <p className="text-gray-600 text-sm">No events created yet.</p>}
        {events.map(ev => (
          <div key={ev.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold truncate">{ev.title}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[ev.status]}`}>
                  {ev.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {ev.start_date} → {ev.end_date} · {questCounts[ev.id] || 0} quest(s) · reward: {ALL_MONSTERS[ev.reward_monster_id]?.name || ev.reward_monster_id}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={ev.status}
                onChange={e => handleStatusChange(ev, e.target.value as CustomEvent['status'])}
                className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white"
              >
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
              <button
                onClick={() => startEdit(ev)}
                className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / edit form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-white font-bold mb-4">{editingId ? 'Edit Event' : 'New Event'}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Third Quarter Summative Showdown"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Banner / Poster Image</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                {uploadingPoster ? 'Uploading…' : '📤 Upload Poster'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPoster}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handlePosterUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
              {form.banner_url && (
                <img src={form.banner_url} alt="Poster preview" className="h-10 w-auto rounded border border-neutral-700" />
              )}
            </div>
            {uploadError && <p className="text-red-400 text-xs mb-2">{uploadError}</p>}
            <input
              value={form.banner_url}
              onChange={e => setForm({ ...form, banner_url: e.target.value })}
              placeholder="https://... or upload above"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Event Details (markdown)</label>
            <textarea
              value={form.details_markdown}
              onChange={e => setForm({ ...form, details_markdown: e.target.value })}
              className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-xs text-gray-300 font-mono resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Reward Lore (markdown)</label>
            <textarea
              value={form.reward_lore_markdown}
              onChange={e => setForm({ ...form, reward_lore_markdown: e.target.value })}
              className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-xs text-gray-300 font-mono resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Curio Reward{form.reward_monster_id && ` — selected: ${ALL_MONSTERS[form.reward_monster_id]?.name || form.reward_monster_id}`}
            </label>
            <input
              value={monsterFilter}
              onChange={e => setMonsterFilter(e.target.value)}
              placeholder="Search curios..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white mb-2"
            />
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg p-2">
              {monsterOptions.map(m => (
                <button
                  key={m.id}
                  onClick={() => setForm({ ...form, reward_monster_id: m.id })}
                  title={m.name}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-colors ${
                    form.reward_monster_id === m.id
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : 'border-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-gray-400 truncate w-full">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              {editingId ? 'Save Changes' : 'Create Event (draft)'}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventQuestEditor({ events, questCounts, onReload, passcode }: {
  events: CustomEvent[];
  questCounts: Record<string, number>;
  onReload: () => void;
  passcode: string;
}) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number>(5);
  const [existingQuests, setExistingQuests] = useState<EventQuest[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [parsed, setParsed] = useState<{ data: any[]; warnings: string[] } | null>(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedEventId) { setExistingQuests([]); return; }
    fetchEventQuests(selectedEventId).then(setExistingQuests);
  }, [selectedEventId]);

  const handleParse = () => {
    setParseError('');
    setParsed(null);
    try {
      const arr = JSON.parse(jsonInput);
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array of subjects');
      const warnings: string[] = [];
      arr.forEach((subj: any, si: number) => {
        if (!subj.subject_name) warnings.push(`Item ${si + 1}: missing subject_name`);
        if (!Array.isArray(subj.quiz) || subj.quiz.length === 0) {
          warnings.push(`${subj.subject_name || `Item ${si + 1}`}: missing quiz array`);
        } else {
          subj.quiz.forEach((q: any, qi: number) => {
            if (!q.correct_answer) warnings.push(`${subj.subject_name} quiz[${qi + 1}]: missing correct_answer`);
            if (!Array.isArray(q.options) || q.options.length < 2) {
              warnings.push(`${subj.subject_name} quiz[${qi + 1}]: needs at least 2 options`);
            } else if (q.correct_answer && !q.options.includes(q.correct_answer)) {
              warnings.push(`${subj.subject_name} quiz[${qi + 1}]: correct_answer does not match any option exactly`);
            }
          });
        }
      });
      setParsed({ data: arr, warnings });
    } catch (e: any) {
      setParseError(`JSON parse error: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!parsed || parsed.warnings.length > 0 || !selectedEventId) return;
    setSaving(true);
    const rows = parsed.data.map((subj: any, i: number) => ({
      subject_name: subj.subject_name,
      summary_markdown: subj.summary_markdown || null,
      quiz: subj.quiz,
      sort_order: i,
      grade_level: gradeLevel,
    }));
    const result = await callAdminApi('/api/admin-event-quests', { passcode, eventId: selectedEventId, rows });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      setParsed(null);
      setJsonInput('');
      fetchEventQuests(selectedEventId).then(setExistingQuests);
      onReload();
      alert('✅ Event quests saved!');
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">📜 Event Quest Editor</h2>
      <p className="text-gray-500 text-sm mb-6">
        Paste per-subject quest content for an event. This is independent of the Event Manager above —
        create the event first, then come back and paste subjects here whenever they're ready (typically
        the Sunday before the event starts).
      </p>

      <div className="mb-4">
        <label className="text-xs text-gray-500 block mb-1">Event</label>
        <select
          value={selectedEventId}
          onChange={e => setSelectedEventId(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">— Select an event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title} ({ev.start_date} → {ev.end_date})</option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <>
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">Grade — the paste below applies to this grade only</label>
            <div className="flex gap-1.5 flex-wrap">
              {GRADE_LEVELS.map(g => (
                <button
                  key={g}
                  onClick={() => setGradeLevel(g)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${gradeLevel === g ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400 hover:text-white'}`}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>

          {existingQuests.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">Existing quests for this event ({existingQuests.length}):</p>
              <div className="flex flex-wrap gap-2">
                {existingQuests.map(q => (
                  <span key={q.id} className="text-xs bg-neutral-800 text-gray-300 px-2 py-1 rounded-full">
                    {q.subject_name} · Grade {q.grade_level} ({q.quiz.length} q)
                  </span>
                ))}
              </div>
            </div>
          )}

          {!parsed && (
            <div className="space-y-3">
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder={`Paste an array like:\n[\n  {\n    "subject_name": "Math",\n    "summary_markdown": "...",\n    "quiz": [ { "question": "...", "options": ["A","B"], "correct_answer": "A" } ]\n  }\n]`}
                className="w-full h-48 bg-neutral-950 border border-neutral-700 rounded-xl p-4 font-mono text-xs text-gray-300 focus:outline-none focus:border-neutral-500 resize-none"
              />
              {parseError && <p className="text-red-400 text-xs">{parseError}</p>}
              <button
                onClick={handleParse}
                disabled={!jsonInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
              >
                Parse & Preview
              </button>
            </div>
          )}

          {parsed && (
            <div>
              {parsed.warnings.length > 0 ? (
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 font-bold text-sm mb-2">⚠️ {parsed.warnings.length} warning(s) — fix before saving</p>
                  {parsed.warnings.map((w, i) => <p key={i} className="text-yellow-300 text-xs">{w}</p>)}
                </div>
              ) : (
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-3 mb-4">
                  <p className="text-green-400 text-sm font-bold">✅ {parsed.data.length} subject(s) ready to save</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || parsed.warnings.length > 0}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
                >
                  Save Quests
                </button>
                <button
                  onClick={() => { setParsed(null); }}
                  className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold px-6 py-2 rounded-lg transition-colors"
                >
                  Back to Edit
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventsSection({ passcode }: { passcode: string }) {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const all = await fetchAllEvents();
    setEvents(all);
    const counts: Record<string, number> = {};
    await Promise.all(all.map(async ev => { counts[ev.id] = await countEventQuests(ev.id); }));
    setQuestCounts(counts);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  if (loading) return <p className="text-gray-500">Loading events...</p>;

  return (
    <div className="space-y-10">
      <EventManager events={events} questCounts={questCounts} onReload={reload} passcode={passcode} />
      <div className="border-t border-neutral-800 pt-10">
        <EventQuestEditor events={events} questCounts={questCounts} onReload={reload} passcode={passcode} />
      </div>
    </div>
  );
}
