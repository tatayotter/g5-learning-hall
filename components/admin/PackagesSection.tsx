'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WeeklyData } from '@/hooks/useWeeklyData';
import { format, startOfWeek } from 'date-fns';
import { getScheduledDay } from '@/lib/subjectSchedule';
import { callAdminApi } from '@/lib/adminApi';
import { USERS } from '@/lib/userSession';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Display name for a content-owner id — family profiles (damien/tala) already
// have a friendly name in USERS; any other content owner falls back to its
// raw id since it may not be loaded into USERS yet at admin-panel mount time.
function ownerLabel(userId: string): string {
  return USERS[userId]?.name || userId;
}

function WeeklyPackageHistory({ userId }: { userId: string }) {
  const [weeks, setWeeks] = useState<{ week_starting_date: string; has_content: boolean }[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('weekly_packages')
        .select('week_starting_date, package_data')
        .eq('user_id', userId)
        .order('week_starting_date', { ascending: false })
        .limit(10);

      if (data) {
        setWeeks(data.map((row: any) => ({
          week_starting_date: row.week_starting_date,
          has_content: !!row.package_data && Object.keys(
            typeof row.package_data === 'string' ? JSON.parse(row.package_data) : row.package_data
          ).length > 0,
        })));
      }
    }
    fetch();
  }, [userId]);

  if (weeks.length === 0) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Recent Weeks — {ownerLabel(userId)}</p>
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

export default function WeeklyPackageBuilder({ currentData, currentSunday, onUpdateStats, passcode, onNavigateToDrafts }: {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  passcode: string;
  onNavigateToDrafts: () => void;
}) {
  const [userId, setUserId] = useState<string>(currentData.user_id);
  // grade_content_owners in Supabase maps each grade to the user whose
  // weekly_packages row is that grade's Main Quest content source — fetched
  // live so newly designated owners (Grade 3/4/6) show up without a redeploy.
  const [owners, setOwners] = useState<{ grade: number; user_id: string }[]>([]);
  const [pendingDraftCount, setPendingDraftCount] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(currentSunday);
  const [weekHasRow, setWeekHasRow] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [parseError, setParseError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<{ day: string; subject: string; idx: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(WEEK_DAYS));

  const shiftWeek = (deltaDays: number) => {
    const d = new Date(selectedWeek + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    setSelectedWeek(format(startOfWeek(d), 'yyyy-MM-dd'));
  };

  useEffect(() => {
    async function loadOwners() {
      const { data } = await supabase.from('grade_content_owners').select('grade, user_id').order('grade');
      setOwners(data || []);
    }
    loadOwners();
  }, []);

  const gradeForOwner = (id: string) => owners.find(o => o.user_id === id)?.grade;

  useEffect(() => {
    async function loadPackage() {
      const { data } = await supabase
        .from('weekly_packages')
        .select('package_data')
        .eq('user_id', userId)
        .eq('week_starting_date', selectedWeek)
        .maybeSingle();
      setWeekHasRow(!!data);
      if (data?.package_data) {
        try {
          const content = typeof data.package_data === 'string'
            ? data.package_data
            : JSON.stringify(data.package_data, null, 2);
          setJsonInput(content);
        } catch {
          setJsonInput('');
        }
      } else {
        setJsonInput('');
      }
      setParsed(null);
      setParseError('');
    }
    loadPackage();
  }, [userId, selectedWeek]);

  useEffect(() => {
    async function loadDraftCount() {
      const grade = gradeForOwner(userId);
      if (grade === undefined) { setPendingDraftCount(0); return; }
      const [{ count: qCount }, { count: sCount }] = await Promise.all([
        supabase.from('draft_questions').select('id', { count: 'exact', head: true }).eq('grade', grade).in('status', ['pending_review', 'approved']),
        supabase.from('draft_summaries').select('id', { count: 'exact', head: true }).eq('grade', grade).in('status', ['pending_review', 'approved']),
      ]);
      setPendingDraftCount((qCount || 0) + (sCount || 0));
    }
    loadDraftCount();
  }, [userId, owners]);

  const handleParse = () => {
    setParseError('');
    setParsed(null);
    try {
      const obj = JSON.parse(jsonInput);
      // Validate structure. MonsterGuild's extractQuestions() accepts either
      // a `quiz` or `questions` array per subject, so both shapes must be
      // checked here — validating only `quiz` let unvalidated `questions`
      // arrays flow straight into live Monster Arena battles.
      const days = Object.keys(obj);
      const grade = gradeForOwner(userId) ?? 5;
      let warnings: string[] = [];
      days.forEach(day => {
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
      setParsed({ data: obj, warnings });
    } catch (e: any) {
      setParseError(`JSON parse error: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!parsed || parsed.warnings.length > 0) return;
    setSaving(true);
    // Both branches (existing row / brand-new future week) are handled by a single
    // upsert RPC now — direct client writes to another user's weekly_packages row
    // are blocked by RLS, so this always goes through the passcode-gated admin path.
    const result = await callAdminApi('/api/admin-weekly', {
      passcode, action: 'set_package_data',
      userId, weekStartingDate: selectedWeek, packageData: parsed.data,
    });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      setWeekHasRow(true);
      const weekLabel = selectedWeek === currentSunday ? 'this week' : `week of ${selectedWeek}`;
      alert(`✅ Package saved for ${ownerLabel(userId)} (${weekLabel})!`);
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
      <h2 className="text-xl font-bold text-white mb-1">Weekly Package Builder</h2>
      <p className="text-gray-500 text-sm mb-6">Paste AI-generated JSON, review, edit if needed, then save for each student.</p>

      {/* Content-owner selector — one button per grade with an authored content source */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {owners.map(({ grade, user_id }) => (
          <button
            key={user_id}
            onClick={() => setUserId(user_id)}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              userId === user_id ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-gray-400 hover:text-white'
            }`}
          >
            {ownerLabel(user_id)} (Grade {grade})
          </button>
        ))}
      </div>

      {pendingDraftCount > 0 && (
        <button
          onClick={onNavigateToDrafts}
          className="w-full flex items-center justify-between bg-amber-900/20 border border-amber-800 rounded-xl px-4 py-3 mb-4 text-left hover:bg-amber-900/30 transition-colors"
        >
          <span className="text-amber-400 text-sm font-bold">
            📝 {pendingDraftCount} draft{pendingDraftCount !== 1 ? 's' : ''} pending for Grade {gradeForOwner(userId) ?? '?'}
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
          {weekHasRow ? '✅ existing package' : '🆕 not created yet'}
        </span>
      </div>

      <WeeklyPackageHistory userId={userId} />

      {/* JSON paste area */}
      {!parsed && (
        <div className="space-y-3">
          <textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder={`Paste ${ownerLabel(userId)}'s weekly package JSON here...`}
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
              {saving ? 'Saving...' : parsed.warnings.length > 0 ? `⚠️ Fix ${parsed.warnings.length} warning${parsed.warnings.length > 1 ? 's' : ''} to save` : `💾 Save for ${ownerLabel(userId)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
