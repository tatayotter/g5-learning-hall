'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { playMonsterAppear, playChime, playClash, playFootstepGrass, playFootstepTown, playWallBump } from '@/lib/sounds';
import { USERS } from '@/lib/userSession';
import { useMapPresence } from '@/hooks/useMapPresence';
import PlayerStatsPopup from '@/components/PlayerStatsPopup';
import {
  MonsterDef, BATTLE_CONSTANTS, getScaledStats, getMonsterLevel,
  getWildEncounterChance, getWildEncounterPityThreshold,
} from '@/lib/monsterConfig';
import { MonsterImage, BattleQuestionModal, GMBadge, UserMonster } from '@/components/battle/shared';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import MapStage from '@/components/MapStage';
import { REGIONS } from '@/lib/regions';
import { CaughtMonster, BattleState } from '@/components/monster/types';

const MAP_SIZE = 16;

type TileType = 'grass' | 'town' | 'wall';

interface MapTile {
  type: TileType;
}

// Build the map grid
function buildMap(): MapTile[][] {
  const map: MapTile[][] = Array.from({ length: MAP_SIZE }, () =>
    Array.from({ length: MAP_SIZE }, () => ({ type: 'grass' as TileType }))
  );

  // Town (safe zone) in top-left corner
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      map[y][x] = { type: 'town' };
    }
  }

  // Walls around edges
  for (let i = 0; i < MAP_SIZE; i++) {
    map[0][i] = { type: 'wall' };
    map[MAP_SIZE - 1][i] = { type: 'wall' };
    map[i][0] = { type: 'wall' };
    map[i][MAP_SIZE - 1] = { type: 'wall' };
  }

  return map;
}

// The training map is a single painted background image (public/maps/map-1.webp)
// with an invisible logical grid overlaid for walkability + markers. The grid and
// all positioning are percentage-based (not fixed pixels) so the whole map scales
// fluidly to any container width — no horizontal scrolling on mobile/small desktops.
const MAP_IMAGE = '/maps/ledgers_heart.webp';
const TILE_PCT = 100 / MAP_SIZE;

function TownMarker() {
  return (
    <img
      src="/items/health_potion_l_100.webp"
      alt="Town — heals your team"
      title="Town — heals your team"
      className="w-8 h-8 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
    />
  );
}

function PlayerSprite({ userId, isSelf = false, inBattle = false, resultWon }: {
  userId: string;
  isSelf?: boolean;
  inBattle?: boolean;
  resultWon?: boolean;
}) {
  const profile = USERS[userId];
  // A chosen userpic (full-body trainer sprite) doubles as the map sprite;
  // the default headshot avatars (avatar.png / tala-avatar.png) don't fit
  // that role, so those still fall back to the generic gender sprite.
  const src = profile?.avatar?.startsWith('/userpics/')
    ? profile.avatar
    : profile?.gender === 'girl' ? '/sprite/girl1.webp' : '/sprite/boy1.webp';

  return (
    <div className="relative w-full h-full">
      {inBattle && (
        <span
          className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm z-10 animate-pulse drop-shadow"
          title={`${profile?.name ?? 'This player'} is in a battle`}
        >
          ⚔️
        </span>
      )}
      {!inBattle && resultWon !== undefined && (
        <span
          className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 drop-shadow"
          title={resultWon ? `${profile?.name ?? 'They'} won their battle!` : `${profile?.name ?? 'They'} lost their battle`}
        >
          <img src={resultWon ? '/icons/stats/victory.svg' : '/icons/stats/defeat.svg'} alt={resultWon ? 'Won' : 'Lost'} className="w-4 h-4 object-contain" />
        </span>
      )}
      <div className={`absolute left-1/2 bottom-0 -translate-x-1/2 w-6 h-2 rounded-full ${isSelf ? 'bg-amber-400/60' : 'bg-black/25'}`}/>
      <img
        src={src}
        alt="Player"
        className="relative w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

interface TrainingMapProps {
  userId: string;
  battleState: BattleState;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  questions: any[];
  onBattleStateChange: (state: BattleState) => void;
  onMonsterExpGained: (monsterId: string, exp: number) => void;
  onHeal: () => void;
  onQuestionsAnswered?: (questions: any[]) => void;
  onWildEncounterRoll?: () => void;
  onChallengePlayer?: (targetId: string, name: string) => void;
  liveBattleInbox?: ReturnType<typeof useLiveBattleInbox>;
  mapPresence: ReturnType<typeof useMapPresence>;
  movementLocked?: boolean;
  walkLockActive?: boolean;
  monsterDisplay: Record<string, MonsterDef>;
  // World Map region — 'ledgers_heart' (or omitted) is the original single
  // map: unfiltered encounters, position persisted to user_battle_state.
  // Any other region id uses its own hand-authored layout/background and a
  // fixed spawn point tracked in local state only (never written to the DB).
  regionId?: string;
  onExitRegion?: () => void;
  // Mobile-fullscreen-only "✕" affordance (see MapStage) — the sub-tab bar
  // (World Map/My Team/Trainers/...) is still in the DOM on mobile but
  // painted over entirely by the fullscreen map, so there's otherwise no way
  // back to it at all.
  onExitToMenu?: () => void;
}

export default function TrainingMap({
  userId, battleState, userMonsters, caughtMonsters, questions,
  onBattleStateChange, onMonsterExpGained, onHeal, onQuestionsAnswered, onWildEncounterRoll, onChallengePlayer,
  liveBattleInbox, mapPresence, movementLocked, walkLockActive, monsterDisplay,
  regionId, onExitRegion, onExitToMenu,
}: TrainingMapProps) {
  const [grassQuestion, setGrassQuestion] = useState(false);
  const [statsTargetId, setStatsTargetId] = useState<string | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [infoTab, setInfoTab] = useState<'team' | 'online' | 'legend' | 'tips'>('team');
  const [stepping, setStepping] = useState(false);
  const [bumping, setBumping] = useState(false);
  const [dustPuffs, setDustPuffs] = useState<{ id: number; x: number; y: number }[]>([]);
  const dustIdRef = useRef(0);
  const isLedgersHeart = !regionId || regionId === 'ledgers_heart';
  const region = !isLedgersHeart ? REGIONS[regionId!] : null;
  const map = isLedgersHeart ? buildMap() : region!.layout;
  const mapImageSrc = isLedgersHeart ? MAP_IMAGE : region!.mapImage;
  // Elemental regions always start at their fixed spawn point and never
  // persist position — this local state naturally resets on region re-entry
  // since TrainingMap remounts when regionId changes.
  const [localPos, setLocalPos] = useState(() => region?.spawn ?? { x: 1, y: 1 });
  const posX = isLedgersHeart ? battleState.map_x : localPos.x;
  const posY = isLedgersHeart ? battleState.map_y : localPos.y;
  const activeMonster = userMonsters.find(m => m.slot === battleState.active_monster_slot);
  const selfProfile = USERS[userId];
  const { onlinePlayers, waves, stickers, sendWave, sendSticker } = mapPresence;

  // Restarts a CSS keyframe animation on repeat triggers (toggling the same
  // boolean twice in a row wouldn't otherwise re-fire the animation).
  const pulse = (setter: (v: boolean) => void) => {
    setter(false);
    requestAnimationFrame(() => setter(true));
  };

  const move = useCallback(async (dx: number, dy: number) => {
    if (movementLocked) return;
    const newX = posX + dx;
    const newY = posY + dy;
    if (newX < 0 || newX >= MAP_SIZE || newY < 0 || newY >= MAP_SIZE) {
      playWallBump();
      pulse(setBumping);
      return;
    }

    const tile = map[newY][newX];
    if (tile.type === 'wall') {
      playWallBump();
      pulse(setBumping);
      return;
    }

    if (tile.type === 'town') {
      playFootstepTown();
    } else {
      playFootstepGrass();
      const puffId = dustIdRef.current++;
      setDustPuffs(prev => [...prev, { id: puffId, x: newX, y: newY }]);
      setTimeout(() => setDustPuffs(prev => prev.filter(p => p.id !== puffId)), 450);
    }
    pulse(setStepping);

    if (isLedgersHeart) {
      const newState = { ...battleState, map_x: newX, map_y: newY };
      onBattleStateChange(newState);
      await supabase.from('user_battle_state')
        .update({ map_x: newX, map_y: newY, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else {
      setLocalPos({ x: newX, y: newY });
    }

    if (tile.type === 'grass' && Math.random() < 0.4) {
      playMonsterAppear();
      setGrassQuestion(true);
    } else if (tile.type === 'town') {
      onHeal();
    }
  }, [posX, posY, map, userId, onBattleStateChange, onHeal, movementLocked, isLedgersHeart, battleState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (grassQuestion || movementLocked) return;
      if (e.key === 'ArrowUp')    move(0, -1);
      if (e.key === 'ArrowDown')  move(0,  1);
      if (e.key === 'ArrowLeft')  move(-1, 0);
      if (e.key === 'ArrowRight') move(1,  0);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move, grassQuestion, movementLocked]);

  const handleGrassAnswer = async (correctCount: number, answeredQuestions: any[]) => {
    setGrassQuestion(false);
    if (correctCount > 0) playChime(); else playClash();
    onQuestionsAnswered?.(answeredQuestions);
    if (correctCount > 0 && activeMonster) {
      const expGain = BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER;
      onMonsterExpGained(activeMonster.id, expGain);
      const newExp = activeMonster.monster_exp + expGain;
      await supabase.from('user_monsters')
        .update({ monster_exp: newExp, monster_level: getMonsterLevel(newExp) })
        .eq('id', activeMonster.id);
    }
    // Daily checklist's "training map" item is satisfied by any correct grass
    // question — it no longer requires actually winning a wild encounter battle.
    const stateUpdates: Partial<BattleState> = {};
    if (correctCount > 0) {
      stateUpdates.last_wild_encounter_win = new Date().toISOString().split('T')[0];
    }

    // Rare wild-monster encounter roll — once per individual question answered,
    // regardless of whether it was answered correctly. Odds rise the more
    // NPC trainers the player has defeated (see getWildEncounterChance).
    const wildEncounterChance = getWildEncounterChance(battleState.defeated_trainers.length);
    let encountered = answeredQuestions.some(() => Math.random() < wildEncounterChance);

    // Pity timer: below 2 defeated NPC trainers, odds stay exactly as rolled
    // above. From 2 trainers onward, an encounter is forced once enough
    // correctly-answered questions pass without one occurring naturally — the
    // fewer monsters the player owns, the sooner the guarantee kicks in (see
    // getWildEncounterPityThreshold).
    let questionsSinceEncounter = battleState.questions_since_wild_encounter + correctCount;
    if (!encountered && battleState.defeated_trainers.length >= 2) {
      const totalMonstersOwned = userMonsters.length + caughtMonsters.length;
      const pityThreshold = getWildEncounterPityThreshold(totalMonstersOwned);
      if (pityThreshold !== null && questionsSinceEncounter >= pityThreshold) {
        encountered = true;
      }
    }
    questionsSinceEncounter = encountered ? 0 : questionsSinceEncounter;
    stateUpdates.questions_since_wild_encounter = questionsSinceEncounter;

    await supabase.from('user_battle_state').update(stateUpdates).eq('user_id', userId);
    onBattleStateChange({ ...battleState, ...stateUpdates });

    if (encountered) onWildEncounterRoll?.();
  };

  const leftTag = (
    <span className="flex items-center gap-1.5">
      {onExitRegion && (
        <button onClick={onExitRegion} className="hover:text-amber-400" title="Back to World Map">←</button>
      )}
      {isLedgersHeart ? REGIONS.ledgers_heart.name : region!.name}
    </span>
  );

  // Map — single painted background image with a percentage-based
  // walkability grid on top, filling MapStage's 16:9 frame exactly (every
  // position on the grid is expressed in % rather than fixed pixels, so it
  // scales cleanly with the frame regardless of its rendered size).
  const frameContent = (
    <div
      className={`relative w-full h-full ${bumping ? 'map-bump-shake' : ''}`}
      style={{ backgroundImage: `url(${mapImageSrc})`, backgroundSize: '100% 100%' }}
    >
      <div
        className="absolute inset-0 grid gap-0"
        style={{ gridTemplateColumns: `repeat(${MAP_SIZE}, 1fr)`, gridTemplateRows: `repeat(${MAP_SIZE}, 1fr)` }}
      >
        {map.map((row, y) =>
          row.map((tile, x) => {
            const isTownMarkerTile = isLedgersHeart
              ? x === 1 && y === 1
              : x === region!.townCenter.x && y === region!.townCenter.y;
            return (
              <div key={`${x}-${y}`} className="flex items-center justify-center" title={tile.type}>
                {tile.type === 'town' && isTownMarkerTile && <TownMarker />}
              </div>
            );
          })
        )}
      </div>
      <div
        className="absolute pointer-events-none transition-[left,top] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center"
        style={{
          left: `${posX * TILE_PCT}%`, top: `${posY * TILE_PCT}%`,
          width: `${TILE_PCT}%`, height: `${TILE_PCT}%`,
        }}
      >
        <div className="w-full h-full flex items-center justify-center relative">
          {waves[userId] && <span className="absolute -top-5 text-xl animate-bounce">👋</span>}
          {stickers[userId] && (
            <div className="absolute -top-8 bg-white text-black text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow">
              {stickers[userId].text}
            </div>
          )}
          <div className={`w-[120%] h-[120%] ${stepping ? 'map-step-bounce' : ''}`}>
            <PlayerSprite
              userId={userId}
              isSelf
              inBattle={liveBattleInbox?.playersInBattle.has(userId) ?? false}
              resultWon={liveBattleInbox?.battleResultFlashes[userId]}
            />
          </div>
          <p className="absolute -bottom-4 flex items-center gap-1 text-[10px] map-name-tag bg-black/60 px-1 rounded whitespace-nowrap">
            {selfProfile?.name || userId}
            {selfProfile?.isFamily && <GMBadge />}
          </p>
        </div>
      </div>

      {/* Footstep dust puffs on grass */}
      {dustPuffs.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none map-dust-puff"
          style={{
            left: `${(p.x + 0.5) * TILE_PCT}%`, top: `${(p.y + 0.8) * TILE_PCT}%`,
            width: '10px', height: '10px', borderRadius: '9999px',
            background: 'radial-gradient(circle, rgba(214,196,150,0.9), rgba(214,196,150,0))',
          }}
        />
      ))}

      {/* Other online players */}
      {Object.values(onlinePlayers).map(p => (
        <div
          key={p.userId}
          className="absolute transition-[left,top] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer flex items-center justify-center"
          style={{ left: `${p.x * TILE_PCT}%`, top: `${p.y * TILE_PCT}%`, width: `${TILE_PCT}%`, height: `${TILE_PCT}%` }}
          onClick={() => setStatsTargetId(p.userId)}
          title={USERS[p.userId]?.name || p.name}
        >
          <div className="w-full h-full flex items-center justify-center relative">
            {waves[p.userId] && <span className="absolute -top-5 text-xl animate-bounce">👋</span>}
            {stickers[p.userId] && (
              <div className="absolute -top-8 bg-white text-black text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow">
                {stickers[p.userId].text}
              </div>
            )}
            <div className="w-[120%] h-[120%]">
              <PlayerSprite
                userId={p.userId}
                inBattle={liveBattleInbox?.playersInBattle.has(p.userId) ?? false}
                resultWon={liveBattleInbox?.battleResultFlashes[p.userId]}
              />
            </div>
            <p className="absolute -bottom-4 flex items-center gap-1 text-[10px] map-name-tag bg-black/60 px-1 rounded whitespace-nowrap">
              {USERS[p.userId]?.name || p.name}
              {USERS[p.userId]?.isFamily && <GMBadge />}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  // Movement + chat controls overlaid directly on the map (bottom-left
  // corner of the frame) instead of living outside it in a separate row —
  // desktop still also has arrow-key support via the keydown listener above.
  const controls = (
    <div className="flex items-end gap-2">
      <div>
        <div className={`mstage-dpad ${movementLocked ? 'opacity-40' : ''}`}>
          <div />
          <button disabled={movementLocked} onClick={() => move(0, -1)} className="bg-black/60 hover:bg-black/80 rounded text-white text-xs disabled:cursor-not-allowed">▲</button>
          <div />
          <button disabled={movementLocked} onClick={() => move(-1, 0)} className="bg-black/60 hover:bg-black/80 rounded text-white text-xs disabled:cursor-not-allowed">◀</button>
          <div className="bg-black/30 rounded" />
          <button disabled={movementLocked} onClick={() => move(1, 0)}  className="bg-black/60 hover:bg-black/80 rounded text-white text-xs disabled:cursor-not-allowed">▶</button>
          <div />
          <button disabled={movementLocked} onClick={() => move(0, 1)}  className="bg-black/60 hover:bg-black/80 rounded text-white text-xs disabled:cursor-not-allowed">▼</button>
          <div />
        </div>
        {walkLockActive && <p className="text-[9px] text-amber-400 mt-0.5 text-center">⏳ wait...</p>}
      </div>

      <div className="relative">
        <button
          onClick={() => setStickerPickerOpen(v => !v)}
          className="w-[30px] h-[30px] bg-black/60 hover:bg-black/80 rounded text-white text-sm flex items-center justify-center"
        >
          💬
        </button>
        {stickerPickerOpen && (
          <div className="absolute z-10 bottom-full mb-2 left-0 bg-neutral-900 border border-neutral-700 rounded-lg p-2 w-40 space-y-1">
            {['Need help!', "Let's battle!", 'Grinding EXP 💪', 'Almost there!'].map(text => (
              <button
                key={text}
                onClick={() => { sendSticker(text); setStickerPickerOpen(false); }}
                className="w-full text-left text-xs text-white hover:bg-neutral-800 rounded px-2 py-1"
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Info drawer — Team/Online/Legend/Tips used to be four permanent side
  // cards; tabbed here instead since the drawer (like the battle log) is
  // deliberately compact and hidden by default.
  const drawer = (
    <div>
      <div className="flex gap-1 mb-2">
        {([
          { id: 'team' as const, label: 'Team' },
          { id: 'online' as const, label: `Online (${Object.keys(onlinePlayers).length})` },
          { id: 'legend' as const, label: 'Legend' },
          { id: 'tips' as const, label: 'Tips' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setInfoTab(tab.id)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-1 transition-colors ${
              infoTab === tab.id
                ? 'bg-amber-900/30 text-amber-400 border border-amber-800'
                : 'bg-neutral-900 text-gray-500 border border-neutral-800 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {infoTab === 'team' && (
        userMonsters.filter(m => m.slot !== null).length === 0 ? (
          <p className="text-gray-500 text-xs">No curios on your team</p>
        ) : (
          <div className="space-y-2">
            {userMonsters
              .filter(m => m.slot !== null)
              .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
              .map(monster => {
                const def = monsterDisplay[monster.monster_id];
                const isActive = monster.slot === battleState.active_monster_slot;
                const expIntoLevel = monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL;
                const expToNext = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - expIntoLevel;
                const scaled = getScaledStats(def, monster.monster_level);
                return (
                  <div
                    key={monster.id}
                    className={`rounded-lg p-2 ${isActive ? 'border border-amber-700 bg-amber-900/10' : 'border border-neutral-800 bg-neutral-900'}`}
                  >
                    <div className="flex items-center gap-2">
                      <MonsterImage monster={def} className="w-9 h-9 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs truncate">
                          {def?.name}
                          {isActive && <span className="ml-1.5 text-[9px] text-amber-400 font-bold uppercase tracking-wide">Active</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 capitalize">Lv.{monster.monster_level} · {def?.element}</p>
                        <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                          <div className="h-1 rounded-full bg-amber-400" style={{ width: `${(expIntoLevel / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }} />
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 space-y-0.5 flex-shrink-0">
                        <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.hp}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.attack}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.speed}</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                  </div>
                );
              })}
          </div>
        )
      )}

      {infoTab === 'online' && (
        Object.keys(onlinePlayers).length === 0 ? (
          <p className="text-gray-600 text-xs">No one else is on the map right now.</p>
        ) : (
          <div className="space-y-1.5">
            {Object.values(onlinePlayers)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <button
                  key={p.userId}
                  onClick={() => setStatsTargetId(p.userId)}
                  className="w-full flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-amber-500 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-white text-xs font-medium truncate">
                    {USERS[p.userId]?.name || p.name}
                  </span>
                  {USERS[p.userId]?.isFamily && <GMBadge />}
                  <span className="text-[10px] text-gray-500 ml-auto">{USERS[p.userId]?.grade}</span>
                </button>
              ))}
          </div>
        )
      )}

      {infoTab === 'legend' && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span>🟩</span>
            <div>
              <p className="text-white font-medium">Grass</p>
              <p className="text-[10px] text-gray-400">40% chance to trigger a training question. Answer correctly for +{BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} monster EXP.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>🏠</span>
            <div>
              <p className="text-white font-medium">Town</p>
              <p className="text-[10px] text-gray-400">Safe zone. Walking here heals your full team.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>🧒</span>
            <div>
              <p className="text-white font-medium">You</p>
              <p className="text-[10px] text-gray-400">Your current position on the map.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>🟢</span>
            <div>
              <p className="text-white font-medium">Other players</p>
              <p className="text-[10px] text-gray-400">Tap a player on the map or in the roster to view their stats or wave.</p>
            </div>
          </div>
        </div>
      )}

      {infoTab === 'tips' && (
        <div className="space-y-1.5 text-[11px] text-gray-400">
          <p>⌨️ Use <span className="text-white font-bold">arrow keys</span> or the on-map buttons to move.</p>
          <p>🌿 Walk through <span className="text-white font-bold">grass tiles</span> repeatedly to grind curio EXP.</p>
          <p>⚔️ Curio reaches <span className="text-white font-bold">Lv.5</span> to unlock Tier 2 skill, <span className="text-white font-bold">Lv.10</span> for Tier 3.</p>
          <p>🏠 Return to <span className="text-white font-bold">town</span> to heal before challenging a trainer.</p>
          <p>💡 Defeat trainers in order from the <span className="text-white font-bold">Trainers</span> tab — each one gets harder and requires a higher player level.</p>
        </div>
      )}
    </div>
  );

  const overlay = grassQuestion ? (
    <div className="w-full max-w-xl bg-neutral-900 border border-emerald-700 rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in">
      <div className="flex items-center gap-3 mb-3 bg-emerald-900/30 border border-emerald-800 rounded-xl px-3 py-2">
        {activeMonster && (
          <MonsterImage monster={monsterDisplay[activeMonster.monster_id]} className="w-10 h-10 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">
            {activeMonster ? monsterDisplay[activeMonster.monster_id]?.name : 'Your monster'} is practicing!
          </p>
          <p className="text-xs text-gray-300 leading-tight">
            Answer correctly → <span className="text-amber-400 font-bold">+{BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} EXP</span>
            {activeMonster && (() => {
              const expToNext = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (activeMonster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL);
              return <span className="text-gray-500 text-[11px] ml-1">({expToNext} to next level)</span>;
            })()}
          </p>
        </div>
      </div>
      <BattleQuestionModal
        questions={questions}
        count={1}
        embedded={true}
        onComplete={handleGrassAnswer}
      />
    </div>
  ) : null;

  return (
    <>
      <MapStage
        leftTag={leftTag}
        rightTag={`🟢 ${Object.keys(onlinePlayers).length}`}
        frame={frameContent}
        controls={controls}
        drawerLabel="Info"
        drawer={drawer}
        overlay={overlay}
        onExit={onExitToMenu}
      />

      {statsTargetId && (
        <PlayerStatsPopup
          targetId={statsTargetId}
          onClose={() => setStatsTargetId(null)}
          onWave={sendWave}
          onChallenge={onChallengePlayer}
          targetInBattle={liveBattleInbox?.playersInBattle.has(statsTargetId) ?? false}
        />
      )}
    </>
  );
}
