'use client';
import { useEffect, useState } from 'react';
import { startOfWeek, format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface Props {
  childId: string;
}

interface SubclassProfile {
  lorekeeper_lvl: number;
  spellcaster_lvl: number;
  number_realm_lvl: number;
  logic_labyrinth_lvl: number;
  lexicon_arena_lvl: number;
}

const SKILLS: { key: keyof SubclassProfile; label: string; icon: string }[] = [
  { key: 'lorekeeper_lvl', label: 'Reading', icon: '📖' },
  { key: 'spellcaster_lvl', label: 'Spelling', icon: '🔤' },
  { key: 'number_realm_lvl', label: 'Math', icon: '🔢' },
  { key: 'logic_labyrinth_lvl', label: 'Logic', icon: '🧩' },
  { key: 'lexicon_arena_lvl', label: 'Vocabulary', icon: '📚' },
];

interface JournalEntry {
  entry_date: string;
  done_today: string | null;
  tomorrow_plan: string | null;
  hardest_challenge: string | null;
  gratitude: string | null;
}

function computeStreak(claimDates: string[]): number {
  if (claimDates.length === 0) return 0;
  const dates = new Set(claimDates);
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);
  // Today may not be claimed yet, so start counting from today if present,
  // otherwise from yesterday — a gap only breaks the streak once a full day is missed.
  if (!dates.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function ChildProgressPanel({ childId }: Props) {
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [masteryCount, setMasteryCount] = useState<number | null>(null);
  const [perfectQuizzes, setPerfectQuizzes] = useState<number | null>(null);
  const [subclass, setSubclass] = useState<SubclassProfile | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [quizzesLast7Days, setQuizzesLast7Days] = useState<number>(0);
  const [streak, setStreak] = useState(0);

  const [showJournal, setShowJournal] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const currentSunday = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [weeklyRes, subclassRes, loginRes, quizRes, streakRes] = await Promise.all([
        supabase
          .from('weekly_packages')
          .select('character_stats, mastery_count, perfect_quizzes')
          .eq('user_id', childId)
          .lte('week_starting_date', currentSunday)
          .order('week_starting_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_subclass_profiles')
          .select('lorekeeper_lvl, spellcaster_lvl, number_realm_lvl, logic_labyrinth_lvl, lexicon_arena_lvl')
          .eq('user_id', childId)
          .maybeSingle(),
        supabase
          .from('user_last_login')
          .select('last_login')
          .eq('user_id', childId)
          .maybeSingle(),
        supabase
          .from('user_completed_questions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', childId)
          .gte('completed_at', sevenDaysAgo.toISOString()),
        supabase.rpc('get_child_streak', { p_child_id: childId }),
      ]);

      if (cancelled) return;

      const stats = weeklyRes.data?.character_stats as { level?: number; xp?: number } | undefined;
      setLevel(stats?.level ?? null);
      setXp(stats?.xp ?? null);
      setMasteryCount(weeklyRes.data?.mastery_count ?? null);
      setPerfectQuizzes(weeklyRes.data?.perfect_quizzes ?? null);
      setSubclass((subclassRes.data as SubclassProfile) ?? null);
      setLastLogin(loginRes.data?.last_login ?? null);
      setQuizzesLast7Days(quizRes.count ?? 0);
      const claimDates = ((streakRes.data as { claim_date: string }[] | null) ?? []).map((r) => r.claim_date);
      setStreak(computeStreak(claimDates));
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [childId]);

  const handleToggleJournal = async () => {
    if (showJournal) {
      setShowJournal(false);
      return;
    }
    setShowJournal(true);
    if (journal !== null) return;
    setJournalLoading(true);
    const { data, error } = await supabase.rpc('get_child_journal', { p_child_id: childId, p_limit: 7 });
    setJournalLoading(false);
    if (error) {
      console.error('Failed to load journal:', error);
      return;
    }
    setJournal((data as JournalEntry[]) ?? []);
  };

  if (loading) {
    return <p className="text-xs text-gray-500 py-2">Loading progress…</p>;
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-black/40 border border-neutral-800 py-2">
          <p className="text-white text-sm font-bold">{level ?? '—'}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Level</p>
        </div>
        <div className="rounded-lg bg-black/40 border border-neutral-800 py-2">
          <p className="text-white text-sm font-bold">{xp ?? 0}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">XP</p>
        </div>
        <div className="rounded-lg bg-black/40 border border-neutral-800 py-2">
          <p className="text-white text-sm font-bold">🔥 {streak}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Day streak</p>
        </div>
      </div>

      {subclass && (
        <div className="grid grid-cols-5 gap-1.5">
          {SKILLS.map((s) => (
            <div key={s.key} className="rounded-lg bg-black/40 border border-neutral-800 py-1.5 text-center">
              <p className="text-sm">{s.icon}</p>
              <p className="text-white text-xs font-bold">Lv{subclass[s.key]}</p>
              <p className="text-[9px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {masteryCount ?? 0} topics mastered · {perfectQuizzes ?? 0} perfect quizzes · {quizzesLast7Days} questions this week
        {lastLogin && <> · last played {new Date(lastLogin).toLocaleDateString()}</>}
      </p>

      <button
        type="button"
        onClick={handleToggleJournal}
        className="text-xs text-indigo-300 hover:text-indigo-200 underline"
      >
        {showJournal ? 'Hide journal' : 'View journal'}
      </button>

      {showJournal && (
        <div className="space-y-2">
          {journalLoading && <p className="text-xs text-gray-500">Loading journal…</p>}
          {!journalLoading && journal?.length === 0 && (
            <p className="text-xs text-gray-500">No journal entries yet.</p>
          )}
          {!journalLoading && journal?.map((entry) => (
            <div key={entry.entry_date} className="rounded-lg bg-black/40 border border-neutral-800 p-2.5 text-xs space-y-1">
              <p className="text-gray-500 font-semibold">{new Date(entry.entry_date).toLocaleDateString()}</p>
              {entry.done_today && <p className="text-gray-300"><span className="text-gray-500">Did today:</span> {entry.done_today}</p>}
              {entry.hardest_challenge && <p className="text-gray-300"><span className="text-gray-500">Hardest part:</span> {entry.hardest_challenge}</p>}
              {entry.gratitude && <p className="text-gray-300"><span className="text-gray-500">Grateful for:</span> {entry.gratitude}</p>}
              {entry.tomorrow_plan && <p className="text-gray-300"><span className="text-gray-500">Tomorrow:</span> {entry.tomorrow_plan}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
