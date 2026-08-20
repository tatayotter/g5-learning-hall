'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  user_id: string;
  week_starting_date: string;
  action_type: string;
  description: string;
  xp_change: number;
  gold_change: number;
  created_at: string;
}

const ACTION_ICONS: Record<string, string> = {
  quiz: '📝',
  event_quiz: '📝',
  journal: '📖',
  deed: '🏅',
  achievement: '🏆',
  side_quest: '⚔️',
  purchase: '🛒',
  trade: '🔄',
  battle: '🐉',
  graduation: '🎓',
  tutor: '📘',
  egg: '🥚',
  daily_checklist_bonus: '✅',
  event_reward: '🎉',
};

const COLLAPSED_COUNT = 6;
const PAGE_SIZE = 10;

export default function PlayerLog({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function fetchLog() {
      const { data, error } = await supabase
        .from('player_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setEntries(data as LogEntry[]);
      }
      setLoading(false);
    }
    fetchLog();
  }, [userId]);

  if (loading) {
    return <div className="text-gray-400 animate-pulse text-sm">Loading player log…</div>;
  }

  if (entries.length === 0) {
    return <p className="text-gray-400 italic text-sm">No log entries yet. Start a quest to write your legend!</p>;
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const visibleEntries = showAll
    ? entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : entries.slice(0, COLLAPSED_COUNT);

  // Group by week
  const byWeek: Record<string, LogEntry[]> = {};
  visibleEntries.forEach((entry) => {
    const key = entry.week_starting_date;
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(entry);
  });

  return (
    <div className="space-y-8">
      {Object.entries(byWeek).map(([week, weekEntries]) => {
        const totalXp = weekEntries.reduce((s, e) => s + (e.xp_change || 0), 0);
        const totalGold = weekEntries.reduce((s, e) => s + (e.gold_change || 0), 0);
        return (
          <div key={week}>
            {/* Week header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-extrabold text-amber-700 uppercase tracking-widest whitespace-nowrap">
                Week of {format(new Date(week + 'T00:00:00'), 'MMM d, yyyy')}
              </span>
              <div className="flex-1 h-px bg-amber-200" />
              <span className="text-xs font-mono text-gray-500 flex items-center gap-2 flex-shrink-0">
                {totalXp > 0 && (
                  <span className="text-blue-600 font-bold">+{totalXp} XP</span>
                )}
                {totalGold !== 0 && (
                  <span className={`font-bold flex items-center gap-0.5 ${totalGold > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                    {totalGold > 0 ? '+' : ''}{totalGold}
                    <img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" />
                  </span>
                )}
              </span>
            </div>

            {/* Entry cards */}
            <div className="space-y-2">
              {weekEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-start bg-amber-50 border border-amber-100 rounded-xl p-3 shadow-sm"
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-base leading-none mt-0.5">{ACTION_ICONS[entry.action_type] || '📌'}</span>
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{entry.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(entry.created_at), 'EEE, MMM d — h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono ml-4 flex-shrink-0 space-y-0.5">
                    {entry.xp_change !== 0 && (
                      <div className="text-blue-600 font-bold">+{entry.xp_change} XP</div>
                    )}
                    {entry.gold_change !== 0 && (
                      <div className={`font-bold flex items-center justify-end gap-0.5 ${entry.gold_change > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                        {entry.gold_change > 0 ? '+' : ''}{entry.gold_change}
                        <img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-3.5 h-3.5 align-[-1px]" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!showAll && entries.length > COLLAPSED_COUNT && (
        <button
          onClick={() => { setShowAll(true); setPage(0); }}
          className="w-full text-center text-sm font-bold text-amber-700 hover:text-amber-900 py-2.5 border border-amber-200 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          View All ({entries.length})
        </button>
      )}

      {showAll && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setShowAll(false)}
            className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← Show Recent Only
          </button>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
