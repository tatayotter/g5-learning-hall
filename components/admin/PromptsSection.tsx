'use client';
import { useState, useEffect, useCallback } from 'react';
import { ALL_SUBJECTS_BY_GRADE, DEFAULT_SCHEDULES, type DaySchedule } from '@/lib/promptBuilder';

// ─── Static reference card (old behaviour) ───────────────────────────────────

function PromptCard({ title, subtitle, url }: { title: string; subtitle: string; url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    if (content || loading) { setOpen(o => !o); return; }
    setLoading(true);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(t => { setContent(t); setOpen(true); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">{subtitle}</p>
          <p className="text-white text-sm font-semibold">{title}</p>
        </div>
        <div className="flex gap-2">
          {content && (
            <button
              onClick={() => { navigator.clipboard.writeText(content!); alert('Copied full prompt!'); }}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Copy
            </button>
          )}
          <button
            onClick={load}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {loading ? '…' : open ? '▲ Hide' : '▼ View'}
          </button>
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">File not found: <code className="bg-neutral-800 px-1 rounded">{url}</code></p>}
      {open && content && (
        <pre className="mt-3 bg-neutral-950 rounded-xl p-3 text-xs text-gray-400 overflow-auto max-h-72 whitespace-pre-wrap font-mono">
          {content}
        </pre>
      )}
    </div>
  );
}

// ─── Day schedule editor ──────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;

function ScheduleEditor({
  grade,
  schedule,
  onChange,
}: {
  grade: number;
  schedule: DaySchedule;
  onChange: (s: DaySchedule) => void;
}) {
  const subjects = ALL_SUBJECTS_BY_GRADE[grade] ?? [];

  function toggle(day: string, subject: string) {
    const cur = schedule[day] ?? [];
    const next = cur.includes(subject) ? cur.filter(s => s !== subject) : [...cur, subject];
    onChange({ ...schedule, [day]: next });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {DAYS.map(day => (
        <div key={day} className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{day}</p>
          <div className="flex flex-col gap-1">
            {subjects.map(subject => (
              <label key={subject} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(schedule[day] ?? []).includes(subject)}
                  onChange={() => toggle(day, subject)}
                  className="accent-indigo-500"
                />
                <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                  {subject}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function PromptBuilder({ passcode }: { passcode: string }) {
  const [grade, setGrade] = useState(5);
  const [weekNumber, setWeekNumber] = useState<number>(() => {
    const SCHOOL_OPEN = new Date('2026-06-15').getTime();
    const diff = Date.now() - SCHOOL_OPEN;
    return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
  });
  const [schedule, setSchedule] = useState<DaySchedule>(() => DEFAULT_SCHEDULES[5] ?? {});
  const [result, setResult] = useState<{
    prompt: string;
    tokenCount: number;
    termLabel: string;
    weekDate: string;
    isBreak: boolean;
    bowBySubject: Record<string, string>;
  } | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset schedule when grade changes
  useEffect(() => {
    setSchedule(DEFAULT_SCHEDULES[grade] ?? {});
    setResult(null);
  }, [grade]);

  const build = useCallback(async () => {
    setBuilding(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin-bow-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, grade, weekNumber, daySchedule: schedule }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Unknown error');
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }, [passcode, grade, weekNumber, schedule]);

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Token comparison numbers
  const FULL_PROMPT_TOKENS: Record<number, number> = { 2: 3400, 3: 3500, 4: 4200, 5: 4400, 6: 4500 };
  const savings = result
    ? Math.round((1 - result.tokenCount / (FULL_PROMPT_TOKENS[grade] ?? 4000)) * 100)
    : null;

  return (
    <div className="bg-neutral-900 border border-indigo-900/50 rounded-2xl p-6 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-white font-bold">Prompt Builder</p>
          <p className="text-gray-500 text-xs">Assembles a lean AI prompt from the current week's BOW only — no full-year noise.</p>
        </div>
        {result && savings !== null && (
          <span className="ml-auto bg-emerald-900/60 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-700/50">
            {savings}% fewer tokens
          </span>
        )}
      </div>

      <hr className="border-neutral-800 my-4" />

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-5">
        {/* Grade picker */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Grade</label>
          <div className="flex gap-1">
            {[2, 3, 4, 5, 6].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                  grade === g
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Week number */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">
            School Week #
          </label>
          <input
            type="number"
            min={1}
            max={52}
            value={weekNumber}
            onChange={e => setWeekNumber(Number(e.target.value))}
            className="w-20 bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Term display */}
        {result && (
          <div className="self-end pb-1">
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              result.isBreak
                ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/40'
                : 'bg-blue-900/50 text-blue-300 border border-blue-700/40'
            }`}>
              {result.termLabel}
            </span>
          </div>
        )}
      </div>

      {/* Day schedule */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Day Schedule</p>
        <ScheduleEditor grade={grade} schedule={schedule} onChange={setSchedule} />
      </div>

      {/* Build button */}
      <button
        onClick={build}
        disabled={building}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-colors mb-5"
      >
        {building ? '⚙️ Building…' : '🔨 Build Prompt'}
      </button>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-xs rounded-xl p-3 mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div>
          {/* Stats row */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-xs text-gray-500">Week of {result.weekDate}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs">
              <span className="font-bold text-indigo-300">~{result.tokenCount}</span>
              <span className="text-gray-500"> tokens </span>
              <span className="text-gray-600 line-through">{FULL_PROMPT_TOKENS[grade] ?? '?'}</span>
            </span>
            <button
              onClick={copy}
              className={`ml-auto font-bold text-sm px-5 py-2 rounded-xl transition-all ${
                copied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? '✅ Copied!' : '📋 Copy Prompt'}
            </button>
          </div>

          {/* Prompt preview */}
          <pre className="bg-neutral-950 rounded-xl p-4 text-xs text-gray-300 overflow-auto max-h-80 whitespace-pre-wrap font-mono border border-neutral-800">
            {result.prompt}
          </pre>

          {/* BOW bullets used */}
          {Object.keys(result.bowBySubject).length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                ▶ BOW bullets extracted for Term {result.prompt.match(/Term (\d)/)?.[1] ?? '?'} (full reference)
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(result.bowBySubject).map(([subj, bullets]) => (
                  <div key={subj} className="bg-neutral-950 rounded-lg p-3 border border-neutral-800">
                    <p className="text-xs font-bold text-indigo-400 mb-1">{subj}</p>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">{bullets}</pre>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PromptsSection({ passcode }: { passcode: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Prompts</h2>
      <p className="text-gray-500 text-sm mb-6">
        Build a lean AI prompt for this week (~500 tokens) instead of pasting the full
        4 000-token prompt file. Or expand the reference cards below to grab the original.
      </p>

      <PromptBuilder passcode={passcode} />

      {/* Reference cards — collapsed by default to save space */}
      <div className="mb-3">
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Full reference prompts (with complete BOW)</p>
        <PromptCard title="Grade 2 Weekly Prompt" subtitle="✨ Grade 2" url="/prompts/tala-weekly-prompt.md" />
        <PromptCard title="Grade 3 Weekly Prompt" subtitle="🌱 Grade 3" url="/prompts/grade3-weekly-prompt.md" />
        <PromptCard title="Grade 4 Weekly Prompt" subtitle="📖 Grade 4" url="/prompts/grade4-weekly-prompt.md" />
        <PromptCard title="Grade 5 Weekly Prompt" subtitle="⚔️ Grade 5" url="/prompts/grade5-weekly-prompt.md" />
        <PromptCard title="Grade 6 Weekly Prompt" subtitle="🏆 Grade 6" url="/prompts/grade6-weekly-prompt.md" />
      </div>
    </div>
  );
}
