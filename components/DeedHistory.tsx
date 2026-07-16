'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface DeedEntry {
  id: string;
  description: string;
  gold_change: number;
  created_at: string;
}

interface MonthGroup {
  monthLabel: string;
  deeds: DeedEntry[];
  totalGold: number;
}

export default function DeedHistory({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeeds() {
      const { data, error } = await supabase
        .from('player_log')
        .select('*')
        .eq('user_id', userId)
        .eq('action_type', 'deed')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const byMonth: Record<string, DeedEntry[]> = {};
        (data as DeedEntry[]).forEach((entry) => {
          const monthLabel = format(new Date(entry.created_at), 'MMMM yyyy');
          if (!byMonth[monthLabel]) byMonth[monthLabel] = [];
          byMonth[monthLabel].push(entry);
        });

        const groupsArr: MonthGroup[] = Object.entries(byMonth).map(([monthLabel, deeds]) => ({
          monthLabel,
          deeds,
          totalGold: deeds.reduce((sum, d) => sum + (d.gold_change || 0), 0)
        }));

        setGroups(groupsArr);
      }
      setLoading(false);
    }
    fetchDeeds();
  }, [userId]);

  if (loading) {
    return <div className="text-gray-500 animate-pulse">Loading deed history...</div>;
  }

  if (groups.length === 0) {
    return <p className="text-gray-500 italic">No good deeds recorded yet.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.monthLabel}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-blue-400 font-display">{group.monthLabel}</h4>
            <span className="text-xs font-mono text-gray-400">
              {group.deeds.length} deed{group.deeds.length !== 1 ? 's' : ''} · 🪙 {group.totalGold} total
            </span>
          </div>
          <div className="space-y-2">
            {group.deeds.map((deed) => (
              <div key={deed.id} className="flex justify-between items-center bg-black border border-neutral-800 p-3 rounded-lg">
                <div>
                  <p className="text-sm">{deed.description}</p>
                  <p className="text-xs text-gray-500">{format(new Date(deed.created_at), 'MMM d, yyyy — h:mm a')}</p>
                </div>
                <span className="text-xs font-mono text-yellow-500">+{deed.gold_change} 🪙</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
