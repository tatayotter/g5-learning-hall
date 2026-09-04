// components/monster/TrainersView.tsx
// Extracted from MonsterGuild.tsx's `view === 'trainers'` block (was ~205
// inline lines) — first slice of splitting that god component apart, same
// approach used on Dashboard.tsx (components/dashboard/*). No behavior
// change.
'use client';

import { getOtherPlayers, UserId, UserProfile } from '@/lib/userSession';
import { BOT_PROFILES } from '@/lib/botProfiles';
import { OnlinePlayer } from '@/hooks/useMapPresence';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import { NPC_TRAINERS, ALL_MONSTERS, MONSTERS, getCounterElement, NpcTrainer } from '@/lib/monsterConfig';
import { UserMonster } from '@/components/battle/shared';
import { BattleState } from '@/components/monster/types';
import GameButton from '@/components/GameButton';

type LiveBattleInbox = ReturnType<typeof useLiveBattleInbox>;

interface TrainersViewProps {
  userId: string;
  battleState: BattleState;
  playerLevel: number;
  userMonsters: UserMonster[];
  liveBattleInbox: LiveBattleInbox;
  botOnlinePlayers: Record<string, OnlinePlayer>;
  handleChallengePlayer: (opponentId: UserId, opponentName: string) => void;
  handleDummyBattle: () => void;
  handleTrainerBattle: (trainer: NpcTrainer) => void;
}

export default function TrainersView({
  userId,
  battleState,
  playerLevel,
  userMonsters,
  liveBattleInbox,
  botOnlinePlayers,
  handleChallengePlayer,
  handleDummyBattle,
  handleTrainerBattle,
}: TrainersViewProps) {
  return (
    <div className="space-y-4">
      {/* PvP — Challenge To A Battle */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const alreadyWonToday = battleState?.last_pvp_win === today;
        const realOnlinePlayers = getOtherPlayers(userId as UserId).filter(p => liveBattleInbox.onlinePlayerIds.has(p.id));
        // Bots (useBotPresence, above) wander the Training Map and are
        // always "online" for the session, but only ever got merged into
        // mergedMapPresence for the map's sprite/online-count — never
        // into this challenge list, so they were invisible here even
        // though handleChallengePlayer already has a full bot-battle
        // path (BOT_IDS.has(opponentId) branch). Listed first since
        // they're always challengeable (never mid-battle with someone
        // else — battles against them are purely local/per-session).
        const botPlayers: UserProfile[] = Object.values(botOnlinePlayers).map(b => {
          const profile = BOT_PROFILES.find(bp => bp.id === b.userId);
          return {
            id: b.userId, name: b.name, fullName: profile?.fullName ?? b.name,
            grade: profile?.grade ?? 'G5', avatar: b.userpic ?? '', theme: 'theme_default',
            gender: b.gender, isFamily: false, school: profile?.school,
          };
        });
        const otherPlayers = [...botPlayers, ...realOnlinePlayers];
        return (
          <div className="border-2 border-[#c9a87a] bg-[#f0ddb8] rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👊</span>
                <div>
                  <p className="font-bold text-[#2a1505]">Challenge To A Battle</p>
                  <p className="text-xs text-[#6b4820]">
                    Battle another player's team.
                    {alreadyWonToday
                      ? ' First win gold already claimed today — resets tomorrow.'
                      : ' First win today earns '}
                    {!alreadyWonToday && <span className="text-[#c9781a] font-bold">50 Gold</span>}
                    {!alreadyWonToday && '.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => liveBattleInbox.refreshPresence()}
                className="text-xs bg-white border border-[#c9a87a] hover:bg-[#f0ddb8] hover:border-[#c9781a] text-[#6b4820] font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                title="Refresh online list"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="space-y-2">
              {otherPlayers.length === 0 && (
                <p className="text-xs text-[#6b4820] italic">No one else is online right now.</p>
              )}
              {otherPlayers.map(player => {
                const inBattle = liveBattleInbox.playersInBattle.has(player.id);
                return (
                <div key={player.id} className="flex items-center justify-between gap-3 bg-white border border-[#c9a87a] rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={player.avatar || '/userpics/userpics_premium/ssb3.png'}
                      alt={player.name}
                      className="w-9 h-9 object-contain flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/userpics/userpics_premium/ssb3.png'; }}
                    />
                    <div className="min-w-0">
                      <p className="text-[#2a1505] text-sm font-bold truncate">{player.fullName}</p>
                      <p className="text-[#6b4820] text-xs">
                        {inBattle
                          ? `⚔️ ${player.name} is in a battle`
                          // Bots carry a real Philippine public school
                          // name (lib/botProfiles.ts) instead of
                          // "Classmate" so they read as an ordinary
                          // online player, not a simulated one.
                          : `${player.grade}${player.school ? ` · ${player.school}` : !player.isFamily ? ' · Classmate' : ''}`}
                      </p>
                    </div>
                  </div>
                  {/* flex-shrink-0 so a long name/school column truncates
                      (above) instead of squeezing this button — GameButton's
                      quest variant clips its own text with overflow:hidden,
                      so a compressed button silently cut off the "!" on
                      narrow mobile widths instead of wrapping/shrinking
                      gracefully. */}
                  <GameButton
                    variant="quest"
                    color="#2563eb"
                    onClick={() => handleChallengePlayer(player.id as UserId, player.name)}
                    disabled={inBattle}
                    className="flex-shrink-0 whitespace-nowrap"
                    style={{ fontSize: 13 }}
                  >
                    Challenge!
                  </GameButton>
                </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <h3 className="text-lg font-bold text-[#2a1505]">NPC Trainers</h3>
      {/* Was a fixed 3-column row (sprite | text | button) — on a narrow
          mobile width the middle column had to shrink to almost nothing,
          wrapping the name/description into a tall stack of skinny
          lines. Now: sprite+name+status stay in one compact header row
          at any width, the button moves below full-width on mobile and
          back inline on sm+ (duplicated, not conditionally re-labeled —
          a cheap, standard responsive pattern rather than JS breakpoint
          logic). */}
      <div className="p-5 rounded-2xl border-2 border-[#c9a87a] bg-[#f0ddb8]">
        <div className="flex items-center gap-4">
          <img
            src="/trainers/training_tester.png"
            alt="Training Dummy"
            className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 object-contain"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#2a1505]">Training Dummy</p>
            <p className="text-xs text-[#6b4820]">Always available · Matches your team</p>
          </div>
          <div className="hidden sm:block flex-shrink-0">
            <GameButton variant="quest" color="#2563eb" onClick={handleDummyBattle} style={{ fontSize: 13 }}>
              Battle!
            </GameButton>
          </div>
        </div>
        <p className="text-xs text-[#6b4820] italic mt-2">"No hard feelings — just here to help you practice."</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {userMonsters.filter(um => um.slot !== null).map((um, i) => {
            const def = ALL_MONSTERS[um.monster_id];
            const counterElement = getCounterElement(def.element);
            const counterMonster = Object.values(MONSTERS).find(m => m.element === counterElement);
            return (
              <span key={i} className="text-xs bg-white/70 border border-[#c9a87a] px-2 py-0.5 rounded text-[#3a2610]">
                {counterMonster?.name || def.name} Lv.{um.monster_level}
              </span>
            );
          })}
        </div>
        <div className="sm:hidden mt-3">
          <GameButton variant="quest" color="#2563eb" onClick={handleDummyBattle} className="w-full" style={{ fontSize: 13 }}>
            Battle!
          </GameButton>
        </div>
      </div>
      {NPC_TRAINERS.map(trainer => {
        const defeated = battleState.defeated_trainers.includes(trainer.id);
        const locked = playerLevel < trainer.levelRequirement;
        return (
          <div
            key={trainer.id}
            className={`p-5 rounded-2xl border-2 ${
              defeated ? 'border-green-700 bg-[#e8f5e0]' :
              locked   ? 'border-[#c9a87a] bg-[#e8d0a0]/60 opacity-60' :
                         'border-[#c9a87a] bg-[#f0ddb8]'
            }`}
          >
            <div className="flex items-center gap-4">
              <img
                src={trainer.spriteOverride ?? `/trainers/${trainer.id}.png`}
                alt={trainer.name}
                className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 object-contain"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#2a1505]">{trainer.name}</p>
                <p className="text-xs text-[#6b4820] capitalize">{trainer.element} · Requires Level {trainer.levelRequirement}</p>
              </div>
              {/* Defeated/locked are short status text — fine inline at
                  any width. Only the real Battle! CTA needs the
                  duplicated-below-on-mobile treatment. */}
              {(defeated || locked) && (
                <div className="flex-shrink-0">
                  {defeated
                    ? <span className="text-green-700 text-sm font-bold">✅ Defeated</span>
                    : <span className="text-[#6b4820] text-sm">🔒 Locked</span>}
                </div>
              )}
              {!defeated && !locked && (
                <div className="hidden sm:block flex-shrink-0">
                  <GameButton variant="quest" color="#2563eb" onClick={() => handleTrainerBattle(trainer)} style={{ fontSize: 13 }}>
                    Battle!
                  </GameButton>
                </div>
              )}
            </div>
            <p className="text-xs text-[#6b4820] italic mt-2">"{trainer.intro}"</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {trainer.monsters.map((tm, i) => (
                <span key={i} className="text-xs bg-white/70 border border-[#c9a87a] px-2 py-0.5 rounded text-[#3a2610]">
                  {ALL_MONSTERS[tm.monsterId]?.name} Lv.{tm.level}
                </span>
              ))}
            </div>
            {!defeated && !locked && (
              <div className="sm:hidden mt-3">
                <GameButton variant="quest" color="#2563eb" onClick={() => handleTrainerBattle(trainer)} className="w-full" style={{ fontSize: 13 }}>
                  Battle!
                </GameButton>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
