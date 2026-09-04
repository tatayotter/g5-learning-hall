// components/dashboard/board/ActiveBossFightView.tsx
// Extracted from Dashboard.tsx's board-tab "active boss fight" view. Part of
// splitting Dashboard.tsx apart. No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import GameButton from '@/components/GameButton';
import BossFightScreen from '@/components/monster/BossFightScreen';
import { getPersonasForGrade } from '@/lib/bossPersonas';

interface ActiveBossFightViewProps {
  activeUserId: UserId;
  bossGradeLevel: number;
  activeBossFight: string; // subject key
  bossDefeated: Set<string>;
  onExit: (defeated: boolean) => void;
}

export default function ActiveBossFightView({ activeUserId, bossGradeLevel, activeBossFight, bossDefeated, onExit }: ActiveBossFightViewProps) {
  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
      <GameButton variant="quest" color="#d4d4d4" onClick={() => onExit(false)} className="mb-4" style={{ fontSize: 13 }}>
        ← Retreat to Map
      </GameButton>
      <BossFightScreen
        userId={activeUserId}
        grade={bossGradeLevel}
        subject={activeBossFight}
        otherPersonas={getPersonasForGrade(bossGradeLevel).filter(
          p => p.subject !== activeBossFight && !bossDefeated.has(p.subject)
        )}
        onExit={onExit}
      />
    </div>
  );
}
