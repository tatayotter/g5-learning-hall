// components/GuildJournal.tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { CharacterStats, JournalEntry } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { playSeal, playLevelUp } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';
import GameButton from '@/components/GameButton';

interface GuildJournalProps {
  userId: string;
  journalLogs: Record<string, JournalEntry> | undefined | null;
  stats: CharacterStats;
  currentSunday: string;
  onSave: (newStats: CharacterStats, newLogs: Record<string, JournalEntry>) => void;
}

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
  // If journalLogs is undefined (still fetching from Supabase), 
  // do not show the form yet to prevent accidental unlocked submissions.
  if (!journalLogs) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6 text-gray-500 animate-pulse">
        <h3 className="font-bold mb-2">📜 Syncing Ledger...</h3>
      </div>
    );
  }

  const hasEntryToday = !!journalLogs[todayKey];

  // --- SUBMISSION HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create new log object
    const newLogs = { ...journalLogs, [todayKey]: formData };
    let newStats = { ...stats };

    // Archive this entry into the dedicated journal_entries table (for future export)
    const weekStart = format(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), 'yyyy-MM-dd');
    const { error: archiveError } = await supabase.from('journal_entries').insert({
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

    // Process Rewards (only if NOT already submitted)
    if (!hasEntryToday) {
      newStats.gold += 50;
      newStats.xp += 50;

      // Level Up Logic
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
        playSeal();
      }

      await logAction(userId, currentSunday, 'journal', `Submitted daily journal entry for ${todayKey}`, 50, 50);
    }

    onSave(newStats, newLogs);
  };

  // --- RENDER: ALREADY SUBMITTED ---
  if (hasEntryToday) {
    return (
      <div className="bg-green-900/20 border border-green-800 rounded-xl p-5 mb-6 text-white">
        <h3 className="font-bold text-green-400 mb-2">✅ Journal Sealed for Today!</h3>
        <p className="text-sm text-gray-400 mb-4">
          Entry: "{journalLogs[todayKey].done_today.substring(0, 30)}..."
        </p>
        <div className="text-xs text-green-600 font-bold uppercase">Status: Read Only</div>
      </div>
    );
  }

  // --- RENDER: SUBMISSION FORM ---
  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-5 mb-6 text-white">
      <h3 className="font-bold mb-4">📜 Guild Journal Ledger</h3>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <textarea
          placeholder="⚔️ What I did today"
          className="w-full bg-black border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none"
          required
          minLength={20}
          title="At least 20 characters"
          onChange={e => setFormData({...formData, done_today: e.target.value})}
        />
        <textarea
          placeholder="🗺️ What I will do tomorrow"
          className="w-full bg-black border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none"
          required
          minLength={20}
          title="At least 20 characters"
          onChange={e => setFormData({...formData, tomorrow_plan: e.target.value})}
        />
        <textarea
          placeholder="🐉 Hardest challenge today"
          className="w-full bg-black border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none"
          required
          minLength={20}
          title="At least 20 characters"
          onChange={e => setFormData({...formData, hardest_challenge: e.target.value})}
        />
        <input
          placeholder="💎 One thing I'm grateful for"
          className="w-full bg-black border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none"
          required
          minLength={20}
          title="At least 20 characters"
          onChange={e => setFormData({...formData, gratitude: e.target.value})}
        />
        <p className="text-xs text-amber-500 text-center">✨ Earn +50 XP and +50 Gold for sealing today's entry · min. 20 characters per field</p>
        <GameButton type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
          💾 Seal Journal Entry
        </GameButton>
      </form>
    </div>
  );
}