// components/monster/TeamView.tsx
// Extracted from MonsterGuild.tsx's `view === 'team'` block — a thin
// wrapper around TeamPanel, part of the small-views batch (see
// TrainersView.tsx and BattleViews.tsx for the bigger slices). No behavior
// change.
'use client';

import { MonsterDef } from '@/lib/monsterConfig';
import { InventoryMap } from '@/lib/inventory';
import { EggChainMap } from '@/lib/curioEggs';
import { UserMonster } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';
import TeamPanel from '@/components/monster/TeamPanel';

interface TeamViewProps {
  userMonsters: UserMonster[];
  playerLevel: number;
  userId: string;
  onTeamChange: () => void;
  onLoadoutChange: () => Promise<void> | void;
  monsterDisplay: Record<string, MonsterDef>;
  caughtMonsters: CaughtMonster[];
  onPromote: (caught: CaughtMonster, slot: number) => void;
  inventory: InventoryMap;
  currentGold: number;
  weekStartingDate: string;
  onGoldSynced: (newStats: { gold: number; xp: number; level: number }) => void;
  eggChainMap: EggChainMap;
  claimedEggParentIds: Set<string | null>;
  onEggClaimed: () => void;
  onGraduated?: () => void;
  onTutored?: () => void;
}

export default function TeamView(props: TeamViewProps) {
  return <TeamPanel {...props} />;
}
