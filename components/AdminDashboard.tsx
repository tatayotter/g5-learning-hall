'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CharacterStats, WeeklyData } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { playBlessing } from '@/lib/sounds';
import DeedHistory from '@/components/DeedHistory';
import GameButton from '@/components/GameButton';
import { format, startOfWeek } from 'date-fns';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface AdminDashboardProps {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  onBack: () => void;
}

type AdminSection = 'packages' | 'questions' | 'tools' | 'prompts' | 'classmates';
type GuildTable = 'sq_lorekeeper' | 'sq_spellcaster' | 'sq_number_realm' | 'sq_logic_labyrinth' | 'sq_lexicon_arena' | 'sq_wild_encounter';

const GUILD_LABELS: Record<GuildTable, string> = {
  sq_lorekeeper:      '📜 Lorekeeper',
  sq_spellcaster:     '🧙 SpellCaster',
  sq_number_realm:    '🔢 Number Realm',
  sq_logic_labyrinth: '🧩 Logic Labyrinth',
  sq_lexicon_arena:   '🧿 Lexicon Arena',
  sq_wild_encounter:  '🐲 Wild Encounter Questions',
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── POOL COUNT PANEL ────────────────────────────────────────────────────────

function PoolCountPanel() {
  const [counts, setCounts] = useState<Record<string, { g2: number; g5: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      const guilds = Object.keys(GUILD_LABELS) as GuildTable[];
      const results: Record<string, { g2: number; g5: number }> = {};

      await Promise.all(guilds.map(async (guild) => {
        const [r2, r5] = await Promise.all([
          supabase.from(guild).select('id', { count: 'exact', head: true }).eq('is_active', true).eq('grade_level', 2).eq('term_id', 1),
          supabase.from(guild).select('id', { count: 'exact', head: true }).eq('is_active', true).eq('grade_level', 5).eq('term_id', 1),
        ]);
        results[guild] = { g2: r2.count || 0, g5: r5.count || 0 };
      }));

      setCounts(results);
      setLoading(false);
    }
    fetchCounts();
  }, []);

  const badge = (n: number) => {
    if (n >= 20) return 'bg-green-900/40 text-green-400 border border-green-800';
    if (n >= 10) return 'bg-yellow-900/40 text-yellow-400 border border-yellow-800';
    return 'bg-red-900/40 text-red-400 border border-red-800';
  };

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Question Pool Status — Term 1</p>
      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading counts...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-neutral-800">
              <th className="text-left pb-2">Guild</th>
              <th className="text-center pb-2">Grade 2</th>
              <th className="text-center pb-2">Grade 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {(Object.keys(GUILD_LABELS) as GuildTable[]).map(guild => (
              <tr key={guild}>
                <td className="py-2 text-gray-300 font-medium">{GUILD_LABELS[guild]}</td>
                <td className="py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge(counts[guild]?.g2 || 0)}`}>
                    {counts[guild]?.g2 ?? '—'}
                  </span>
                </td>
                <td className="py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge(counts[guild]?.g5 || 0)}`}>
                    {counts[guild]?.g5 ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[10px] text-gray-600 mt-3">🟢 20+ Good &nbsp; 🟡 10–19 Low &nbsp; 🔴 &lt;10 Critical</p>
    </div>
  );
}

// ─── WEEKLY PACKAGE BUILDER ───────────────────────────────────────────────────

function WeeklyPackageHistory({ userId }: { userId: 'damien' | 'tala' }) {
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
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Recent Weeks — {userId === 'damien' ? 'Damien' : 'Tala'}</p>
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

function WeeklyPackageBuilder({ currentData, currentSunday, onUpdateStats }: {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
}) {
  const [userId, setUserId] = useState<'damien' | 'tala'>(currentData.user_id as 'damien' | 'tala');
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

  const handleParse = () => {
    setParseError('');
    setParsed(null);
    try {
      const obj = JSON.parse(jsonInput);
      // Validate structure
      const days = Object.keys(obj);
      let warnings: string[] = [];
      days.forEach(day => {
        const subjects = obj[day];
        Object.keys(subjects).forEach(subject => {
          const s = subjects[subject];
          if (!s.quiz || !Array.isArray(s.quiz)) {
            warnings.push(`${day} / ${subject}: missing quiz array`);
          } else {
            s.quiz.forEach((q: any, i: number) => {
              if (!q.correct_answer) warnings.push(`${day} / ${subject} Q${i + 1}: missing correct_answer`);
              if (!q.options || q.options.length < 2) warnings.push(`${day} / ${subject} Q${i + 1}: needs at least 2 options`);
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
    if (!parsed) return;
    setSaving(true);
    try {
      if (weekHasRow) {
        // Row already exists (this week, or a future week touched before) —
        // only ever overwrite its package_data, never its stats.
        const { error } = await supabase
          .from('weekly_packages')
          .update({ package_data: parsed.data })
          .eq('week_starting_date', selectedWeek)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Brand-new future week: leave stat columns explicitly null so that
        // when the week actually begins, useWeeklyData carries forward real
        // progress from whatever the latest week turns out to be by then,
        // instead of freezing stats at today's snapshot.
        const { error } = await supabase
          .from('weekly_packages')
          .insert({
            user_id: userId,
            week_starting_date: selectedWeek,
            package_data: parsed.data,
            character_stats: null,
            journal_logs: null,
            achievements: null,
            mastery_count: null,
            purchased_items: null,
            honor_grants: null,
            quiz_attempts: null,
            mastered_quizzes: null,
            guild_sessions_count: null,
            monster_battles_won: null,
            sibling_battles_won: null,
            perfect_quizzes: null,
          });
        if (error) throw error;
        setWeekHasRow(true);
      }
      const weekLabel = selectedWeek === currentSunday ? 'this week' : `week of ${selectedWeek}`;
      alert(`✅ Package saved for ${userId === 'damien' ? 'Damien' : 'Tala'} (${weekLabel})!`);
    } catch (e: any) {
      alert(`❌ Save failed: ${e.message}`);
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

      {/* User selector */}
      <div className="flex gap-3 mb-4">
        {(['damien', 'tala'] as const).map(id => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              userId === id
                ? id === 'damien' ? 'bg-amber-600 text-white' : 'bg-pink-600 text-white'
                : 'bg-neutral-800 text-gray-400 hover:text-white'
            }`}
          >
            {id === 'damien' ? '⚔️ Damien' : '✨ Tala'}
          </button>
        ))}
      </div>

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
            placeholder={`Paste ${userId === 'damien' ? "Damien's" : "Tala's"} weekly package JSON here...`}
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
              <p className="text-yellow-400 font-bold text-sm mb-2">⚠️ {parsed.warnings.length} warning{parsed.warnings.length > 1 ? 's' : ''}</p>
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
              disabled={saving}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : `💾 Save for ${userId === 'damien' ? 'Damien' : 'Tala'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUESTION BANK IMPORTER ───────────────────────────────────────────────────

function QuestionBankImporter() {
  const [guild, setGuild] = useState<GuildTable>('sq_lorekeeper');
  const [gradeLevel, setGradeLevel] = useState<2 | 5>(5);
  const [termId, setTermId] = useState(1);
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [refreshPool, setRefreshPool] = useState(0);

  const handleParse = () => {
    setParseError('');
    setPreview([]);
    setImportResult(null);
    try {
      const arr = JSON.parse(jsonInput);
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array of questions');
      setPreview(arr);
    } catch (e: any) {
      setParseError(`Parse error: ${e.message}`);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setImportResult(null);

    // Fetch existing to detect duplicates
    const { data: existing } = await supabase
      .from(guild)
      .select('id')
      .eq('term_id', termId)
      .eq('grade_level', gradeLevel)
      .eq('is_active', true);

    const existingIds = new Set((existing || []).map((r: any) => r.id));

    const toInsert = preview
      .filter(q => !q.id || !existingIds.has(q.id))
      .map(q => ({
        ...q,
        term_id: termId,
        grade_level: gradeLevel,
        is_active: true,
      }));

    const skipped = preview.length - toInsert.length;

    if (toInsert.length > 0) {
      const { error } = await supabase.from(guild).insert(toInsert);
      if (error) {
        alert(`❌ Import failed: ${error.message}`);
        setImporting(false);
        return;
      }
    }

    setImportResult({ inserted: toInsert.length, skipped });
    setPreview([]);
    setJsonInput('');
    setRefreshPool(r => r + 1);
    setImporting(false);
  };

  // Guild-specific field renderer for preview
  const renderQuestionPreview = (q: any, i: number) => {
    if (guild === 'sq_spellcaster') {
      return (
        <div key={i} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-2 border border-neutral-800">
          <span className="text-white font-mono">{q.word_string}</span>
          <span className="text-xs text-gray-500">Tier {q.difficulty_tier}</span>
        </div>
      );
    }
    if (guild === 'sq_number_realm') {
      return (
        <div key={i} className="bg-neutral-900 rounded-lg px-4 py-2 border border-neutral-800">
          <p className="text-white text-sm">{q.problem_prompt}</p>
          <p className="text-xs text-green-400 mt-1">Answer: {q.correct_standard_ans || `${q.correct_numerator}/${q.correct_denominator}`}</p>
        </div>
      );
    }
    return (
      <div key={i} className="bg-neutral-900 rounded-lg px-4 py-2 border border-neutral-800">
        {q.passage && <p className="text-xs text-gray-500 mb-1 italic truncate">{q.passage.slice(0, 80)}...</p>}
        <p className="text-white text-sm">{q.question}</p>
        <p className="text-xs text-green-400 mt-1">✓ {q.correct_choice || q.correct_answer}</p>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Question Bank Importer</h2>
      <p className="text-gray-500 text-sm mb-6">Bulk-import questions into any guild's question pool.</p>

      <PoolCountPanel key={refreshPool} />

      {/* Config */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Guild</label>
          <select
            value={guild}
            onChange={e => setGuild(e.target.value as GuildTable)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-500"
          >
            {(Object.keys(GUILD_LABELS) as GuildTable[]).map(g => (
              <option key={g} value={g}>{GUILD_LABELS[g]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Grade Level</label>
          <div className="flex gap-2">
            {([2, 5] as const).map(g => (
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
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Term ID</label>
          <input
            type="number"
            value={termId}
            onChange={e => setTermId(Number(e.target.value))}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-neutral-500"
          />
        </div>
      </div>

      {/* JSON paste */}
      {preview.length === 0 && !importResult && (
        <div className="space-y-3">
          <textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder={`Paste JSON array of ${GUILD_LABELS[guild]} questions here...`}
            className="w-full h-48 bg-neutral-950 border border-neutral-700 rounded-xl p-4 font-mono text-xs text-gray-300 focus:outline-none focus:border-neutral-500 resize-none"
          />
          {parseError && <p className="text-red-400 text-xs">{parseError}</p>}
          <button
            onClick={handleParse}
            disabled={!jsonInput.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
          >
            Preview Questions
          </button>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-white font-bold">{preview.length} questions ready to import</p>
            <p className="text-xs text-gray-500">{GUILD_LABELS[guild]} · Grade {gradeLevel} · Term {termId}</p>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto mb-4 pr-1">
            {preview.map((q, i) => renderQuestionPreview(q, i))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setPreview([]); setJsonInput(''); }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-5 py-2 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              {importing ? 'Importing...' : `⬆️ Import ${preview.length} Questions`}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {importResult && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-5">
          <p className="text-green-400 font-bold text-lg mb-1">✅ Import Complete</p>
          <p className="text-gray-300 text-sm">Inserted: <span className="text-white font-bold">{importResult.inserted}</span></p>
          <p className="text-gray-300 text-sm">Skipped (duplicates): <span className="text-white font-bold">{importResult.skipped}</span></p>
          <button
            onClick={() => setImportResult(null)}
            className="mt-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-5 py-2 rounded-lg transition-colors text-sm"
          >
            Import More
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TOOLS SECTION ────────────────────────────────────────────────────────────

function ToolsSection({ currentData, currentSunday, onUpdateStats, passcode }: {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  passcode: string;
}) {
  const [userId, setUserId] = useState<'damien' | 'tala'>(currentData.user_id as 'damien' | 'tala');
  const [toolData, setToolData] = useState<WeeklyData>(currentData);
  const [stats, setStats] = useState<CharacterStats>(currentData.character_stats);
  const [deedName, setDeedName] = useState('');
  const [deedGold, setDeedGold] = useState('');
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set());
  const [loginPassword, setLoginPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProtectedIds = async () => {
    const { data } = await supabase.from('family_credentials').select('id');
    setProtectedIds(new Set((data || []).map((r: any) => r.id)));
  };

  const loadUserData = async (id: 'damien' | 'tala') => {
    setLoadingData(true);
    const { data } = await supabase
      .from('weekly_packages')
      .select('*')
      .eq('user_id', id)
      .eq('week_starting_date', currentSunday)
      .single();
    if (data) {
      setToolData(data as WeeklyData);
      setStats(data.character_stats);
    }
    const { data: claimsData } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('app_user_id', id)
      .order('created_at', { ascending: false });
    if (claimsData) setClaims(claimsData);
    setLoadingData(false);
  };

  useEffect(() => { loadUserData(userId); loadProtectedIds(); }, [userId]);

  const handleSetLoginPassword = async () => {
    if (!loginPassword.trim()) return;
    setSavingPassword(true);
    try {
      const res = await fetch('/api/family-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, id: userId, password: loginPassword }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`✅ Login password set for ${userId === 'damien' ? 'Damien' : 'Tala'}.`);
        setLoginPassword('');
        loadProtectedIds();
      } else {
        alert(result.error || 'Failed to set password.');
      }
    } catch {
      alert('Could not reach the server.');
    }
    setSavingPassword(false);
  };

  const handleAwardDeed = () => {
    const amount = Number(deedGold);
    if (!deedName.trim() || !amount || amount <= 0) {
      alert('Enter a deed name and valid gold amount.');
      return;
    }
    const newStats = { ...toolData.character_stats, gold: toolData.character_stats.gold + amount };
    const newHonorGrants = (toolData.honor_grants || 0) + 1;
    onUpdateStats(newStats, toolData.journal_logs, toolData.purchased_items, toolData.mastery_count, newHonorGrants);
    logAction(userId, currentSunday, 'deed', deedName, 0, amount);
    playBlessing();
    alert(`✅ Awarded 🪙 ${amount} Gold for: ${deedName}`);
    setDeedName('');
    setDeedGold('');
    loadUserData(userId);
  };

  const handleSaveStats = () => {
    let xp = stats.xp;
    let level = stats.level;
    while (xp >= (500 + level * 100)) { xp -= (500 + level * 100); level++; }
    const normalized = { ...stats, xp, level };
    setStats(normalized);
    onUpdateStats(normalized, toolData.journal_logs);
    alert('✅ Stats overwritten!');
  };

  const toggleClaim = async (id: number, status: string) => {
    const next = status === 'pending' ? 'supplied' : 'pending';
    await supabase.from('reward_claims').update({ status: next }).eq('id', id);
    setClaims(claims.map(c => c.id === id ? { ...c, status: next } : c));
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Tools</h2>
      <p className="text-gray-500 text-sm mb-6">Stat overrides, deed grants, and reward management.</p>

      {/* User selector */}
      <div className="flex gap-3 mb-8">
        {(['damien', 'tala'] as const).map(id => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              userId === id
                ? id === 'damien' ? 'bg-amber-600 text-white' : 'bg-pink-600 text-white'
                : 'bg-neutral-800 text-gray-400 hover:text-white'
            }`}
          >
            {id === 'damien' ? '⚔️ Damien' : '✨ Tala'}
          </button>
        ))}
      </div>

      {loadingData ? (
        <p className="text-gray-500 animate-pulse">Loading...</p>
      ) : (
        <div className="space-y-6">

          {/* Login password */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest">🔒 Login Password</p>
              {protectedIds.has(userId) ? (
                <span className="text-xs font-bold text-green-400 bg-green-900/40 border border-green-800 px-2 py-0.5 rounded-full">Protected</span>
              ) : (
                <span className="text-xs font-bold text-gray-500 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">Not Set — instant login</span>
              )}
            </div>
            <p className="text-gray-500 text-xs mb-3">
              Once set, {userId === 'damien' ? 'Damien' : 'Tala'} will need this password to open their dashboard from the splash screen — classmates won't be able to click into it.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Set or change password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neutral-500"
              />
              <button
                onClick={handleSetLoginPassword}
                disabled={savingPassword || !loginPassword.trim()}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-lg transition-colors"
              >
                {savingPassword ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Current stats display */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Current Stats</p>
            <div className="flex gap-6">
              <div><p className="text-xs text-gray-500">Level</p><p className="text-2xl font-bold text-white font-mono">{toolData.character_stats.level}</p></div>
              <div><p className="text-xs text-gray-500">XP</p><p className="text-2xl font-bold text-blue-400 font-mono">{toolData.character_stats.xp}</p></div>
              <div><p className="text-xs text-gray-500">Gold</p><p className="text-2xl font-bold text-yellow-400 font-mono">🪙 {toolData.character_stats.gold}</p></div>
            </div>
          </div>

          {/* Stat override */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Override Stats</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Level</label>
                <input type="number" value={stats.level} onChange={e => setStats({ ...stats, level: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">XP</label>
                <input type="number" value={stats.xp} onChange={e => setStats({ ...stats, xp: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Gold</label>
                <input type="number" value={stats.gold} onChange={e => setStats({ ...stats, gold: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-yellow-400 font-mono focus:outline-none" />
              </div>
            </div>
            <button onClick={handleSaveStats} className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-lg transition-colors text-sm">
              Save Stats
            </button>
          </div>

          {/* Award deed */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Award Good Deed</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Deed Name</label>
                <input type="text" placeholder="e.g. Cleaned the garage" value={deedName} onChange={e => setDeedName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Gold</label>
                <input type="number" placeholder="50" value={deedGold} onChange={e => setDeedGold(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-yellow-400 font-mono focus:outline-none" />
              </div>
            </div>
            <button onClick={handleAwardDeed} className="bg-green-700 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-lg transition-colors text-sm">
              🎉 Award Gold
            </button>
          </div>

          {/* Deed history */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Deed History</p>
            <DeedHistory userId={userId} />
          </div>

          {/* Reward queue */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Reward Queue</p>
            {claims.length === 0 ? (
              <p className="text-gray-600 text-sm">No pending rewards.</p>
            ) : (
              <div className="space-y-2">
                {claims.map(claim => (
                  <div key={claim.id} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-white font-medium text-sm">{claim.item_name}</p>
                      <p className="text-xs text-gray-500">{new Date(claim.created_at).toLocaleDateString()} · 🪙 {claim.cost}</p>
                    </div>
                    <button
                      onClick={() => toggleClaim(claim.id, claim.status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        claim.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800 hover:bg-yellow-800' : 'bg-green-900/50 text-green-400 border border-green-800'
                      }`}
                    >
                      {claim.status === 'pending' ? 'Mark Supplied' : '✅ Supplied'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiz attempts */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Quiz Attempts This Week</p>
            {Object.keys(toolData.quiz_attempts || {}).length === 0 ? (
              <p className="text-gray-600 text-sm">No attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(toolData.quiz_attempts || {}).map(([key, count]) => {
                  const mastered = (toolData.mastered_quizzes || []).includes(key);
                  return (
                    <div key={key} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2">
                      <span className="text-sm text-gray-300">{key.replace('_', ' — ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono">{count} attempt{count !== 1 ? 's' : ''}</span>
                        <span className={`text-xs font-bold ${mastered ? 'text-green-400' : 'text-gray-600'}`}>
                          {mastered ? '✅' : '…'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}


// ─── PROMPTS SECTION ─────────────────────────────────────────────────────────

function PromptCard({ title, subtitle, url }: { title: string; subtitle: string; url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [url]);

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{subtitle}</p>
          <p className="text-white font-bold">{title}</p>
        </div>
        <div className="flex gap-2">
          {content && (
            <button
              onClick={() => { navigator.clipboard.writeText(content); alert('Copied!'); }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              📋 Copy
            </button>
          )}
        </div>
      </div>
      {loading && <p className="text-gray-500 text-sm animate-pulse">Loading...</p>}
      {error && (
        <p className="text-red-400 text-sm">
          File not found. Place it at: <code className="bg-neutral-800 px-1 rounded">{url}</code>
        </p>
      )}
      {content && (
        <pre className="bg-neutral-950 rounded-xl p-4 text-xs text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap font-mono">
          {content}
        </pre>
      )}
    </div>
  );
}

function PromptsSection() {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Prompts</h2>
      <p className="text-gray-500 text-sm mb-6">
        Weekly package generation prompts based on the official DepEd Budget of Work.
        Edit the markdown files in public/prompts/ to update without touching code.
      </p>

      <PromptCard
        title="Weekly Package Prompt"
        subtitle="✨ Tala — Grade 2"
        url="/prompts/tala-weekly-prompt.md"
      />

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 opacity-50">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">⚔️ Damien — Grade 5</p>
        <p className="text-white font-bold mb-2">Weekly Package Prompt</p>
        <p className="text-gray-500 text-sm">
          Upload Damien's Grade 5 BOW files to generate his prompt.
          Once created, place it at public/prompts/damien-weekly-prompt.md
        </p>
      </div>
    </div>
  );
}

// ─── CLASSMATES SECTION ───────────────────────────────────────────────────────

interface Classmate {
  id: string;
  username: string;
  full_name: string;
  grade: string;
  gender: 'boy' | 'girl';
  is_active: boolean;
}

function ClassmatesSection({ passcode }: { passcode: string }) {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [grade, setGrade] = useState('Grade 5');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const loadClassmates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('classmates')
      .select('id, username, full_name, grade, gender, is_active')
      .order('full_name');
    setClassmates(data || []);
    setLoading(false);
  };

  useEffect(() => { loadClassmates(); }, []);

  const suggestUsername = (name: string) =>
    name.replace(/[^a-zA-Z ]/g, '').split(' ').filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1)).join('');

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (!usernameTouched) setUsername(suggestUsername(value));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !newPassword.trim()) {
      setError('Full name, username, and password are all required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/classmate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, username, fullName, grade, gender, password: newPassword }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || 'Failed to add classmate.');
      } else {
        setFullName('');
        setUsername('');
        setNewPassword('');
        setGender('boy');
        setUsernameTouched(false);
        loadClassmates();
      }
    } catch {
      setError('Could not reach the server.');
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (c: Classmate) => {
    const res = await fetch('/api/classmate-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, isActive: !c.is_active }),
    });
    const result = await res.json();
    if (result.success) loadClassmates();
    else alert(result.error || 'Failed to update.');
  };

  const handleToggleGender = async (c: Classmate) => {
    const res = await fetch('/api/classmate-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender === 'girl' ? 'boy' : 'girl' }),
    });
    const result = await res.json();
    if (result.success) loadClassmates();
    else alert(result.error || 'Failed to update.');
  };

  const handleResetPassword = async (c: Classmate) => {
    if (!resetPassword.trim()) return;
    const res = await fetch('/api/classmate-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, password: resetPassword }),
    });
    const result = await res.json();
    if (result.success) {
      alert(`✅ Password updated for ${c.full_name}.`);
      setResetTargetId(null);
      setResetPassword('');
    } else {
      alert(result.error || 'Failed to reset password.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Damien's Classmates</h2>
      <p className="text-gray-500 text-sm mb-6">
        Add classmate accounts. They share Damien's Main Quest content and Monster Arena question pool but keep
        their own independent progress, and log in from the "Damien's Classmates" group on the splash screen.
      </p>

      {/* Add classmate */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Add Classmate</p>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Full Name</label>
            <input type="text" placeholder="e.g. Juan Dela Cruz" value={fullName} onChange={e => handleFullNameChange(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Username (login)</label>
            <input type="text" placeholder="FirstNameLastname" value={username} onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Password</label>
            <input type="text" placeholder="Set their password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <input type="text" value={grade} onChange={e => setGrade(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Gender (sprite)</label>
            <select value={gender} onChange={e => setGender(e.target.value as 'boy' | 'girl')}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500">
              <option value="boy">Boy</option>
              <option value="girl">Girl</option>
            </select>
          </div>
          <div className="col-span-2">
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button type="submit" disabled={submitting} className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors">
              {submitting ? 'Adding...' : '➕ Add Classmate'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">All Classmates</p>
        {loading ? (
          <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
        ) : classmates.length === 0 ? (
          <p className="text-gray-600 text-sm">No classmates yet.</p>
        ) : (
          <div className="space-y-2">
            {classmates.map(c => (
              <div key={c.id} className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{c.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{c.username} · {c.grade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleGender(c)}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      title="Toggle sprite gender"
                    >
                      {c.gender === 'girl' ? '👧 Girl' : '👦 Boy'}
                    </button>
                    <button
                      onClick={() => { setResetTargetId(resetTargetId === c.id ? null : c.id); setResetPassword(''); }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      🔑 Reset Password
                    </button>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${c.is_active ? 'bg-green-900/50 text-green-400 border border-green-800 hover:bg-red-900/50 hover:text-red-400 hover:border-red-800' : 'bg-neutral-800 text-gray-500 border border-neutral-700 hover:bg-green-900/50 hover:text-green-400'}`}
                    >
                      {c.is_active ? '✅ Active' : '⛔ Inactive'}
                    </button>
                  </div>
                </div>
                {resetTargetId === c.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="New password"
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      onClick={() => handleResetPassword(c)}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ADMIN DASHBOARD ─────────────────────────────────────────────────────

export default function AdminDashboard({ currentData, currentSunday, onUpdateStats, onBack }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [section, setSection] = useState<AdminSection>('packages');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        alert('❌ Incorrect passcode!');
      }
    } catch {
      alert('⚠️ Could not reach server.');
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-400 text-sm mb-8 flex items-center gap-2 transition-colors">
            ← Back to Dashboard
          </button>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <div className="text-3xl mb-4">🔑</div>
            <h1 className="text-xl font-bold text-white mb-1">Admin Access</h1>
            <p className="text-gray-500 text-sm mb-6">Enter the master passcode to continue.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Passcode"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neutral-500"
                autoFocus
              />
              <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const NAV: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'packages',   label: 'Weekly Packages', icon: '📦' },
    { id: 'questions',  label: 'Question Bank',    icon: '🗃️' },
    { id: 'classmates', label: 'Classmates',       icon: '🎓' },
    { id: 'tools',      label: 'Tools',            icon: '⚙️' },
    { id: 'prompts',    label: 'Prompts',          icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left sidebar */}
      <aside className="w-56 flex-shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-6 border-b border-neutral-800">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">G5 Admin</p>
          <p className="text-white font-bold">Control Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                section === item.id
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Back button */}
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-10">
        {section === 'packages' && (
          <WeeklyPackageBuilder
            currentData={currentData}
            currentSunday={currentSunday}
            onUpdateStats={onUpdateStats}
          />
        )}
        {section === 'questions' && <QuestionBankImporter />}
        {section === 'classmates' && <ClassmatesSection passcode={password} />}
        {section === 'tools' && (
          <ToolsSection
            currentData={currentData}
            currentSunday={currentSunday}
            onUpdateStats={onUpdateStats}
            passcode={password}
          />
        )}
        {section === 'prompts' && <PromptsSection />}
      </main>
    </div>
  );
}
