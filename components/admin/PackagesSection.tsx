'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WeeklyData } from '@/hooks/useWeeklyData';
import { format, startOfWeek } from 'date-fns';
import { getScheduledDay } from '@/lib/subjectSchedule';
import { callAdminApi } from '@/lib/adminApi';
import { GRADE_LEVELS } from '@/lib/userSession';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Validates one week's parsed JSON (day -> subject -> {quiz|questions, summary_markdown}) the
// same way for both the single-week editor and bulk import, so both paths catch the same
// mistakes. MonsterGuild's extractQuestions() accepts either a `quiz` or `questions` array per
// subject, so both shapes must be checked here — validating only `quiz` let unvalidated
// `questions` arrays flow straight into live Monster Arena battles.
function validateWeekDays(obj: any, grade: number): string[] {
  const warnings: string[] = [];
  Object.keys(obj || {}).forEach(day => {
    const subjects = obj[day];
    Object.keys(subjects).forEach(subject => {
      const s = subjects[subject];
      const scheduledDay = getScheduledDay(subject, grade);
      if (day !== scheduledDay) {
        warnings.push(`${day} / ${subject}: this subject is scheduled for ${scheduledDay}, not ${day}`);
      }
      const key: 'quiz' | 'questions' | null = Array.isArray(s.quiz) ? 'quiz' : Array.isArray(s.questions) ? 'questions' : null;
      if (!key) {
        warnings.push(`${day} / ${subject}: missing quiz/questions array`);
      } else {
        s[key].forEach((q: any, i: number) => {
          if (!q.correct_answer) {
            warnings.push(`${day} / ${subject} ${key}[${i + 1}]: missing correct_answer`);
          }
          if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
            warnings.push(`${day} / ${subject} ${key}[${i + 1}]: needs at least 2 options`);
          } else if (q.correct_answer && !q.options.includes(q.correct_answer)) {
            // Catches typos/whitespace/casing mismatches that would otherwise
            // make the question permanently unanswerable — no option would
            // ever equal correct_answer at render time.
            warnings.push(`${day} / ${subject} ${key}[${i + 1}]: correct_answer does not match any option exactly`);
          }
        });
      }
    });
  });
  return warnings;
}

function WeeklyPackageHistory({ grade }: { grade: number }) {
  const [weeks, setWeeks] = useState<{ week_starting_date: string; has_content: boolean }[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data: weekRows } = await supabase
        .from('content_weeks')
        .select('id, week_starting_date')
        .eq('grade', grade)
        .order('week_starting_date', { ascending: false })
        .limit(10);

      if (!weekRows || weekRows.length === 0) { setWeeks([]); return; }

      const weekIds = weekRows.map(w => w.id);
      // "Has content" approximated by whether any content_days row exists for the week —
      // admin_set_content_week always creates one per authored day, so an empty result means
      // the week was never actually saved (content_weeks rows can exist standalone from
      // admin_create_content_week pre-staging, per Phase 1, with no days yet).
      const { data: dayRows } = await supabase
        .from('content_days')
        .select('content_week_id')
        .in('content_week_id', weekIds);
      const weeksWithContent = new Set((dayRows || []).map((d: any) => d.content_week_id));

      setWeeks(weekRows.map(w => ({
        week_starting_date: w.week_starting_date,
        has_content: weeksWithContent.has(w.id),
      })));
    }
    fetch();
  }, [grade]);

  if (weeks.length === 0) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Recent Weeks — Grade {grade}</p>
      <div className="space-y-2">
        {weeks.map(w => (
          <div key={w.week_starting_date} className="flex items-center justify-between">
            <span className="text-sm text-gray-300 font-mono">{w.week_starting_date}</span>
            {w.has_content ? (
              <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full font-bold">✅ Has Content</span>
            ) : (
              <span className="text-xs bg-neutral-800 text-gray-500 border border-neutral-700 px-2 py-0.5 rounded-full">Empty</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BULK IMPORT ────────────────────────────────────────────────────────────
// Accepts an array of {grade, week_starting_date, days} entries in one paste, so the admin can
// author many weeks/grades ahead of time instead of trickling them in week-by-week (per the
// 2026-08-11 clarification: content is still strictly one-per-week, no cross-week reuse — this
// is purely a bulk-authoring UX, not a schema change). Validates every week in the batch before
// saving anything; once saving starts, each week is its own admin_set_content_week call/
// transaction, so one bad week's failure doesn't block or roll back the others.
interface BulkWeekEntry {
  grade: number;
  week_starting_date: string;
  days: any;
  warnings: string[];
}

function BulkImportPanel({ passcode }: { passcode: string }) {
  const [bulkInput, setBulkInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [entries, setEntries] = useState<BulkWeekEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<{ grade: number; week: string; success: boolean; error?: string }[] | null>(null);

  const totalWarnings = entries?.reduce((sum, e) => sum + e.warnings.length, 0) ?? 0;

  const handleParse = () => {
    setParseError('');
    setEntries(null);
    setResults(null);
    try {
      const arr = JSON.parse(bulkInput);
      if (!Array.isArray(arr)) throw new Error('Top-level JSON must be an array of {grade, week_starting_date, days}');
      const parsed: BulkWeekEntry[] = arr.map((entry: any, i: number) => {
        if (typeof entry.grade !== 'number') throw new Error(`Entry ${i + 1}: missing/invalid "grade"`);
        if (typeof entry.week_starting_date !== 'string') throw new Error(`Entry ${i + 1}: missing/invalid "week_starting_date"`);
        if (typeof entry.days !== 'object' || entry.days === null) throw new Error(`Entry ${i + 1}: missing "days" object`);
        return {
          grade: entry.grade,
          week_starting_date: entry.week_starting_date,
          days: entry.days,
          warnings: validateWeekDays(entry.days, entry.grade),
        };
      });
      setEntries(parsed);
    } catch (e: any) {
      setParseError(`JSON parse error: ${e.message}`);
    }
  };

  const handleSaveAll = async () => {
    if (!entries || totalWarnings > 0) return;
    setSaving(true);
    const outcomes: { grade: number; week: string; success: boolean; error?: string }[] = [];
    for (const entry of entries) {
      const result = await callAdminApi('/api/admin-weekly', {
        passcode, action: 'set_content_week',
        grade: entry.grade, weekStartingDate: entry.week_starting_date, days: entry.days,
      });
      outcomes.push({
        grade: entry.grade, week: entry.week_starting_date,
        success: !!result.success, error: result.success ? undefined : result.error,
      });
    }
    setResults(outcomes);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-gray-500 text-xs">
        Paste an array of weeks: <code className="text-gray-400">[{'{'}"grade": 5, "week_starting_date": "2026-09-06", "days": {'{'}...{'}'}{'}'}, ...]</code>
      </p>
      <textarea
        value={bulkInput}
        onChange={e => setBulkInput(e.target.value)}
        placeholder="Paste multiple weeks' JSON here..."
        className="w-full h-48 bg-neutral-950 border border-neutral-700 rounded-xl p-4 font-mono text-xs text-gray-300 focus:outline-none focus:border-neutral-500 resize-none"
      />
      {parseError && <p className="text-red-400 text-xs">{parseError}</p>}
      <button
        onClick={handleParse}
        disabled={!bulkInput.trim()}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
      >
        Parse & Preview Batch
      </button>

      {entries && (
        <div className="space-y-3 mt-4">
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className={`rounded-lg p-3 border ${e.warnings.length > 0 ? 'bg-yellow-900/20 border-yellow-800' : 'bg-green-900/20 border-green-800'}`}>
                <p className={`text-sm font-bold ${e.warnings.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  Grade {e.grade} — week of {e.week_starting_date} — {e.warnings.length === 0 ? '✅ valid' : `⚠️ ${e.warnings.length} warning${e.warnings.length > 1 ? 's' : ''}`}
                </p>
                {e.warnings.map((w, wi) => (
                  <p key={wi} className="text-yellow-300 text-xs mt-1">{w}</p>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving || totalWarnings > 0}
            title={totalWarnings > 0 ? 'Fix every warning above before saving' : undefined}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : totalWarnings > 0 ? `⚠️ Fix ${totalWarnings} warning${totalWarnings > 1 ? 's' : ''} to save` : `💾 Save all ${entries.length} weeks`}
          </button>

          {results && (
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-1">
              <p className="text-xs text-gray-400 font-bold mb-2">
                {results.filter(r => r.success).length} of {results.length} weeks saved
                {results.some(r => !r.success) ? `, ${results.filter(r => !r.success).length} failed` : ''}
              </p>
              {results.map((r, i) => (
                <p key={i} className={`text-xs ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                  {r.success ? '✅' : '❌'} Grade {r.grade} — {r.week}{r.error ? ` — ${r.error}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SINGLE-WEEK EDITOR ─────────────────────────────────────────────────────

export default function WeeklyPackageBuilder({ currentData, currentSunday, onUpdateStats, passcode, onNavigateToDrafts }: {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  passcode: string;
  onNavigateToDrafts: () => void;
}) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [grade, setGrade] = useState<number>(5);
  const [pendingDraftCount, setPendingDraftCount] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(currentSunday);
  const [weekHasRow, setWeekHasRow] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [parseError, setParseError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<{ day: string; subject: string; idx: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(WEEK_DAYS));

  const shiftWeek = (deltaDays: number) => {
    const d = new Date(selectedWeek + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    setSelectedWeek(format(startOfWeek(d), 'yyyy-MM-dd'));
  };

  useEffect(() => {
    async function loadPackage() {
      setLoadingPackage(true);
      const result = await callAdminApi('/api/admin-weekly', {
        passcode, action: 'get_content_week', grade, weekStartingDate: selectedWeek,
      });
      const days = result.success ? (result.days || {}) : {};
      const hasContent = Object.keys(days).length > 0;
      setWeekHasRow(hasContent);
      setJsonInput(hasContent ? JSON.stringify(days, null, 2) : '');
      setParsed(null);
      setParseError('');
      setLoadingPackage(false);
    }
    loadPackage();
  }, [grade, selectedWeek, passcode]);

  useEffect(() => {
    async function loadDraftCount() {
      // draft_questions/draft_summaries deny all direct client reads (RLS) —
      // routed through the same passcode-gated admin API DraftQuestionsSection uses.
      const result = await callAdminApi<{ questions: unknown[]; summaries: unknown[] }>(
        '/api/admin-draft-questions',
        { passcode, action: 'list_drafts', grade, statuses: ['pending_review', 'approved'] }
      );
      setPendingDraftCount(result.success ? (result.questions?.length || 0) + (result.summaries?.length || 0) : 0);
    }
    loadDraftCount();
  }, [grade, passcode]);

  const handleParse = () => {
    setParseError('');
    setParsed(null);
    try {
      const obj = JSON.parse(jsonInput);
      setParsed({ data: obj, warnings: validateWeekDays(obj, grade) });
    } catch (e: any) {
      setParseError(`JSON parse error: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!parsed || parsed.warnings.length > 0) return;
    setSaving(true);
    const result = await callAdminApi('/api/admin-weekly', {
      passcode, action: 'set_content_week',
      grade, weekStartingDate: selectedWeek, days: parsed.data,
    });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      setWeekHasRow(true);
      const weekLabel = selectedWeek === currentSunday ? 'this week' : `week of ${selectedWeek}`;
      alert(`✅ Content saved for Grade ${grade} (${weekLabel})!`);
    }
    setSaving(false);
  };

  const updateQuestion = (day: string, subject: string, idx: number, field: string, value: string) => {
    if (!parsed) return;
    const updated = { ...parsed.data };
    updated[day][subject].quiz[idx][field] = value;
    setParsed({ ...parsed, data: updated });
  };

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Weekly Content Builder</h2>
      <p className="text-gray-500 text-sm mb-6">Paste AI-generated JSON, review, edit if needed, then save for a grade.</p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${mode === 'single' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400 hover:text-white'}`}
        >
          Single Week
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${mode === 'bulk' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400 hover:text-white'}`}
        >
          Bulk Import
        </button>
      </div>

      {mode === 'bulk' ? (
        <BulkImportPanel passcode={passcode} />
      ) : (
      <>
      {/* Grade selector — content is grade-keyed, not per-student (Phase 4 Wave 3) */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {GRADE_LEVELS.map(g => (
          <button
            key={g}
            onClick={() => setGrade(g)}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              grade === g ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-gray-400 hover:text-white'
            }`}
          >
            Grade {g}
          </button>
        ))}
      </div>

      {pendingDraftCount > 0 && (
        <button
          onClick={onNavigateToDrafts}
          className="w-full flex items-center justify-between bg-amber-900/20 border border-amber-800 rounded-xl px-4 py-3 mb-4 text-left hover:bg-amber-900/30 transition-colors"
        >
          <span className="text-amber-400 text-sm font-bold">
            📝 {pendingDraftCount} draft{pendingDraftCount !== 1 ? 's' : ''} pending for Grade {grade}
          </span>
          <span className="text-amber-500 text-xs">Review in Draft Questions →</span>
        </button>
      )}

      {/* Week selector */}
      <div className="flex items-center gap-2 mb-6 bg-neutral-900 border border-neutral-700 rounded-xl p-3">
        <button
          onClick={() => shiftWeek(-7)}
          className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors"
        >
          ← Prev
        </button>
        <input
          type="date"
          value={selectedWeek}
          onChange={e => e.target.value && setSelectedWeek(format(startOfWeek(new Date(e.target.value + 'T00:00:00')), 'yyyy-MM-dd'))}
          className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
        />
        <button
          onClick={() => shiftWeek(7)}
          className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors"
        >
          Next →
        </button>
        {selectedWeek !== currentSunday && (
          <button
            onClick={() => setSelectedWeek(currentSunday)}
            className="text-xs text-blue-400 hover:text-blue-300 ml-1"
          >
            Jump to this week
          </button>
        )}
        <span className="text-xs text-gray-600 ml-auto">
          {selectedWeek === currentSunday ? '📍 This week' : selectedWeek > currentSunday ? '🗓️ Future week' : '📜 Past week'}
          {' · '}
          {loadingPackage ? '⏳ loading...' : weekHasRow ? '✅ existing content' : '🆕 not created yet'}
        </span>
      </div>

      <WeeklyPackageHistory grade={grade} />

      {/* JSON paste area */}
      {!parsed && (
        <div className="space-y-3">
          <textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder={`Paste Grade ${grade}'s weekly content JSON here...`}
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

      {/* Preview */}
      {parsed && (
        <div>
          {/* Warnings */}
          {parsed.warnings.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 mb-4">
              <p className="text-yellow-400 font-bold text-sm mb-2">⚠️ {parsed.warnings.length} warning{parsed.warnings.length > 1 ? 's' : ''} — fix these before saving</p>
              {parsed.warnings.map((w: string, i: number) => (
                <p key={i} className="text-yellow-300 text-xs">{w}</p>
              ))}
            </div>
          )}

          {parsed.warnings.length === 0 && (
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-3 mb-4">
              <p className="text-green-400 text-sm font-bold">✅ JSON is valid — {Object.keys(parsed.data).length} days detected</p>
            </div>
          )}

          {/* Days */}
          <div className="space-y-3 mb-6">
            {Object.keys(parsed.data).map(day => {
              const subjects = parsed.data[day];
              const isExpanded = expandedDays.has(day);
              return (
                <div key={day} className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleDay(day)}
                    className="w-full flex justify-between items-center px-5 py-3 text-left hover:bg-neutral-800 transition-colors"
                  >
                    <span className="font-bold text-white">{day}</span>
                    <span className="text-gray-500 text-xs">{Object.keys(subjects).length} subjects {isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-4 border-t border-neutral-800 pt-4">
                      {Object.keys(subjects).map(subject => {
                        const s = subjects[subject];
                        return (
                          <div key={subject} className="bg-neutral-950 rounded-xl p-4">
                            <p className="font-bold text-amber-400 mb-3">{subject}</p>
                            <div className="space-y-2">
                              {(s.quiz || []).map((q: any, idx: number) => {
                                const isEditing = editingQuestion?.day === day && editingQuestion?.subject === subject && editingQuestion?.idx === idx;
                                return (
                                  <div key={idx} className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="text-xs text-gray-500 font-mono">Q{idx + 1}</p>
                                      <button
                                        onClick={() => setEditingQuestion(isEditing ? null : { day, subject, idx })}
                                        className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
                                      >
                                        {isEditing ? 'Done' : 'Edit'}
                                      </button>
                                    </div>
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <input
                                          value={q.question}
                                          onChange={e => updateQuestion(day, subject, idx, 'question', e.target.value)}
                                          className="w-full bg-black border border-neutral-700 rounded p-2 text-sm text-white"
                                        />
                                        {q.options.map((opt: string, oi: number) => (
                                          <div key={oi} className="flex items-center gap-2">
                                            <span className={`text-xs font-mono w-4 ${q.correct_answer === opt ? 'text-green-400' : 'text-gray-600'}`}>
                                              {q.correct_answer === opt ? '✓' : '○'}
                                            </span>
                                            <input
                                              value={opt}
                                              onChange={e => {
                                                const newOpts = [...q.options];
                                                const wasCorrect = q.correct_answer === opt;
                                                newOpts[oi] = e.target.value;
                                                updateQuestion(day, subject, idx, 'options', newOpts as any);
                                                if (wasCorrect) updateQuestion(day, subject, idx, 'correct_answer', e.target.value);
                                              }}
                                              className="flex-1 bg-black border border-neutral-700 rounded p-1.5 text-xs text-white"
                                            />
                                            <button
                                              onClick={() => updateQuestion(day, subject, idx, 'correct_answer', opt)}
                                              className={`text-xs px-2 py-1 rounded ${q.correct_answer === opt ? 'bg-green-800 text-green-300' : 'bg-neutral-800 text-gray-500 hover:text-white'}`}
                                            >
                                              Correct
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-sm text-gray-200 mb-2">{q.question}</p>
                                        <div className="flex flex-wrap gap-2">
                                          {q.options.map((opt: string, oi: number) => (
                                            <span
                                              key={oi}
                                              className={`text-xs px-2 py-0.5 rounded-full ${opt === q.correct_answer ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-neutral-800 text-gray-400'}`}
                                            >
                                              {opt}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setParsed(null); setJsonInput(''); }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-5 py-2 rounded-lg transition-colors"
            >
              ← Start Over
            </button>
            <button
              onClick={handleSave}
              disabled={saving || parsed.warnings.length > 0}
              title={parsed.warnings.length > 0 ? 'Fix all warnings above before saving' : undefined}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : parsed.warnings.length > 0 ? `⚠️ Fix ${parsed.warnings.length} warning${parsed.warnings.length > 1 ? 's' : ''} to save` : `💾 Save for Grade ${grade}`}
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
