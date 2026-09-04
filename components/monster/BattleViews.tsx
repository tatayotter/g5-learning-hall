// components/monster/BattleViews.tsx
// Extracted from MonsterGuild.tsx's `view === 'battle'` (NPC + PvP) and
// `view === 'live_battle'` blocks — second slice of splitting that god
// component apart (see TrainersView.tsx for the first). No behavior change.
'use client';

import { UserId } from '@/lib/userSession';
import { NpcTrainer } from '@/lib/monsterConfig';
import { InventoryMap } from '@/lib/inventory';
import { ActiveBattleMonster } from '@/components/battle/shared';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import BattleScreen from '@/components/monster/BattleScreen';
import LiveBattleScreen from '@/components/LiveBattleScreen';
import { GuildView } from '@/components/monster/types';

type LiveBattleInbox = ReturnType<typeof useLiveBattleInbox>;

interface BattleViewsProps {
  view: GuildView;
  userId: string;
  questions: any[];
  inventory: InventoryMap;
  onUseItem: (key: string) => Promise<boolean>;
  handleQuestionsAnswered: (usedQuestions: any[]) => void;
  buildPlayerTeam: () => ActiveBattleMonster[];

  // "Skip for gold" (see BattleQuestionModal in components/battle/shared.tsx) —
  // same live balance + spend handler for all three battle modes below.
  gold: number;
  onSpendGold: (amount: number) => Promise<boolean>;

  // NPC battle
  activeBattle: NpcTrainer | null;
  handleBattleEnd: (won: boolean, expEarned: number) => void;

  // Same-session PvP (sibling-style, not the real-time live battle below)
  pvpOpponentTeam: ActiveBattleMonster[] | null;
  pvpOpponent: { id: UserId; name: string } | null;
  handlePvpBattleEnd: (won: boolean, expEarned: number) => void;

  // Live PvP
  liveBattleId: string | null;
  liveBattleOpponent: { id: UserId; name: string } | null;
  liveBattleSide: 'challenger' | 'opponent';
  liveBattleTeams: { mine: ActiveBattleMonster[]; opp: ActiveBattleMonster[] } | null;
  liveBattleBotAccuracy: number | undefined;
  liveBattleInbox: LiveBattleInbox;
  showNotification: (msg: string) => void;
  onBattleWon: (kind: 'trainer' | 'sibling' | 'dummy') => void;
  onProgressSynced: () => void;
  setLiveBattleId: (id: string | null) => void;
  setLiveBattleOpponent: (opponent: { id: UserId; name: string } | null) => void;
  setLiveBattleTeams: (teams: { mine: ActiveBattleMonster[]; opp: ActiveBattleMonster[] } | null) => void;
  setLiveBattleBotAccuracy: (accuracy: number | undefined) => void;
  setView: (view: GuildView) => void;
  loadData: () => void;
}

export default function BattleViews({
  view,
  userId,
  questions,
  inventory,
  onUseItem,
  handleQuestionsAnswered,
  buildPlayerTeam,
  gold,
  onSpendGold,
  activeBattle,
  handleBattleEnd,
  pvpOpponentTeam,
  pvpOpponent,
  handlePvpBattleEnd,
  liveBattleId,
  liveBattleOpponent,
  liveBattleSide,
  liveBattleTeams,
  liveBattleBotAccuracy,
  liveBattleInbox,
  showNotification,
  onBattleWon,
  onProgressSynced,
  setLiveBattleId,
  setLiveBattleOpponent,
  setLiveBattleTeams,
  setLiveBattleBotAccuracy,
  setView,
  loadData,
}: BattleViewsProps) {
  return (
    <>
      {view === 'battle' && activeBattle && !pvpOpponentTeam && (
        <BattleScreen
          userId={userId}
          playerTeam={buildPlayerTeam()}
          trainer={activeBattle}
          questions={questions}
          gradingUserId={userId}
          inventory={inventory}
          onUseItem={onUseItem}
          gold={gold}
          onSpendGold={onSpendGold}
          onBattleEnd={handleBattleEnd}
          onQuestionsAnswered={handleQuestionsAnswered}
        />
      )}

      {/* Battle view — PvP */}
      {view === 'battle' && pvpOpponentTeam && pvpOpponent && (
        <BattleScreen
          userId={userId}
          playerTeam={buildPlayerTeam()}
          siblingTeam={pvpOpponentTeam}
          siblingName={pvpOpponent.name}
          questions={questions}
          gradingUserId={userId}
          inventory={inventory}
          onUseItem={onUseItem}
          gold={gold}
          onSpendGold={onSpendGold}
          onBattleEnd={handlePvpBattleEnd}
          onQuestionsAnswered={handleQuestionsAnswered}
        />
      )}

      {/* Battle view — Live PvP */}
      {view === 'live_battle' && liveBattleId && liveBattleOpponent && liveBattleTeams && (
        <LiveBattleScreen
          battleId={liveBattleId}
          myUserId={userId}
          opponentId={liveBattleOpponent.id}
          opponentName={liveBattleOpponent.name}
          side={liveBattleSide}
          myTeam={liveBattleTeams.mine}
          opponentTeam={liveBattleTeams.opp}
          botAccuracy={liveBattleBotAccuracy}
          questions={questions}
          gradingUserId={userId}
          inventory={inventory}
          onUseItem={onUseItem}
          gold={gold}
          onSpendGold={onSpendGold}
          onBattleResultKnown={(won) => {
            // Bot battles have no real inbox — skip the Supabase flash.
            if (!liveBattleBotAccuracy) liveBattleInbox.sendBattleResultFlash(won);
            liveBattleInbox.setInBattleStatus(false);
          }}
          onBattleEnd={(won) => {
            showNotification(won ? `🏆 Defeated ${liveBattleOpponent.name}!` : `💀 ${liveBattleOpponent.name} was too strong!`);
            if (won) {
              onBattleWon('sibling');
              // Bot battles: no Edge Function ran, so skip onProgressSynced()
              // (there's no server-side gold credit to resync).
              if (!liveBattleBotAccuracy) onProgressSynced();
            }
            setLiveBattleId(null);
            setLiveBattleOpponent(null);
            setLiveBattleTeams(null);
            setLiveBattleBotAccuracy(undefined);
            setView('trainers');
            loadData();
          }}
        />
      )}
    </>
  );
}
