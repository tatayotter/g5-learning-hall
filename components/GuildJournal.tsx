// components/GuildJournal.tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { CharacterStats, JournalEntry } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { playTeachingScroll, playLevelUp } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';
import { isOfflineStorageAvailable } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';
import GameButton from '@/components/GameButton';

interface GuildJournalProps {
  userId: string;
  journalLogs: Record<string, JournalEntry> | undefined | null;
  stats: CharacterStats;
  currentSunday: string;
  onSave: (newStats: CharacterStats, newLogs: Record<string, JournalEntry>) => void;
}

const BTN_STYLE = 'bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_4px_0_0_#000] active:shadow-none active:translate-y-0.5 transition-all font-extrabold';

export default function GuildJournal({ userId, journalLogs, stats, currentSunday, onSave }: GuildJournalProps) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  // --- FORM STATE ---
  const [formData, setFormData] = useState<JournalEntry>({
    done_today: '',
    tomorrow_plan: '',
    hardest_challenge: '',
    gratitude: ''
  });

  // --- LOADING GUARD ---
  if (!journalLogs) {
    return (
      <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm mb-6 text-gray-400 animate-pulse">
        <p className="font-bold font-display">Syncing Ledger...</p>
      </div>
    );
  }

  const hasEntryToday = !!journalLogs[todayKey];

  // --- SUBMISSION HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newLogs = { ...journalLogs, [todayKey]: formData };
    let newStats = { ...stats };

    if (!(isOfflineStorageAvailable() && isAppOffline())) {
      const weekStart = format(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), 'yyyy-MM-dd');
      const { error: archiveError } = await supabase.from('journal_entries').insert({
        user_id: userId,
        entry_date: todayKey,
        week_starting_date: weekStart,
        done_today: formData.done_today,
        tomorrow_plan: formData.tomorrow_plan,
        hardest_challenge: formData.hardest_challenge,
        gratitude: formData.gratitude
      });
      if (archiveError) {
        console.error('Failed to archive journal entry:', archiveError);
      }
    }

    if (!hasEntryToday) {
      newStats.gold += 50;
      newStats.xp += 50;

      let currentXp = newStats.xp;
      let currentLvl = newStats.level;
      while (currentXp >= (500 + currentLvl * 100)) {
        currentXp -= (500 + currentLvl * 100);
        currentLvl += 1;
      }
      newStats.xp = currentXp;
      newStats.level = currentLvl;

      if (currentLvl > stats.level) {
        playLevelUp();
      } else {
        playTeachingScroll();
      }

      await logAction(userId, currentSunday, 'journal', `Submitted daily journal entry for ${todayKey}`, 50, 50);
    }

    onSave(newStats, newLogs);
  };

  // --- RENDER: ALREADY SUBMITTED ---
  if (hasEntryToday) {
    return (
      <div className="bg-green-50 border border-green-200 p-6 rounded-2xl shadow-sm text-center mb-6">
        <h2 className="text-2xl font-bold text-green-700 mb-2 font-display">Journal Sealed!</h2>
        <p className="text-gray-500 text-sm mb-3">
          &ldquo;{journalLogs[todayKey].done_today.substring(0, 60)}&hellip;&rdquo;
        </p>
        <span className="inline-block bg-green-100 border border-green-300 text-green-700 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
          Read Only
        </span>
      </div>
    );
  }

  // --- RENDER: SUBMISSION FORM ---
  return (
    <div className="bg-white border-2 border-amber-400 rounded-2xl shadow-md mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200 bg-amber-50">
        <h2 className="text-sm font-bold text-amber-800 font-display">Guild Journal Ledger</h2>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
          Today&rsquo;s Entry
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-3 text-sm">
        {/* Field: What I did today */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">What I did today</p>
          <textarea
            placeholder="Write at least 20 characters…"
            className="w-full bg-transparent text-gray-800 placeholder:text-gray-400 outline-none resize-none text-sm"
            rows={2}
            required
            minLength={20}
            title="At least 20 characters"
            onChange={e => setFormData({ ...formData, done_today: e.target.value })}
          />
        </div>

        {/* Field: What I will do tomorrow */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">What I will do tomorrow</p>
          <textarea
            placeholder="Write at least 20 characters…"
            className="w-full bg-transparent text-gray-800 placeholder:text-gray-400 outline-none resize-none text-sm"
            rows={2}
            required
            minLength={20}
            title="At least 20 characters"
            onChange={e => setFormData({ ...formData, tomorrow_plan: e.target.value })}
          />
        </div>

        {/* Field: Hardest challenge */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">Hardest challenge today</p>
          <textarea
            placeholder="Write at least 20 characters…"
            className="w-full bg-transparent text-gray-800 placeholder:text-gray-400 outline-none resize-none text-sm"
            rows={2}
            required
            minLength={20}
            title="At least 20 characters"
            onChange={e => setFormData({ ...formData, hardest_challenge: e.target.value })}
          />
        </div>

        {/* Field: Gratitude */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">One thing I&rsquo;m grateful for</p>
          <input
            placeholder="Write at least 20 characters…"
            className="w-full bg-transparent text-gray-800 placeholder:text-gray-400 outline-none text-sm"
            required
            minLength={20}
            title="At least 20 characters"
            onChange={e => setFormData({ ...formData, gratitude: e.target.value })}
          />
        </div>

        <p className="text-xs text-amber-600 text-center font-semibold">
          Earn +50 XP and +50 Gold for sealing today&rsquo;s entry · min. 20 characters per field
        </p>

        <div className="pt-2 flex justify-center">
          <button
            type="submit"
            className={`py-3 px-10 rounded-xl text-base font-display ${BTN_STYLE}`}
          >
            Seal Journal Entry
          </button>
        </div>
      </form>
    </div>
  );
}
