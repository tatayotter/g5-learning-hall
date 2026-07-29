'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GRADE_LEVELS } from '@/lib/userSession';

export type GuildTable = 'sq_lorekeeper' | 'sq_spellcaster' | 'sq_number_realm' | 'sq_logic_labyrinth' | 'sq_lexicon_arena' | 'sq_wild_encounter';

const GUILD_LABELS: Record<GuildTable, string> = {
  sq_lorekeeper:      'Lorekeeper',
  sq_spellcaster:     'SpellCaster',
  sq_number_realm:    'Number Realm',
  sq_logic_labyrinth: 'Logic Labyrinth',
  sq_lexicon_arena:   'Lexicon Arena',
  sq_wild_encounter:  '🐲 Wild Encounter Questions',
};

function PoolCountPanel() {
  const [counts, setCounts] = useState<Record<string, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      const guilds = Object.keys(GUILD_LABELS) as GuildTable[];
      const results: Record<string, Record<number, number>> = {};

      await Promise.all(guilds.map(async (guild) => {
        const perGrade = await Promise.all(GRADE_LEVELS.map(g =>
          supabase.from(guild).select('id', { count: 'exact', head: true }).eq('is_active', true).eq('grade_level', g).eq('term_id', 1)
        ));
        results[guild] = Object.fromEntries(GRADE_LEVELS.map((g, i) => [g, perGrade[i].count || 0]));
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
              {GRADE_LEVELS.map(g => <th key={g} className="text-center pb-2">Grade {g}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {(Object.keys(GUILD_LABELS) as GuildTable[]).map(guild => (
              <tr key={guild}>
                <td className="py-2 text-gray-300 font-medium">{GUILD_LABELS[guild]}</td>
                {GRADE_LEVELS.map(g => (
                  <td key={g} className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge(counts[guild]?.[g] || 0)}`}>
                      {counts[guild]?.[g] ?? '—'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[10px] text-gray-600 mt-3">🟢 20+ Good &nbsp; 🟡 10–19 Low &nbsp; 🔴 &lt;10 Critical</p>
    </div>
  );
}

const nonEmptyStr = (v: any) => typeof v === 'string' && v.trim().length > 0;

// Per-guild required-field / cross-field checks. Without these, malformed
// rows (missing options_array, wrong expected_layout, correct_choice that
// doesn't match any choice_* field, etc.) import successfully but then crash
// or become permanently unanswerable when a student actually draws them —
// see LogicLabyrinth.tsx's unguarded `options_array.map`, NumberRealm.tsx's
// checkAnswer() falling through to isCorrect=false for bad expected_layout,
// and Lorekeeper/WildEncounterModal comparing correct_choice against the
// literal 'a'/'b'/'c'/'d' key, not the choice text.
// difficulty_tier is optional on the 5 tiered guild tables (defaults to 1 in
// the DB) but if present must be 1-3 — these drive the adaptive-difficulty
// pool progression in lib/guildEngine.ts's fetchQuestionPool. sq_wild_encounter
// has no such column (it's a separate Wild Encounter feature, not one of the
// 5 progression guilds), so reject the field there instead of letting a
// confusing "column does not exist" error surface from the insert itself.
function validateDifficultyTier(guild: GuildTable, q: any): string[] {
  if (q.difficulty_tier === undefined || q.difficulty_tier === null) return [];
  if (guild === 'sq_wild_encounter') {
    return ['difficulty_tier is not supported on sq_wild_encounter'];
  }
  if (typeof q.difficulty_tier !== 'number' || !Number.isInteger(q.difficulty_tier) || q.difficulty_tier < 1 || q.difficulty_tier > 3) {
    return [`difficulty_tier must be an integer 1-3 (got ${JSON.stringify(q.difficulty_tier)})`];
  }
  return [];
}

function validateQuestion(guild: GuildTable, q: any): string[] {
  const errors: string[] = [...validateDifficultyTier(guild, q)];

  if (guild === 'sq_lorekeeper' || guild === 'sq_wild_encounter') {
    if (!nonEmptyStr(q.question)) errors.push('missing question text');
    (['choice_a', 'choice_b', 'choice_c', 'choice_d'] as const).forEach(f => {
      if (!nonEmptyStr(q[f])) errors.push(`missing ${f}`);
    });
    if (!['a', 'b', 'c', 'd'].includes(q.correct_choice)) {
      errors.push(`correct_choice must be "a", "b", "c", or "d" (got ${JSON.stringify(q.correct_choice)})`);
    }
  } else if (guild === 'sq_spellcaster') {
    if (!nonEmptyStr(q.word_string)) errors.push('missing word_string');
  } else if (guild === 'sq_number_realm') {
    if (!nonEmptyStr(q.problem_prompt)) errors.push('missing problem_prompt');
    if (!['standard', 'fraction', 'time'].includes(q.expected_layout)) {
      errors.push(`expected_layout must be "standard", "fraction", or "time" (got ${JSON.stringify(q.expected_layout)})`);
    } else if (q.expected_layout === 'fraction') {
      if (typeof q.correct_numerator !== 'number' || typeof q.correct_denominator !== 'number') {
        errors.push('fraction layout requires numeric correct_numerator and correct_denominator');
      }
    } else if (q.expected_layout === 'time') {
      if (!nonEmptyStr(q.correct_standard_ans) || !/^\d+:\d+$/.test(q.correct_standard_ans.trim())) {
        errors.push('time layout requires correct_standard_ans in "H:M" format');
      }
    } else if (q.expected_layout === 'standard') {
      if (!nonEmptyStr(q.correct_standard_ans)) errors.push('standard layout requires correct_standard_ans');
    }
  } else if (guild === 'sq_logic_labyrinth') {
    if (!nonEmptyStr(q.puzzle_prompt_text) && !nonEmptyStr(q.matrix_image_url)) {
      errors.push('missing puzzle_prompt_text or matrix_image_url');
    }
    let options = q.options_array;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch { errors.push('options_array is not valid JSON'); options = null; }
    }
    if (!Array.isArray(options) || options.length === 0) {
      errors.push('options_array must be a non-empty array');
    } else {
      const ids = options.map((o: any) => o?.id);
      if (ids.some((id: any) => !nonEmptyStr(id))) errors.push('every option in options_array needs a non-empty id');
      if (!nonEmptyStr(q.correct_option_id) || !ids.includes(q.correct_option_id)) {
        errors.push('correct_option_id must match one of the ids in options_array');
      }
    }
  } else if (guild === 'sq_lexicon_arena') {
    if (!nonEmptyStr(q.correct_spelling)) errors.push('missing correct_spelling');
    (['wrong_a', 'wrong_b', 'wrong_c'] as const).forEach(f => {
      if (!nonEmptyStr(q[f])) errors.push(`missing ${f}`);
    });
    if (nonEmptyStr(q.correct_spelling)) {
      const correct = q.correct_spelling.trim().toLowerCase();
      (['wrong_a', 'wrong_b', 'wrong_c'] as const).forEach(f => {
        if (nonEmptyStr(q[f]) && q[f].trim().toLowerCase() === correct) {
          errors.push(`${f} duplicates correct_spelling — would make two buttons register as correct`);
        }
      });
    }
  }

  return errors;
}

// Pasted JSON never carries a DB id (ids are server-generated UUIDs), so the
// old `!q.id || !existingIds.has(q.id)` dedupe check was always true and let
// re-imports silently insert full duplicate rows. Dedupe on each guild's own
// identifying text field instead.
const DEDUPE_FIELDS: Record<GuildTable, string> = {
  sq_lorekeeper: 'question',
  sq_wild_encounter: 'question',
  sq_spellcaster: 'word_string',
  sq_number_realm: 'problem_prompt',
  sq_logic_labyrinth: 'puzzle_prompt_text, matrix_image_url',
  sq_lexicon_arena: 'correct_spelling',
};

function dedupeKeyFor(guild: GuildTable, q: any): string | null {
  const norm = (s: any) => (typeof s === 'string' && s.trim()) ? s.trim().toLowerCase().replace(/\s+/g, ' ') : null;
  if (guild === 'sq_logic_labyrinth') return norm(q.puzzle_prompt_text) || norm(q.matrix_image_url);
  if (guild === 'sq_spellcaster') return norm(q.word_string);
  if (guild === 'sq_number_realm') return norm(q.problem_prompt);
  if (guild === 'sq_lexicon_arena') return norm(q.correct_spelling);
  return norm(q.question);
}

// Reference JSON array shape for each guild — shown in the importer so it's
// easy to paste into an AI prompt and ask it to generate more questions in
// the exact format validateQuestion()/the DB columns expect. Don't include
// id/term_id/grade_level/is_active — those are set by the importer itself.
const GUILD_JSON_EXAMPLES: Record<GuildTable, string> = {
  sq_lorekeeper: JSON.stringify([
    {
      passage: "Optional passage text the question refers to (omit if not needed).",
      question: "What is the main idea of the passage?",
      choice_a: "First answer choice",
      choice_b: "Second answer choice",
      choice_c: "Third answer choice",
      choice_d: "Fourth answer choice",
      correct_choice: "a",
      difficulty_tier: 1,
    },
  ], null, 2),
  sq_wild_encounter: JSON.stringify([
    {
      passage: "Optional passage text the question refers to (omit if not needed).",
      question: "What is the main idea of the passage?",
      choice_a: "First answer choice",
      choice_b: "Second answer choice",
      choice_c: "Third answer choice",
      choice_d: "Fourth answer choice",
      correct_choice: "a",
    },
  ], null, 2),
  sq_spellcaster: JSON.stringify([
    { word_string: "beautiful", difficulty_tier: 2 },
  ], null, 2),
  sq_number_realm: JSON.stringify([
    { problem_prompt: "12 + 7 = ?", expected_layout: "standard", correct_standard_ans: "19", difficulty_tier: 1 },
    { problem_prompt: "1/2 + 1/4 = ?", expected_layout: "fraction", correct_numerator: 3, correct_denominator: 4, difficulty_tier: 2 },
    { problem_prompt: "How long is 90 minutes in hours and minutes?", expected_layout: "time", correct_standard_ans: "1:30", difficulty_tier: 2 },
  ], null, 2),
  sq_logic_labyrinth: JSON.stringify([
    {
      puzzle_prompt_text: "Which shape completes the pattern? (or use matrix_image_url instead)",
      options_array: [
        { id: "a", label: "Option A" },
        { id: "b", label: "Option B" },
        { id: "c", label: "Option C" },
        { id: "d", label: "Option D" },
      ],
      correct_option_id: "a",
      difficulty_tier: 1,
    },
  ], null, 2),
  sq_lexicon_arena: JSON.stringify([
    {
      language: "English",
      definition: "A word meaning pleasing to look at.",
      correct_spelling: "beautiful",
      wrong_a: "beutiful",
      wrong_b: "beautifull",
      wrong_c: "beautifal",
      difficulty_tier: 1,
    },
  ], null, 2),
};

export default function QuestionBankImporter() {
  const [guild, setGuild] = useState<GuildTable>('sq_lorekeeper');
  const [gradeLevel, setGradeLevel] = useState<number>(5);
  const [termId, setTermId] = useState(1);
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; invalid: number; invalidDetails: string[] } | null>(null);
  const [refreshPool, setRefreshPool] = useState(0);
  const [showFormat, setShowFormat] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyFormatExample = async () => {
    try {
      await navigator.clipboard.writeText(GUILD_JSON_EXAMPLES[guild]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the textarea below is still selectable
    }
  };

  const previewErrors = preview.map(q => validateQuestion(guild, q));
  const validCount = previewErrors.filter(e => e.length === 0).length;
  const invalidCount = preview.length - validCount;

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
    if (validCount === 0) return;
    setImporting(true);
    setImportResult(null);

    const { data: existing } = await supabase
      .from(guild)
      .select(DEDUPE_FIELDS[guild])
      .eq('term_id', termId)
      .eq('grade_level', gradeLevel)
      .eq('is_active', true);

    const existingKeys = new Set((existing || []).map((r: any) => dedupeKeyFor(guild, r)).filter((k): k is string => !!k));
    const seenInBatch = new Set<string>();

    let duplicateCount = 0;
    const toInsert: any[] = [];

    preview.forEach((q, i) => {
      if (previewErrors[i].length > 0) return; // invalid rows are never inserted, reported separately below
      const key = dedupeKeyFor(guild, q);
      if (key && (existingKeys.has(key) || seenInBatch.has(key))) {
        duplicateCount++;
        return;
      }
      if (key) seenInBatch.add(key);
      toInsert.push({ ...q, term_id: termId, grade_level: gradeLevel, is_active: true });
    });

    if (toInsert.length > 0) {
      const { error } = await supabase.from(guild).insert(toInsert);
      if (error) {
        alert(`❌ Import failed: ${error.message}`);
        setImporting(false);
        return;
      }
    }

    const invalidDetails = preview
      .map((q, i) => ({ errors: previewErrors[i] }))
      .filter(r => r.errors.length > 0)
      .map((r, idx) => `#${idx + 1}: ${r.errors.join('; ')}`);

    setImportResult({ inserted: toInsert.length, skipped: duplicateCount, invalid: invalidCount, invalidDetails });
    setPreview([]);
    setJsonInput('');
    setRefreshPool(r => r + 1);
    setImporting(false);
  };

  // Guild-specific field renderer for preview
  const renderQuestionPreview = (q: any, i: number) => {
    const errors = previewErrors[i];
    const wrapClass = `rounded-lg px-4 py-2 border ${errors.length > 0 ? 'bg-red-950/30 border-red-800' : 'bg-neutral-900 border-neutral-800'}`;
    const errorFooter = errors.length > 0 && (
      <p className="text-red-400 text-xs mt-1">⚠️ {errors.join('; ')}</p>
    );

    if (guild === 'sq_spellcaster') {
      return (
        <div key={i} className={wrapClass}>
          <div className="flex items-center justify-between">
            <span className="text-white font-mono">{q.word_string}</span>
            <span className="text-xs text-gray-500">Tier {q.difficulty_tier}</span>
          </div>
          {errorFooter}
        </div>
      );
    }
    if (guild === 'sq_number_realm') {
      return (
        <div key={i} className={wrapClass}>
          <p className="text-white text-sm">{q.problem_prompt}</p>
          <p className="text-xs text-green-400 mt-1">Answer: {q.correct_standard_ans || `${q.correct_numerator}/${q.correct_denominator}`}</p>
          {errorFooter}
        </div>
      );
    }
    return (
      <div key={i} className={wrapClass}>
        {q.passage && <p className="text-xs text-gray-500 mb-1 italic truncate">{q.passage.slice(0, 80)}...</p>}
        <p className="text-white text-sm">{q.question}</p>
        <p className="text-xs text-green-400 mt-1">✓ {q.correct_choice || q.correct_answer}</p>
        {errorFooter}
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
          <div className="flex gap-1.5 flex-wrap">
            {GRADE_LEVELS.map(g => (
              <button
                key={g}
                onClick={() => setGradeLevel(g)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${gradeLevel === g ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400 hover:text-white'}`}
              >
                {g}
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
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFormat(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-bold text-gray-300">
                📋 {GUILD_LABELS[guild]} JSON format {showFormat ? '▲' : '▼'}
              </span>
              <span className="text-xs text-gray-500">Use this to prompt an AI to generate questions</span>
            </button>
            {showFormat && (
              <div className="px-4 pb-4">
                <pre className="bg-black border border-neutral-800 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre">
                  {GUILD_JSON_EXAMPLES[guild]}
                </pre>
                <button
                  onClick={copyFormatExample}
                  className="mt-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? '✅ Copied!' : '📋 Copy format'}
                </button>
              </div>
            )}
          </div>
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
            <p className="text-white font-bold">
              {preview.length} questions parsed
              {invalidCount > 0 && <span className="text-red-400"> · {invalidCount} invalid (won't be imported)</span>}
            </p>
            <p className="text-xs text-gray-500">{GUILD_LABELS[guild]} · Grade {gradeLevel} · Term {termId}</p>
          </div>
          {invalidCount > 0 && (
            <p className="text-red-400 text-xs mb-3">⚠️ Fix the flagged rows below and re-paste, or continue to import only the {validCount} valid question{validCount === 1 ? '' : 's'}.</p>
          )}
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
              disabled={importing || validCount === 0}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              {importing ? 'Importing...' : `⬆️ Import ${validCount} Valid Question${validCount === 1 ? '' : 's'}`}
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
          {importResult.invalid > 0 && (
            <>
              <p className="text-red-400 text-sm mt-1">Skipped (invalid, not imported): <span className="font-bold">{importResult.invalid}</span></p>
              <div className="mt-2 bg-red-950/30 border border-red-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                {importResult.invalidDetails.map((d, i) => (
                  <p key={i} className="text-red-300 text-xs">{d}</p>
                ))}
              </div>
            </>
          )}
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
