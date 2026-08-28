'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { schoolWeekFromDate, weekToTermInfo } from '@/lib/promptBuilder';

// ─── School calendar helpers ──────────────────────────────────────────────────

const BREAK_WEEKS = new Set(['2026-09-14', '2026-12-21', '2026-12-28']);
const GRADES = [2, 3, 4, 5, 6] as const;

/** All teaching Mondays for SY 2026-2027, orientation and breaks excluded. */
function getAllTeachingWeeks(): { date: string; schoolWeek: number; termLabel: string }[] {
  const weeks = [];
  const d = new Date('2026-06-22'); // Week 2 — first teaching week
  const end = new Date('2027-04-12');
  while (d < end) {
    const date = d.toISOString().slice(0, 10);
    if (!BREAK_WEEKS.has(date)) {
      const sw = schoolWeekFromDate(d);
      const { label } = weekToTermInfo(sw);
      weeks.push({ date, schoolWeek: sw, termLabel: label });
    }
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

const ALL_WEEKS = getAllTeachingWeeks();

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(m) - 1]} ${Number(d)}`;
}

// ─── Status types ─────────────────────────────────────────────────────────────

type CellStatus = 'empty' | 'file' | 'imported';

function cellStatus(
  weekDate: string,
  grade: number,
  files: Set<string>,
  imported: Record<string, string>,
): CellStatus {
  const key = `${weekDate}-${grade}`;
  if (imported[key] === 'imported') return 'imported';
  if (files.has(key)) return 'file';
  return 'empty';
}

// ─── Cell badge ───────────────────────────────────────────────────────────────

function CellBadge({ status }: { status: CellStatus }) {
  if (status === 'imported')
    return <span className="text-[10px] font-bold text-emerald-400">✓ saved</span>;
  if (status === 'file')
    return <span className="text-[10px] font-bold text-amber-400">📋 ready</span>;
  return <span className="text-[10px] text-neutral-600">—</span>;
}

function cellBg(status: CellStatus) {
  if (status === 'imported') return 'bg-emerald-950/60 border-emerald-800/40 hover:bg-emerald-900/60';
  if (status === 'file')     return 'bg-amber-950/60   border-amber-800/40   hover:bg-amber-900/60';
  return                            'bg-[#1c1611]     border-[#2a2119]     hover:bg-[#2a2119]';
}

// ─── Paste/Import modal ───────────────────────────────────────────────────────

interface ModalProps {
  grade: number;
  week: { date: string; schoolWeek: number; termLabel: string };
  initialStatus: CellStatus;
  passcode: string;
  onClose: () => void;
  onSaved: (key: string) => void;
}

function CellModal({ grade, week, initialStatus, passcode, onClose, onSaved }: ModalProps) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [parsed, setParsed] = useState<object | null>(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadPrompt = useCallback(async () => {
    setLoadingPrompt(true);
    try {
      const res = await fetch('/api/admin-bow-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, grade, weekNumber: week.schoolWeek }),
      });
      const data = await res.json();
      if (data.success) setPrompt(data.prompt);
      else setPrompt(`Error: ${data.error}`);
    } catch {
      setPrompt('Could not load prompt.');
    } finally {
      setLoadingPrompt(false);
    }
  }, [passcode, grade, week.schoolWeek]);

  function copyPrompt() {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePasteChange(val: string) {
    setPasteValue(val);
    setParseError('');
    setParsed(null);
    if (!val.trim()) return;
    try {
      const obj = JSON.parse(val);
      // Basic validation: must have day keys
      const dayKeys = Object.keys(obj);
      if (!dayKeys.some(k => ['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(k))) {
        setParseError('JSON parsed but no day keys found (Monday–Friday). Make sure you pasted the full days object.');
        return;
      }
      setParsed(obj);
    } catch (e) {
      setParseError(`Invalid JSON: ${(e as Error).message}`);
    }
  }

  async function save() {
    if (!parsed) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/admin-content-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, grade, weekStartingDate: week.date, days: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.key);
        onClose();
      } else {
        setSaveError(data.error ?? 'Unknown error');
      }
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const subjectDayCount = parsed
    ? Object.values(parsed as Record<string, unknown>)
        .flatMap(day => Object.keys(day as object)).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0807]/70 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1c1611] border border-[#3d3225] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#2a2119]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-900/60 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-700/40">
                Grade {grade}
              </span>
              <span className="text-[#8a7c66] text-xs">{week.termLabel}</span>
            </div>
            <h2 className="text-[#ede4d3] font-bold text-lg">
              Week of {shortDate(week.date)}, {week.date.slice(0, 4)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a7c66] hover:text-[#ede4d3] text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status badge */}
          {initialStatus === 'imported' && (
            <div className="bg-emerald-950/50 border border-emerald-800/50 rounded-xl p-3 text-emerald-400 text-sm">
              ✓ Already saved in Supabase. Re-paste below to overwrite.
            </div>
          )}
          {initialStatus === 'file' && (
            <div className="bg-amber-950/50 border border-amber-800/50 rounded-xl p-3 text-amber-400 text-sm">
              JSON file exists but hasn't been imported to Supabase. Use the Import all button on the matrix, or paste + save below.
            </div>
          )}

          {/* Step 1 — Get the Claude.ai prompt */}
          <div>
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-3">
              Step 1 — Copy the prompt for Claude.ai
            </p>
            {!prompt ? (
              <button
                onClick={loadPrompt}
                disabled={loadingPrompt}
                className="bg-[#2a2119] hover:bg-[#3d3225] disabled:opacity-50 text-[#ede4d3] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {loadingPrompt ? '⚙️ Loading…' : '📄 Load prompt'}
              </button>
            ) : (
              <div>
                <pre className="bg-neutral-950 border border-[#2a2119] rounded-xl p-4 text-xs text-[#c9bfae] font-mono overflow-auto max-h-48 whitespace-pre-wrap mb-2">
                  {prompt}
                </pre>
                <button
                  onClick={copyPrompt}
                  className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${
                    copied
                      ? 'bg-emerald-700 text-[#ede4d3]'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-[#ede4d3]'
                  }`}
                >
                  {copied ? '✅ Copied!' : '📋 Copy prompt'}
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — Paste the JSON response */}
          <div>
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-2">
              Step 2 — Paste Claude's JSON response
            </p>
            <textarea
              ref={textareaRef}
              value={pasteValue}
              onChange={e => handlePasteChange(e.target.value)}
              placeholder={'Paste the full JSON here — the object that starts with { "Monday": ... }'}
              className="w-full h-40 bg-neutral-950 border border-[#3d3225] rounded-xl p-3 text-xs text-[#c9bfae] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none placeholder:text-neutral-600"
            />
            {parseError && (
              <p className="text-[#e0605a] text-xs mt-1">⚠️ {parseError}</p>
            )}
            {parsed && !parseError && (
              <p className="text-emerald-400 text-xs mt-1">
                ✓ Valid JSON — {subjectDayCount} subject-day entries found.
              </p>
            )}
          </div>

          {/* Step 3 — Save */}
          <div>
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-3">
              Step 3 — Save to file + Supabase
            </p>
            {saveError && (
              <div className="bg-red-950 border border-[#6e1512] text-red-300 text-xs rounded-xl p-3 mb-3">
                ⚠️ {saveError}
              </div>
            )}
            <button
              onClick={save}
              disabled={!parsed || saving}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#ede4d3] font-bold px-6 py-2.5 rounded-xl transition-colors"
            >
              {saving ? '💾 Saving…' : '💾 Save to file + Supabase'}
            </button>
            <p className="text-gray-600 text-xs mt-2">
              Writes <code className="bg-[#2a2119] px-1 rounded">week-{week.date}-g{grade}.json</code> and imports to DB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function ContentMatrixSection({ passcode }: { passcode: string }) {
  const [files, setFiles] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeCell, setActiveCell] = useState<{ grade: number; week: typeof ALL_WEEKS[0] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);

  // Load status on mount
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-content-status?passcode=${encodeURIComponent(passcode)}`);
      const data = await res.json();
      setFiles(new Set(data.files ?? []));
      setImported(data.imported ?? {});
    } catch {
      // silent — empty state
    } finally {
      setLoading(false);
    }
  }, [passcode]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Mark a cell as saved in local state after modal save
  function onCellSaved(key: string) {
    setImported(prev => ({ ...prev, [key]: 'imported' }));
    setFiles(prev => { const next = new Set(prev); next.add(key); return next; });
  }

  // Bulk import all files via the server-side batch endpoint
  async function importAll() {
    if (files.size === 0) {
      alert('No JSON files found in content/generated-packages/.');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/admin-content-import-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      setImportResult({ ok: data.ok ?? 0, fail: data.fail ?? 0 });
      // Refresh matrix status to reflect new imports
      await loadStatus();
    } catch (e) {
      setImportResult({ ok: 0, fail: 1 });
    } finally {
      setImporting(false);
    }
  }

  // Stats
  const totalCells = ALL_WEEKS.length * GRADES.length;
  const importedCount = Object.keys(imported).filter(k => k !== '_readme' && imported[k] === 'imported').length;
  const fileCount = files.size;

  if (loading) {
    return (
      <div className="text-[#8a7c66] text-sm animate-pulse">Loading content matrix…</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Content Matrix</h2>
          <p className="text-[#8a7c66] text-sm">SY 2026–2027 · {ALL_WEEKS.length} teaching weeks · Grades 2–6</p>
        </div>
        <div className="flex items-center gap-3">
          {importResult && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              importResult.fail === 0
                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'
                : 'bg-[#4a0e0c]/50 text-red-300 border border-[#8a1c17]/40'
            }`}>
              {importResult.ok} imported{importResult.fail > 0 ? `, ${importResult.fail} failed` : ''}
            </span>
          )}
          <button
            onClick={importAll}
            disabled={importing || fileCount === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-[#ede4d3] font-bold px-5 py-2 rounded-xl text-sm transition-colors"
          >
            {importing ? '⚙️ Importing…' : '⬆ Import all files'}
          </button>
        </div>
      </div>

      {/* Legend + stats */}
      <div className="flex items-center gap-6 mb-5">
        <div className="flex items-center gap-2 text-xs text-[#8a7c66]">
          <span className="w-3 h-3 rounded-sm bg-[#2a2119] border border-[#3d3225] inline-block" />
          No file
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8a7c66]">
          <span className="w-3 h-3 rounded-sm bg-amber-950 border border-amber-800 inline-block" />
          File ready ({fileCount})
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8a7c66]">
          <span className="w-3 h-3 rounded-sm bg-emerald-950 border border-emerald-800 inline-block" />
          Saved to DB ({importedCount} / {totalCells})
        </div>
        <button
          onClick={loadStatus}
          className="ml-auto text-xs text-gray-600 hover:text-[#c9bfae] transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-xl border border-[#2a2119]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#1c1611] border-b border-[#2a2119]">
              <th className="text-left px-4 py-3 text-[#8a7c66] font-medium w-48">Week</th>
              {GRADES.map(g => (
                <th key={g} className="px-3 py-3 text-[#a89c86] font-bold text-center">G{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_WEEKS.map((week, i) => {
              // Group label: insert a divider row at term boundaries
              const prevWeek = ALL_WEEKS[i - 1];
              const prevTerm = prevWeek ? weekToTermInfo(prevWeek.schoolWeek).term : null;
              const thisTerm = weekToTermInfo(week.schoolWeek).term;
              const showDivider = prevTerm !== null && thisTerm !== prevTerm;

              return [
                showDivider && (
                  <tr key={`divider-${week.date}`}>
                    <td
                      colSpan={6}
                      className="px-4 py-2 text-[10px] text-gray-600 uppercase tracking-widest font-semibold bg-neutral-950 border-t border-b border-[#2a2119]"
                    >
                      Term {thisTerm}
                    </td>
                  </tr>
                ),
                <tr
                  key={week.date}
                  className="border-b border-[#2a2119]/60 hover:bg-[#1c1611]/30 transition-colors"
                >
                  {/* Week label */}
                  <td className="px-4 py-2.5">
                    <span className="text-[#c9bfae] font-medium">{shortDate(week.date)}</span>
                    <span className="text-gray-600 ml-2">{week.date.slice(0, 4)}</span>
                    <div className="text-gray-600 text-[10px] mt-0.5">{week.termLabel}</div>
                  </td>

                  {/* Grade cells */}
                  {GRADES.map(grade => {
                    const status = cellStatus(week.date, grade, files, imported);
                    return (
                      <td key={grade} className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => setActiveCell({ grade, week })}
                          className={`w-full rounded-lg border py-1.5 px-2 transition-colors ${cellBg(status)}`}
                        >
                          <CellBadge status={status} />
                        </button>
                      </td>
                    );
                  })}
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-[#1c1611] border border-[#2a2119] rounded-xl p-5 text-xs text-[#8a7c66] leading-relaxed">
        <p className="font-semibold text-[#a89c86] mb-2">How to fill a week</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click any cell to open the import panel.</li>
          <li>Load the prompt → copy it → paste into Claude.ai → get the JSON response.</li>
          <li>Paste the JSON response into the panel → Save.</li>
          <li>Or drop JSON files into <code className="bg-[#2a2119] px-1 rounded">content/generated-packages/</code> and click <strong className="text-[#c9bfae]">Import all files</strong>.</li>
        </ol>
        <p className="mt-3">
          File naming convention: <code className="bg-[#2a2119] px-1 rounded">week-YYYY-MM-DD-gN.json</code>
          &nbsp;(e.g. <code className="bg-[#2a2119] px-1 rounded">week-2026-08-24-g5.json</code>).
          The "week" date is the Monday of that week.
        </p>
      </div>

      {/* Modal */}
      {activeCell && (
        <CellModal
          grade={activeCell.grade}
          week={activeCell.week}
          initialStatus={cellStatus(activeCell.week.date, activeCell.grade, files, imported)}
          passcode={passcode}
          onClose={() => setActiveCell(null)}
          onSaved={onCellSaved}
        />
      )}
    </div>
  );
}
