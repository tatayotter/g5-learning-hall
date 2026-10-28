// components/monster/MapView.tsx
// Extracted from MonsterGuild.tsx's `view === 'map'` block — a thin wrapper
// around TrainingMap, part of the small-views batch (see TrainersView.tsx
// and BattleViews.tsx for the bigger slices). No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import type { BattleQuestion } from '@/components/battle/shared';
import { useMapPresence } from '@/hooks/useMapPresence';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import { NpcTrainer, MonsterDef } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { UserMonster } from '@/components/battle/shared';
import { CaughtMonster, BattleState, PendingWildCurio } from '@/components/monster/types';
import type { InventoryMap } from '@/lib/inventory';
import TrainingMap from '@/components/monster/TrainingMap';
import type { GuildKey } from '@/lib/dailyChecklist';
import type { TownPage } from '@/lib/townNpcs';

interface MapViewProps {
  userId: string;
  battleState: BattleState;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  questions: BattleQuestion[];
  onBattleStateChange: (state: BattleState) => void;
  onMonsterExpGained: (monsterId: string, exp: number) => void;
  onHeal: () => void;
  onQuestionsAnswered: (questions: BattleQuestion[]) => void;
  onWildEncounterRoll: (pity: boolean) => void;
  activeCurio: { id: number; monsterId: string; quality: QualityTier; attemptsLeft: number } | null;
  onEnterCurio: () => void;
  onTrainerEncounter: (trainer: NpcTrainer) => void;
  onTrashTraded: (gold: number) => void;
  onGoldSynced?: (stats: { gold: number; xp: number; level: number }) => void;
  onChallengePlayer: (opponentId: UserId, opponentName: string) => void;
  onTradePlayer: (opponentId: UserId, opponentName: string) => void;
  onGatedPlayerClick?: () => void;
  liveBattleInbox: ReturnType<typeof useLiveBattleInbox>;
  mapPresence: ReturnType<typeof useMapPresence>;
  movementLocked: boolean;
  walkLockActive: boolean;
  monsterDisplay: Record<string, MonsterDef>;
  regionId: string;
  playerLevel: number;
  onEnterRegion: (regionId: string) => void;
  inventory: InventoryMap;
  onBattleStatePatch: (patch: Partial<BattleState>) => void;
  onTrackedCurioSummoned: (curio: PendingWildCurio) => void;
  onPlayGuild?: (guild: GuildKey) => void;
  onOpenPage?: (page: TownPage) => void;
  spawnAt?: { x: number; y: number };
  mapHome?: { questDone: boolean };
  paused?: boolean;
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
  onGoldSynced,
  onChallengePlayer,
  onTradePlayer,
  onGatedPlayerClick,
  liveBattleInbox,
  mapPresence,
  movementLocked,
  walkLockActive,
  monsterDisplay,
  regionId,
  playerLevel,
  onEnterRegion,
  inventory,
  onBattleStatePatch,
  onTrackedCurioSummoned,
  onPlayGuild,
  onOpenPage,
  spawnAt,
  mapHome,
  paused,
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
      inventory={inventory}
      onBattleStatePatch={onBattleStatePatch}
      onTrackedCurioSummoned={onTrackedCurioSummoned}
      onMonsterExpGained={onMonsterExpGained}
      onHeal={onHeal}
      onQuestionsAnswered={onQuestionsAnswered}
      onWildEncounterRoll={onWildEncounterRoll}
      activeCurio={activeCurio}
      onEnterCurio={onEnterCurio}
      onTrainerEncounter={onTrainerEncounter}
      onTrashTraded={onTrashTraded}
      onGoldSynced={onGoldSynced}
      onChallengePlayer={(targetId, name) => onChallengePlayer(targetId as UserId, name)}
      onTradePlayer={(targetId, name) => onTradePlayer(targetId as UserId, name)}
      onGatedPlayerClick={onGatedPlayerClick}
      liveBattleInbox={liveBattleInbox}
      mapPresence={mapPresence}
      movementLocked={movementLocked}
      walkLockActive={walkLockActive}
      monsterDisplay={monsterDisplay}
      regionId={regionId}
      playerLevel={playerLevel}
      onEnterRegion={onEnterRegion}
      onPlayGuild={onPlayGuild}
      onOpenPage={onOpenPage}
      spawnAt={spawnAt}
      mapHome={mapHome}
      paused={paused}
      fullscreen
    />
  );
}
