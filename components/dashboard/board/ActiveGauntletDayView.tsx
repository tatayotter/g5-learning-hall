// components/dashboard/board/ActiveGauntletDayView.tsx
// Extracted from Dashboard.tsx's board-tab "active Topic Mastery Gauntlet
// day" view. Part of splitting Dashboard.tsx apart. No behavior change.
'use client';

import { UserId, USERS, gradeToNumber } from '@/lib/userSession';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { WEEKDAYS } from '@/lib/weekdays';
import GameButton from '@/components/GameButton';
import MasteryGauntletScreen from '@/components/monster/MasteryGauntletScreen';
import { CustomEvent } from '@/lib/customEvents';
import { BossQuestion } from '@/lib/bossFightEngine';
import { markGauntletDayComplete, fetchGauntletDaysDone } from '@/lib/masteryGauntletEngine';

interface ActiveGauntletDayViewProps {
  activeUserId: UserId;
  activeEvent: CustomEvent;
  activeGauntletDay: string;
  gauntletDayPools: Record<string, BossQuestion[]>;
  weekStartingDate: string;
  setActiveGauntletDay: (day: string | null) => void;
  setGauntletDaysDone: (days: Set<string>) => void;
  setRevealEventMonster: (monsterId: string | null) => void;
  loadEventData: (userId: UserId) => Promise<void>;
}

export default function ActiveGauntletDayView({
  activeUserId,
  activeEvent,
  activeGauntletDay,
  gauntletDayPools,
  weekStartingDate,
  setActiveGauntletDay,
  setGauntletDaysDone,
  setRevealEventMonster,
  loadEventData,
}: ActiveGauntletDayViewProps) {
  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
      <GameButton
        onClick={() => setActiveGauntletDay(null)}
        className="text-[#6b4820] hover:text-[#2a1505] flex items-center text-sm font-bold transition-colors mb-4"
      >
        ← Retreat to Map
      </GameButton>
      <MasteryGauntletScreen
        userId={activeUserId}
        grade={gradeToNumber(USERS[activeUserId]?.grade)}
        term={activeEvent.gauntlet_term ?? 1}
        day={activeGauntletDay}
        pool={gauntletDayPools[activeGauntletDay] || []}
        eventTitle={activeEvent.title}
        onExit={async (completedThisDay) => {
          const day = activeGauntletDay;
          setActiveGauntletDay(null);
          if (!completedThisDay || !day) return;
          const grade = gradeToNumber(USERS[activeUserId]?.grade);
          const term = activeEvent.gauntlet_term ?? 1;
          await markGauntletDayComplete(activeUserId, activeEvent.id, grade, term, day);
          const daysDone = await fetchGauntletDaysDone(activeUserId, activeEvent.id);
          setGauntletDaysDone(daysDone);
          if (daysDone.size >= WEEKDAYS.length) {
            const { data: grantedMonsterId } = await supabase.rpc('claim_event_reward', {
              p_event_id: activeEvent.id,
              p_user_id: activeUserId,
              p_grade_level: grade,
            });
            if (grantedMonsterId) {
              setRevealEventMonster(grantedMonsterId);
              logAction(activeUserId, weekStartingDate, 'event_reward', `Completed event: ${activeEvent.title}`, 0, 0);
              trackEvent('event_reward_claimed', { event_id: activeEvent.id });
            }
            loadEventData(activeUserId);
          }
        }}
      />
    </div>
  );
}
