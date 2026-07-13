'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import GameButton from '@/components/GameButton';

interface LogEntry {
  id: string;
  week_starting_date: string;
  action_type: string;
  description: string;
  xp_change: number;
  gold_change: number;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  journal: '📜 Journal Entry',
  quiz: '⚔️ Quest Completed',
  purchase: '🏪 Vault Purchase',
  deed: '🏅 Good Deed Awarded'
};

export default function PlayerLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLog() {
      const { data, error } = await supabase
        .from('player_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setEntries(data as LogEntry[]);
      }
      setLoading(false);
    }
    fetchLog();
  }, []);

  if (loading) {
    return <div className="text-gray-500 animate-pulse">Loading player log...</div>;
  }

  if (entries.length === 0) {
    return <p className="text-gray-500 italic">No actions recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="bg-[#111] border border-[#333] rounded-lg overflow-hidden">
            <GameButton
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-900 transition-colors"
            >
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase mr-3">{ACTION_LABELS[entry.action_type] || entry.action_type}</span>
                <span className="text-sm text-gray-300">{entry.description}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {entry.xp_change !== 0 && <span className="text-xs font-mono text-blue-400">{entry.xp_change > 0 ? '+' : ''}{entry.xp_change} XP</span>}
                {entry.gold_change !== 0 && <span className="text-xs font-mono text-yellow-500">{entry.gold_change > 0 ? '+' : ''}{entry.gold_change} 🪙</span>}
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </GameButton>
            {isExpanded && (
              <div className="px-4 pb-4 text-xs text-gray-500 border-t border-neutral-800 pt-3">
                <p>Week of: {entry.week_starting_date}</p>
                <p>Logged: {format(new Date(entry.created_at), 'MMM d, yyyy — h:mm a')}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}