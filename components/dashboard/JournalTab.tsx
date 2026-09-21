// components/dashboard/JournalTab.tsx
// Extracted from Dashboard.tsx's `activeTab === 'journal'` block — part of
// splitting that god component apart, same approach as VaultTab/GuildsTab.
// No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import { useWeeklyData, CharacterStats, JournalEntry } from '@/hooks/useWeeklyData';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import GuildJournal from '@/components/GuildJournal';
import PlayerLog from '@/components/PlayerLog';

type UseWeeklyDataReturn = ReturnType<typeof useWeeklyData>;

interface JournalTabProps {
  activeUserId: UserId;
  journalLogs: Record<string, JournalEntry>;
  characterStats: CharacterStats;
  weekStartingDate: string;
  onSave: UseWeeklyDataReturn['updateStatsAndJournal'];
}

export default function JournalTab({ activeUserId, journalLogs, characterStats, weekStartingDate, onSave }: JournalTabProps) {
  return (
    <div data-tutorial-id="journal-welcome">
      {/* Same Bungee/stroke/shadow text treatment as the quest
          GameButton's label (2026-08-29), in quest gold instead of
          the button's white. */}
      <h1 className="text-2xl lg:text-3xl mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Guild Journal</span>
          <span style={{ ...questTextStyle, color: '#f5c542' }}>Guild Journal</span>
        </span>
      </h1>
      <p className="text-[#6b4820] mb-6">Reflect on today's run and seal your ledger entry to claim your reward.</p>
      <GuildJournal
        userId={activeUserId}
        journalLogs={journalLogs || {}}
        stats={characterStats}
        currentSunday={weekStartingDate}
        onSave={onSave}
      />
      <h3 className="text-lg font-bold text-[#7a4a0f] font-display mt-8 mb-2">Player Log</h3>
      <PlayerLog userId={activeUserId} />
    </div>
  );
}
