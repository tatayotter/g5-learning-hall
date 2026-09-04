// components/monster/MapView.tsx
// Extracted from MonsterGuild.tsx's `view === 'map'` block — a thin wrapper
// around TrainingMap, part of the small-views batch (see TrainersView.tsx
// and BattleViews.tsx for the bigger slices). No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import { useMapPresence } from '@/hooks/useMapPresence';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import { NpcTrainer, MonsterDef } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { UserMonster } from '@/components/battle/shared';
import { CaughtMonster, BattleState } from '@/components/monster/types';
import TrainingMap from '@/components/monster/TrainingMap';

interface MapViewProps {
  userId: string;
  battleState: BattleState;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  questions: any[];
  onBattleStateChange: (state: BattleState) => void;
  onMonsterExpGained: (monsterId: string, exp: number) => void;
  onHeal: () => void;
  onQuestionsAnswered: (questions: any[]) => void;
  onWildEncounterRoll: () => void;
  activeCurio: { id: number; monsterId: string; quality: QualityTier } | null;
  onEnterCurio: () => void;
  onTrainerEncounter: (trainer: NpcTrainer) => void;
  onTrashTraded: (gold: number) => void;
  onChallengePlayer: (opponentId: UserId, opponentName: string) => void;
  liveBattleInbox: ReturnType<typeof useLiveBattleInbox>;
  mapPresence: ReturnType<typeof useMapPresence>;
  movementLocked: boolean;
  walkLockActive: boolean;
  monsterDisplay: Record<string, MonsterDef>;
  regionId: string;
  playerLevel: number;
  onEnterRegion: (regionId: string) => void;
}

export default function MapView({
  userId,
  battleState,
  userMonsters,
  caughtMonsters,
  questions,
  onBattleStateChange,
  onMonsterExpGained,
  onHeal,
  onQuestionsAnswered,
  onWildEncounterRoll,
  activeCurio,
  onEnterCurio,
  onTrainerEncounter,
  onTrashTraded,
  onChallengePlayer,
  liveBattleInbox,
  mapPresence,
  movementLocked,
  walkLockActive,
  monsterDisplay,
  regionId,
  playerLevel,
  onEnterRegion,
}: MapViewProps) {
  return (
    <TrainingMap
      userId={userId}
      battleState={battleState}
      userMonsters={userMonsters}
      caughtMonsters={caughtMonsters}
      questions={questions}
      gradingUserId={userId}
      onBattleStateChange={onBattleStateChange}
      onMonsterExpGained={onMonsterExpGained}
      onHeal={onHeal}
      onQuestionsAnswered={onQuestionsAnswered}
      onWildEncounterRoll={onWildEncounterRoll}
      activeCurio={activeCurio}
      onEnterCurio={onEnterCurio}
      onTrainerEncounter={onTrainerEncounter}
      onTrashTraded={onTrashTraded}
      onChallengePlayer={(targetId, name) => onChallengePlayer(targetId as UserId, name)}
      liveBattleInbox={liveBattleInbox}
      mapPresence={mapPresence}
      movementLocked={movementLocked}
      walkLockActive={walkLockActive}
      monsterDisplay={monsterDisplay}
      regionId={regionId}
      playerLevel={playerLevel}
      onEnterRegion={onEnterRegion}
      fullscreen
    />
  );
}
