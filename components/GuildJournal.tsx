// components/GuildJournal.tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { CharacterStats, JournalEntry } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { playTeachingScroll, playLevelUp } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

interface GuildJournalProps {
  userId: string;
  journalLogs: Record<string, JournalEntry> | undefined | null;
  stats: CharacterStats;
  currentSunday: string;
  onSave: (newStats: CharacterStats, newLogs: Record<string, JournalEntry>) => void;
}


const MIN_CHARS = 20;

// Same card / tile language as the main-quest quiz (see QuestModule.tsx): cream
// card, wood border, raised bottom edge, dashed inner stitch, gold tile.
const JOURNAL_CSS = `
  .jcard { position:relative; background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%); border:2px solid #8b5e2a; border-radius:18px;
    padding:14px 16px 16px; box-shadow:0 5px 0 #8b5e2a, 0 10px 18px rgba(42,21,5,.22); }
  .jcard::before { content:''; position:absolute; inset:5px; border:1px dashed #c9a87a; border-radius:13px; pointer-events:none; }
  .jcard-done { border-color:#15803d; box-shadow:0 5px 0 #15803d, 0 10px 18px rgba(21,128,61,.25); }
  .jtile { flex:none; position:relative; overflow:hidden; width:2em; height:2em; display:flex; align-items:center; justify-content:center;
    border:0.0476em solid #000; border-radius:0.508em; background:#f5c542; }
  .jtile-done { background:#22c55e; }
  .jlabel { font-weight:800; font-size:15px; color:#2a1505; line-height:1.25; }
  .jinput { display:block; width:100%; background:#fff; border:2px solid #c9a87a; border-radius:12px; padding:10px 12px; font-size:15px;
    color:#2a1505; outline:none; resize:none; box-shadow:inset 0 2px 3px rgba(42,21,5,.08); transition:border-color .15s, box-shadow .15s; }
  .jinput::placeholder { color:#a08560; }
  .jinput:focus { border-color:#c9781a; box-shadow:0 0 0 3px rgba(245,201,92,.55); }
  .jcount { flex:none; font-size:11px; font-weight:800; border-radius:999px; padding:1px 9px; border:1px solid #c9a87a; background:#f0ddb8; color:#6b4820; }
  .jcount-ok { background:#dcfce7; border-color:#15803d; color:#166534; }
`;

function JournalTile({ children, done = false }: { children: React.ReactNode; done?: boolean }) {
  return (
    <span
      className={`jtile ${done ? 'jtile-done' : ''}`}
      style={{ fontSize: 20, fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, boxShadow: questButtonBoxShadow }}
    >
      <span aria-hidden style={{ position: 'absolute', top: '0.22em', right: '0.15em', width: '0.5em', height: '0.22em', background: 'rgba(255,255,255,0.75)', borderRadius: '50%', transform: 'rotate(10deg)' }} />
      <span style={{ position: 'relative', fontSize: '0.8em', lineHeight: 1 }}>{children}</span>
    </span>
  );
}

function RewardChip({ tone, children }: { tone: 'xp' | 'gold'; children: React.ReactNode }) {
  const c = tone === 'xp' ? { bg: '#dbeafe', bd: '#2563eb', tx: '#1e40af' } : { bg: '#fef3c7', bd: '#ca8a04', tx: '#92400e' };
  return (
    <span className="font-extrabold rounded-full px-3 py-0.5 border-2" style={{ background: c.bg, borderColor: c.bd, color: c.tx }}>
      {children}
    </span>
  );
}

function JournalField({
  label,
  icon,
  multiline = true,
  onChange,
}: {
  label: string;
  icon: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const [len, setLen] = useState(0);
  const handle = (v: string) => { setLen(v.length); onChange(v); };
  const ok = len >= MIN_CHARS;
  return (
    <div className={`jcard ${ok ? 'jcard-done' : ''}`}>
      <div className="flex items-center gap-3 mb-2.5 relative">
        <JournalTile done={ok}>{ok ? '✔' : icon}</JournalTile>
        <p className="jlabel flex-1">{label}</p>
        <span className={`jcount ${ok ? 'jcount-ok' : ''}`}>{Math.min(len, MIN_CHARS)}/{MIN_CHARS}</span>
      </div>
      {multiline ? (
        <textarea
          placeholder={`Write at least ${MIN_CHARS} characters…`}
          className="jinput"
          rows={3}
          required
          minLength={MIN_CHARS}
          title={`At least ${MIN_CHARS} characters`}
          onChange={e => handle(e.target.value)}
        />
      ) : (
        <input
          placeholder={`Write at least ${MIN_CHARS} characters…`}
          className="jinput"
          required
          minLength={MIN_CHARS}
          title={`At least ${MIN_CHARS} characters`}
          onChange={e => handle(e.target.value)}
        />
      )}
    </div>
  );
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
  if (!journalLogs) {
    return (
      <div className="rounded-2xl bg-[#f0ddb8] border border-[#c9a87a] p-6 mb-6 text-[#6b4820] animate-pulse">
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
      <div className="mb-6">
        <style>{JOURNAL_CSS}</style>
        <div className="jcard jcard-done text-center py-6">
          <h2 className="mb-3 leading-tight" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 30 }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>Journal Sealed!</span>
              <span style={{ ...questTextStyle, color: '#4ade80' }}>Journal Sealed!</span>
            </span>
          </h2>
          <p className="text-[#6b4820] font-semibold text-sm mb-4 relative">
            &ldquo;{journalLogs[todayKey].done_today.substring(0, 60)}&hellip;&rdquo;
          </p>
          <span className="relative inline-block bg-[#dcfce7] border-2 border-[#15803d] text-[#166534] text-xs font-extrabold uppercase tracking-wide px-3 py-1 rounded-full">
            Read Only
          </span>
        </div>
      </div>
    );
  }

  // --- RENDER: SUBMISSION FORM ---
  return (
    <div className="mb-6">
      <style>{JOURNAL_CSS}</style>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-[#7a4a0f] font-display">Guild Journal Ledger</h2>
        <span className="bg-[#c9781a]/20 text-[#7a4a0f] text-xs font-bold px-3 py-1 rounded-full border border-[#8b5e2a] whitespace-nowrap">
          Today&rsquo;s Entry
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        <JournalField
          icon="📝"
          label="What I did today"
          onChange={v => setFormData({ ...formData, done_today: v })}
        />
        <JournalField
          icon="🗓️"
          label="What I will do tomorrow"
          onChange={v => setFormData({ ...formData, tomorrow_plan: v })}
        />
        <JournalField
          icon="🛡️"
          label="Hardest challenge today"
          onChange={v => setFormData({ ...formData, hardest_challenge: v })}
        />
        <JournalField
          icon="💛"
          label="One thing I'm grateful for"
          multiline={false}
          onChange={v => setFormData({ ...formData, gratitude: v })}
        />

        <p className="text-sm text-[#6b4820] text-center font-semibold flex items-center justify-center gap-2 flex-wrap">
          Earn <RewardChip tone="xp">+50 XP</RewardChip> and <RewardChip tone="gold">+50 Gold</RewardChip> for sealing today&rsquo;s entry
        </p>

        <div className="pt-1 flex justify-center">
          <GameButton type="submit" variant="quest" style={{ fontSize: 22 }}>
            Seal Journal Entry
          </GameButton>
        </div>
      </form>
    </div>
  );
}
