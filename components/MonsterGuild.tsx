'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { playAttackWhoosh, playHitThud, playMiss, playVictory, playDefeat, playFootstepGrass, playFootstepTown, playWallBump, playMonsterAppear, playChime, playClash } from '@/lib/sounds';
import { logAction } from '@/lib/playerlog';
import { getOtherPlayers, UserId, USERS } from '@/lib/userSession';
import { useMapPresence } from '@/hooks/useMapPresence';
import PlayerStatsPopup from '@/components/PlayerStatsPopup';
import WildEncounterModal from '@/components/WildEncounterModal';
import {
  MONSTERS, WILD_MONSTERS, ALL_MONSTERS, NPC_TRAINERS, SKILLS, BATTLE_CONSTANTS,
  getUnlockedMonsterSlots, getAvailableSkillTiers, calculateDamage, getScaledStats,
  getMonsterLevel, REST_BY_ELEMENT, ELEMENT_STATUS, STATUS_DEFINITIONS, getCounterElement,
  pickRandomWildMonsterId, getWildEncounterChance,
  Element, StatusEffect, NpcTrainer, MonsterDef, TrainerMonster,
} from '@/lib/monsterConfig';
import { fetchInventory, useInventoryItem, SHOP_CATALOG } from '@/lib/inventory';
import {
  hashQuestionId, arenaQuestionText,
  fetchAnsweredArenaQuestionIds, markArenaQuestionsCompleted, resetArenaHistory,
  fetchQuestionPool, markQuestionsCompleted,
} from '@/lib/guildEngine';
import {
  UserMonster, ActiveBattleMonster, MonsterImage, BattleQuestionModal,
} from '@/components/battle/shared';
import LiveBattleScreen from '@/components/LiveBattleScreen';
import PostBattleSummary from '@/components/battle/PostBattleSummary';
import LeaderboardPanel from '@/components/LeaderboardPanel';
import InfoTag from '@/components/InfoTag';
import { createInvite, fetchLiveBattle } from '@/lib/liveBattle';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CaughtMonster {
  id: string;
  user_id: string;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  monster_exp: number;
  caught_at: string;
}

interface BattleState {
  id: string;
  user_id: string;
  map_x: number;
  map_y: number;
  defeated_trainers: string[];
  seen_monsters: string[];
  active_monster_slot: number;
  last_sibling_battle: string | null;
  last_pvp_win: string | null;
  last_wild_encounter_win: string | null;
}

interface MonsterGuildProps {
  userId: string;
  playerLevel: number;
  packageData: any;
  liveBattleInbox: ReturnType<typeof useLiveBattleInbox>;
  pendingLiveBattleId: string | null;
  onConsumePendingLiveBattle: () => void;
  onBattleWon: (kind: 'trainer' | 'sibling' | 'dummy') => void;
}

// ─── MAP CONFIG ───────────────────────────────────────────────────────────────

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
const MAP_IMAGE = '/maps/map-1.webp';
const TILE_PCT = 100 / MAP_SIZE;

function TownMarker() {
  return (
    <div
      className="w-7 h-7 rounded-full bg-sky-900/70 border-2 border-sky-300 flex items-center justify-center text-sm shadow"
      title="Town — heals your team"
    >
      🏠
    </div>
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
          className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm z-10 drop-shadow"
          title={resultWon ? `${profile?.name ?? 'They'} won their battle!` : `${profile?.name ?? 'They'} lost their battle`}
        >
          {resultWon ? '🏆' : '💀'}
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

// Perk badge for Tatay's kids — Damien and Tala are always USERS[id].isFamily.
export function GMBadge() {
  return <span title="GM" className="text-xs leading-none">👑</span>;
}

// ─── QUESTION HELPERS ─────────────────────────────────────────────────────────

function extractQuestions(packageData: any): any[] {
  if (!packageData) return [];
  const questions: any[] = [];
  Object.values(packageData).forEach((day: any) => {
    if (typeof day === 'object' && day !== null) {
      Object.values(day).forEach((subject: any) => {
        if (subject?.quiz) {
          questions.push(...subject.quiz);
        } else if (subject?.questions) {
          questions.push(...subject.questions);
        }
      });
    }
  });
  return questions;
}

// ─── BATTLE SCREEN ────────────────────────────────────────────────────────────

interface BattleScreenProps {
  userId: string;
  playerTeam: ActiveBattleMonster[];
  trainer?: NpcTrainer;
  siblingTeam?: ActiveBattleMonster[];
  siblingName?: string;
  questions: any[];
  inventory: Record<string, number>;
  onUseItem: (key: string) => Promise<boolean>;
  onBattleEnd: (won: boolean, expEarned: number) => void;
  onQuestionsAnswered?: (questions: any[]) => void;
}

function BattleScreen({ userId, playerTeam, trainer, siblingTeam, siblingName, questions, inventory, onUseItem, onBattleEnd, onQuestionsAnswered }: BattleScreenProps) {
  const opponentName = trainer?.name || siblingName || 'Sibling';
  const opponentTeam = siblingTeam || trainer?.monsters.map((tm: any) => {
    const def = ALL_MONSTERS[tm.monsterId];
    const hp = getScaledStats(def, tm.level).hp;
    return { def, level: tm.level, currentHp: hp, maxHp: hp, status: null, statusTurns: 0, restUsed: 0 };
  }) || [];
  const [playerMonsterIdx, setPlayerMonsterIdx] = useState(0);
  const [npcMonsterIdx, setNpcMonsterIdx] = useState(0);
  const [playerMonsters, setPlayerMonsters] = useState<ActiveBattleMonster[]>(playerTeam);
  const [npcMonsters, setNpcMonsters] = useState<ActiveBattleMonster[]>(opponentTeam);
  const [log, setLog] = useState<string[]>([`Battle started against ${opponentName}!`]);
  const [phase, setPhase] = useState<'select_skill' | 'select_item' | 'select_switch' | 'answering' | 'npc_turn' | 'ended'>('select_skill');
  const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [expEarned, setExpEarned] = useState(0);
  const [playerAnim, setPlayerAnim] = useState('');
  const [npcAnim, setNpcAnim] = useState('');
  const [attackMessage, setAttackMessage] = useState<string | null>(null);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [battleResult, setBattleResult] = useState<{ won: boolean; exp: number; reason: 'ko' | 'surrender' } | null>(null);
  const [itemBusy, setItemBusy] = useState(false);
  const itemBusyRef = useRef(false);
  const battleMusicRef = useRef<HTMLAudioElement | null>(null);

  const playerMon = playerMonsters[playerMonsterIdx];
  const npcMon = npcMonsters[npcMonsterIdx];

  // Mirrors of the latest committed state, read by doNpcTurn's setTimeout callback
  // so it never has to nest a setState call inside another setState's updater.
  const playerMonstersRef = useRef(playerMonsters);
  playerMonstersRef.current = playerMonsters;
  const npcMonstersRef = useRef(npcMonsters);
  npcMonstersRef.current = npcMonsters;
  // A manual monster switch changes playerMonsterIdx and calls doNpcTurn() in
  // the same tick — doNpcTurn's setTimeout closure would otherwise capture the
  // pre-switch index (state updates aren't visible until the next render), so
  // the NPC's counter-attack could land on the just-benched monster instead.
  const playerMonsterIdxRef = useRef(playerMonsterIdx);
  playerMonsterIdxRef.current = playerMonsterIdx;

  useEffect(() => {
    const audio = new Audio('/sounds/battle-theme.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audio.play().catch(() => {});
    battleMusicRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev.slice(0, 6)]);

  const triggerAnim = (target: 'player' | 'npc', anim: string) => {
    if (target === 'player') {
      setPlayerAnim('');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPlayerAnim(anim);
          setTimeout(() => setPlayerAnim(''), 600);
        });
      });
    } else {
      setNpcAnim('');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNpcAnim(anim);
          setTimeout(() => setNpcAnim(''), 600);
        });
      });
    }
  };

  const applyStatusTick = (mon: ActiveBattleMonster): [ActiveBattleMonster, string[]] => {
    const msgs: string[] = [];
    let updated = { ...mon };
    if (updated.status === 'burn') {
      updated.currentHp = Math.max(0, updated.currentHp - BATTLE_CONSTANTS.BURN_DAMAGE_PER_TURN);
      msgs.push(`${updated.def.name} takes ${BATTLE_CONSTANTS.BURN_DAMAGE_PER_TURN} burn damage!`);
    }
    if (updated.statusTurns > 0) {
      updated.statusTurns--;
      if (updated.statusTurns === 0 && updated.status !== 'burn' && updated.status !== 'paralyze') {
        msgs.push(`${updated.def.name}'s ${updated.status} wore off!`);
        updated.status = null;
      }
    }
    return [updated, msgs];
  };

  // Shared by doNpcTurn's normal counter-attack and handleQuestionsComplete's
  // speed-preemption check below, so the tier/defense/def_boost math can't
  // drift between the two call sites.
  const computeNpcDamage = (attacker: ActiveBattleMonster, defender: ActiveBattleMonster): number => {
    const tier = attacker.level >= 15 ? 3 : attacker.level >= 8 ? 2 : 1;
    let dmg = BATTLE_CONSTANTS.NPC_DAMAGE_BY_TIER[tier as 1|2|3];
    dmg *= 100 / (100 + getScaledStats(defender.def, defender.level).defense);
    if (defender.status === 'def_boost') dmg /= 2;
    return Math.round(dmg);
  };

  const handleSkillSelect = (skillId: string) => {
    const skill = SKILLS[skillId];
    if (!skill) return;
    setPendingSkillId(skillId);
    setQuestionCount(skill.questionCount);
    setPhase('answering');
  };

  const handleRest = () => {
    const restConfig = REST_BY_ELEMENT[playerMon.def.element];
    if (playerMon.restUsed >= restConfig.maxUsesPerBattle) {
      addLog('Rest already used maximum times!');
      return;
    }
    const healAmount = Math.round(playerMon.maxHp * restConfig.hpRestorePercent);
    const newHp = Math.min(playerMon.maxHp, playerMon.currentHp + healAmount);
    const updated = playerMonsters.map((m, i) =>
      i === playerMonsterIdx ? { ...m, currentHp: newHp, restUsed: m.restUsed + 1 } : m
    );
    setPlayerMonsters(updated);
    addLog(`${playerMon.def.name} used Rest and restored ${healAmount} HP!`);
    doNpcTurn();
  };

  const handleItemUse = async (key: string) => {
    // onUseItem is an async DB round-trip — without this guard, clicking the
    // same (or another) item several times before it resolves fires the item
    // multiple times in a single turn instead of once. The ref (not just
    // itemBusy state) makes the guard effective immediately, since a state
    // update isn't guaranteed to have committed before the next click event.
    // Stays true through the 500ms npc_turn hand-off below too, so a second
    // click can't sneak in during that window either.
    if (itemBusyRef.current) return;
    const item = SHOP_CATALOG.find(i => i.key === key);
    if (!item) return;

    itemBusyRef.current = true;
    setItemBusy(true);

    const itemUsed = await onUseItem(key);
    if (!itemUsed) {
      itemBusyRef.current = false;
      setItemBusy(false);
      return;
    }

    switch (item.effect) {
      case 'heal_30': {
        const healAmount = 30;
        const newHp = Math.min(playerMon.maxHp, playerMon.currentHp + healAmount);
        setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, currentHp: newHp } : m));
        addLog(`🧪 Used ${item.name}: Restored ${healAmount} HP!`);
        break;
      }
      case 'atk_boost_1t': {
        setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, status: 'atk_boost' as StatusEffect, statusTurns: 1 } : m));
        addLog(`⚔️ Used ${item.name}: Attack boosted!`);
        break;
      }
      case 'def_boost_1t': {
        setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, status: 'def_boost' as StatusEffect, statusTurns: 1 } : m));
        addLog(`🛡️ Used ${item.name}: Defense boosted!`);
        break;
      }
      case 'apply_blessed': {
        setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, status: 'blessed' as StatusEffect, statusTurns: 3 } : m));
        addLog(`✨ Used ${item.name}: Blessed status applied!`);
        break;
      }
      case 'cure_status': {
        setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, status: null, statusTurns: 0 } : m));
        addLog(`💊 Used ${item.name}: Status conditions cured!`);
        break;
      }
      case 'inflict_curse': {
        setNpcMonsters(prev => prev.map((m, i) => i === npcMonsterIdx ? { ...m, status: 'curse' as StatusEffect, statusTurns: 3 } : m));
        addLog(`💀 Used ${item.name}: Enemy is now Cursed!`);
        break;
      }
      case 'revive': {
        if (playerMon.currentHp <= 0) {
          setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, currentHp: Math.round(m.maxHp * 0.5) } : m));
          addLog(`🔄 Used ${item.name}: ${playerMon.def.name} revived!`);
        } else {
          addLog(`❌ Only works on fainted monsters!`);
        }
        break;
      }
      default:
        addLog(`Used ${item.name}!`);
        break;
    }

    setTimeout(() => {
      setPhase('npc_turn');
      doNpcTurn();
      itemBusyRef.current = false;
      setItemBusy(false);
    }, 500);
  };

  const handleQuestionsComplete = (correctCount: number, answeredQuestions: any[]) => {
    setPhase('npc_turn');
    onQuestionsAnswered?.(answeredQuestions);
    if (!pendingSkillId) return;
    const skill = SKILLS[pendingSkillId];
    const isBlessed = playerMon.status === 'blessed';
    // Falls back to skill.questionCount when the modal wasn't able to ask
    // that many questions (e.g. a tier-3 skill wants 3 but the player's
    // unseen-question pool for that subject only had 2 left) — scoring
    // against however many were actually asked instead of the nominal tier
    // count, so a capped-down round can still register as a perfect hit.
    const askedCount = answeredQuestions.length || skill.questionCount;
    const isPerfect = correctCount === askedCount;

    // Speed determines who acts first. If the NPC is faster and its fixed
    // counter-damage would knock the player out this round, it strikes before
    // the player's just-chosen attack ever lands — mirroring the classic "the
    // slower side doesn't get to move if it's already fainted" RPG rule.
    const npcIsFaster = npcMon.currentHp > 0 && npcMon.status !== 'paralyze'
      && getScaledStats(npcMon.def, npcMon.level).speed > getScaledStats(playerMon.def, playerMon.level).speed;
    if (npcIsFaster) {
      const preemptDamage = computeNpcDamage(npcMon, playerMon);
      if (playerMon.currentHp - preemptDamage <= 0) {
        setAttackMessage(`${npcMon.def.name} is faster and strikes first!`);
        playHitThud();
        triggerAnim('player', 'battle-hit');
        setTimeout(() => setAttackMessage(null), 1000);
        addLog(`⚡ ${npcMon.def.name} is faster and attacks for ${preemptDamage} damage before you can move!`);

        const newHp = Math.max(0, playerMon.currentHp - preemptDamage);
        const updatedPlayer = playerMonsters.map((m, i) => i === playerMonsterIdx ? { ...m, currentHp: newHp } : m);
        setPlayerMonsters(updatedPlayer);
        addLog(`${playerMon.def.name} fainted before it could attack!`);

        const nextIdx = updatedPlayer.findIndex((m, i) => i !== playerMonsterIdx && m.currentHp > 0);
        if (nextIdx === -1) {
          addLog('All your monsters fainted! You lost!');
          playDefeat();
          battleMusicRef.current?.pause();
          setBattleResult({ won: false, exp: 0, reason: 'ko' });
          setPhase('ended');
        } else {
          setPlayerMonsterIdx(nextIdx);
          playerMonsterIdxRef.current = nextIdx;
          addLog(`Go, ${updatedPlayer[nextIdx].def.name}!`);
          setPhase('select_skill');
        }
        return;
      }
    }

    let damage = calculateDamage(
      skill,
      getScaledStats(playerMon.def, playerMon.level).attack,
      correctCount,
      askedCount,
      playerMon.def.element,
      npcMon.def.element,
      isBlessed,
      getScaledStats(npcMon.def, npcMon.level).defense,
    );

    if (playerMon.status === 'curse') {
      damage = Math.round(damage * (1 - BATTLE_CONSTANTS.CURSE_DAMAGE_REDUCTION));
    }

    setAttackMessage(`${playerMon.def.name} used ${skill.name}!`);
    playAttackWhoosh();
    triggerAnim('player', 'battle-attack-right');
    setTimeout(() => setAttackMessage(null), 1000);

    let msg: string;
    if (damage === 0) {
      playMiss();
      msg = `❌ ${playerMon.def.name} used ${skill.name}, but the attack missed! (wrong answer)`;
    } else {
      playHitThud();
      triggerAnim('npc', 'battle-hit');
      msg = `${playerMon.def.name} used ${skill.name}! (${correctCount}/${skill.questionCount} correct) → ${damage} damage!`;
    }

    let newNpcMonsters = [...npcMonsters];
    let newNpcMon = { ...npcMon, currentHp: Math.max(0, npcMon.currentHp - damage) };

    if (isPerfect && ELEMENT_STATUS[playerMon.def.element]) {
      const effect = ELEMENT_STATUS[playerMon.def.element]!;
      newNpcMon.status = effect;
      newNpcMon.statusTurns = effect === 'curse' ? BATTLE_CONSTANTS.CURSE_DURATION_TURNS : 999;
      msg += ` ${STATUS_DEFINITIONS[effect].emoji} ${newNpcMon.def.name} is ${effect}!`;
    }

    newNpcMonsters[npcMonsterIdx] = newNpcMon;

    let newPlayerMonsters = playerMonsters.map((m, i) =>
      i === playerMonsterIdx && m.status === 'blessed' ? { ...m, status: null as StatusEffect } : m
    );

    addLog(msg);
    setNpcMonsters(newNpcMonsters);
    setPlayerMonsters(newPlayerMonsters);

    if (newNpcMon.currentHp <= 0) {
      addLog(`${newNpcMon.def.name} fainted!`);
      const nextNpc = npcMonsterIdx + 1;
      if (nextNpc >= (trainer?.monsters.length ?? npcMonsters.length)) {
        const earned = trainer?.reward.exp ?? 0;
        setExpEarned(earned);
        addLog(`You defeated ${opponentName}!`);
        playVictory();
        battleMusicRef.current?.pause();
        setBattleResult({ won: true, exp: earned, reason: 'ko' });
        setPhase('ended');
        return;
      }
      setNpcMonsterIdx(nextNpc);
      addLog(`${opponentName} sends out ${npcMonsters[nextNpc]?.def.name || 'another monster'}!`);
    }

    doNpcTurn();
  };

  const doNpcTurn = () => {
    setTimeout(() => {
      // Read the latest committed state via refs — computing everything here as
      // plain values means each setState below fires exactly once, with no side
      // effects hidden inside an updater function that React could re-invoke.
      // playerMonsterIdxRef (rather than the closure's playerMonsterIdx) is used
      // so a manual switch that happened earlier in this same tick is honored.
      const currentIdx = playerMonsterIdxRef.current;
      const currentNpc = npcMonstersRef.current[npcMonsterIdx];
      const currentPlayer = playerMonstersRef.current[currentIdx];

      if (currentNpc.status === 'paralyze') {
        addLog(`${currentNpc.def.name} is paralyzed and can't move!`);
        const [updatedNpc, msgs] = applyStatusTick(currentNpc);
        msgs.forEach(addLog);
        setNpcMonsters(npcMonstersRef.current.map((m, i) => i === npcMonsterIdx ? updatedNpc : m));
        setPhase('select_skill');
        return;
      }

      const damage = computeNpcDamage(currentNpc, currentPlayer);

      if (currentPlayer.status === 'def_boost') {
        addLog(`🛡️ ${currentPlayer.def.name}'s Iron Shield blocked half the damage!`);
      }

      const newHp = Math.max(0, currentPlayer.currentHp - damage);
      playHitThud();
      triggerAnim('player', 'battle-hit');
      addLog(`${currentNpc.def.name} attacks for ${damage} damage!`);

      const [tickedNpc, tickMsgs] = applyStatusTick(currentNpc);
      tickMsgs.forEach(addLog);

      const updatedPlayer = playerMonstersRef.current.map((m, i) =>
        i === currentIdx ? { ...m, currentHp: newHp } : m
      );
      const updatedNpc = npcMonstersRef.current.map((m, i) => i === npcMonsterIdx ? tickedNpc : m);

      setPlayerMonsters(updatedPlayer);
      setNpcMonsters(updatedNpc);

      if (newHp <= 0) {
        addLog(`${currentPlayer.def.name} fainted!`);
        const nextIdx = updatedPlayer.findIndex((m, i) => i !== currentIdx && m.currentHp > 0);
        if (nextIdx === -1) {
          addLog('All your monsters fainted! You lost!');
          playDefeat();
          battleMusicRef.current?.pause();
          setBattleResult({ won: false, exp: 0, reason: 'ko' });
          setPhase('ended');
        } else {
          setPlayerMonsterIdx(nextIdx);
          playerMonsterIdxRef.current = nextIdx;
          addLog(`Go, ${updatedPlayer[nextIdx].def.name}!`);
          setPhase('select_skill');
        }
      } else {
        setPhase('select_skill');
      }
    }, 1000);
  };

  const otherAlivePlayerMonsters = playerMonsters
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => i !== playerMonsterIdx && m.currentHp > 0);

  const handleSwitchMonster = (idx: number) => {
    const target = playerMonsters[idx];
    if (!target || target.currentHp <= 0) return;
    addLog(`You switched to ${target.def.name}!`);
    setPlayerMonsterIdx(idx);
    playerMonsterIdxRef.current = idx;
    setPhase('npc_turn');
    doNpcTurn();
  };

  const handleSurrender = () => {
    setConfirmSurrender(false);
    addLog('You surrendered the battle.');
    playDefeat();
    battleMusicRef.current?.pause();
    setBattleResult({ won: false, exp: 0, reason: 'surrender' });
    setPhase('ended');
  };

  const availableTiers = getAvailableSkillTiers(playerMon.level, playerMon.def);
  const restConfig = REST_BY_ELEMENT[playerMon.def.element];

  if (phase === 'ended' && battleResult) {
    const me = USERS[userId];
    const opponentAvatarSrc = trainer ? `/trainers/${trainer.id}.png` : '/userpics/Spr_RS_School_Kid_M.png';
    const opponentFallbackEmoji = trainer?.emoji ?? '⚔️';
    const reasonLabel = battleResult.reason === 'surrender' ? 'You surrendered' : 'Fight complete';

    return (
      <PostBattleSummary
        outcome={battleResult.won ? 'win' : 'loss'}
        reasonLabel={reasonLabel}
        left={{ avatarSrc: me?.avatar || '/userpics/Spr_RS_School_Kid_M.png', name: me?.fullName ?? userId, mon: playerMon, isWinner: battleResult.won }}
        right={{ avatarSrc: opponentAvatarSrc, avatarFallbackEmoji: opponentFallbackEmoji, name: opponentName, mon: npcMon, isWinner: !battleResult.won }}
        log={log}
        rewardLine={battleResult.won && battleResult.exp > 0 ? `+${battleResult.exp} Monster EXP earned!` : undefined}
        onContinue={() => onBattleEnd(battleResult.won, battleResult.exp)}
      />
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 battle-panel-in">
      {/* Battle header */}
      <div className="flex justify-between items-start mb-6">
        {/* Player monster — LEFT */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Your Monster</p>
          <div className={`w-16 h-16 mx-auto mb-2 ${playerAnim}`}>
            <MonsterImage monster={playerMon.def} className="w-full h-full battle-float" emojiClassName="text-4xl" />
          </div>
          <p className="text-sm font-bold text-white">{playerMon.def.name} Lv.{playerMon.level}</p>
          <div className="w-32 bg-neutral-800 rounded-full h-2 mt-1">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${(playerMon.currentHp / playerMon.maxHp) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{playerMon.currentHp}/{playerMon.maxHp} HP</p>
          {playerMon.status && <p className="text-xs mt-1">{STATUS_DEFINITIONS[playerMon.status].emoji} {playerMon.status}</p>}
        </div>

        {/* Battle log */}
        <div className="flex-1 mx-6 bg-black/30 rounded-xl p-3 h-32 overflow-y-auto">
          {log.map((msg, i) => (
            <p key={i} className="text-xs text-gray-300 mb-1">{msg}</p>
          ))}
        </div>

        {/* NPC monster — RIGHT, flipped to face left */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {trainer && (
              <img 
                src={`/trainers/${trainer.id}.png`}
                alt={trainer.name} 
                className="w-6 h-6 rounded-full object-cover border border-neutral-600"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <p className="text-xs text-gray-500">{opponentName}</p>
          </div>
          <div className={`w-16 h-16 mx-auto mb-2 ${npcAnim}`} style={{ transform: 'scaleX(-1)' }}>
            <MonsterImage monster={npcMon.def} className="w-full h-full battle-float" emojiClassName="text-4xl" />
          </div>
          <p className="text-sm font-bold text-white">{npcMon.def.name} Lv.{npcMonsters[npcMonsterIdx].level}</p>
          <div className="w-32 bg-neutral-800 rounded-full h-2 mt-1">
            <div
              className="h-2 rounded-full bg-red-500 transition-all"
              style={{ width: `${(npcMon.currentHp / npcMon.maxHp) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{npcMon.currentHp}/{npcMon.maxHp} HP</p>
          {npcMon.status && <p className="text-xs mt-1">{STATUS_DEFINITIONS[npcMon.status].emoji} {npcMon.status}</p>}
        </div>
      </div>

      {/* Attack message overlay */}
      {attackMessage && (
        <div className="text-center py-4 text-xl font-bold text-amber-400 animate-pulse">
          {attackMessage}
        </div>
      )}

      {/* Skill selection */}
      {phase === 'select_skill' && (
        <div className="grid grid-cols-2 gap-3">
          {([1, 2, 3] as const).map(tier => {
            const skillId = playerMon.def.skills[tier - 1];
            const skill = SKILLS[skillId];
            const isLocked = !availableTiers.includes(tier);
            if (isLocked) {
              const requiredLevel = tier === 2 ? playerMon.def.skillUnlocks.tier2 : playerMon.def.skillUnlocks.tier3;
              return (
                <div
                  key={tier}
                  className="bg-neutral-950/50 border-2 border-dashed border-neutral-800 rounded-xl p-4 text-left opacity-60"
                >
                  <p className="font-bold text-gray-500 text-sm">🔒 {skill.name}</p>
                  <p className="text-xs text-amber-500/80 mt-1">Unlocks at Lv.{requiredLevel}</p>
                </div>
              );
            }
            return (
              <button
                key={tier}
                onClick={() => handleSkillSelect(skillId)}
                className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all btn-tactile"
              >
                <p className="font-bold text-white text-sm">{skill.name}</p>
                <p className="text-xs text-gray-400">{skill.questionCount} question{skill.questionCount > 1 ? 's' : ''} · Tier {tier}</p>
                <p className="text-xs text-gray-500 mt-1">{skill.description}</p>
              </button>
            );
          })}
          <button
            onClick={handleRest}
            disabled={playerMon.restUsed >= restConfig.maxUsesPerBattle}
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
          >
            <p className="font-bold text-white text-sm flex items-center gap-1">
              😴 Rest <InfoTag text="Heals your monster and uses up this turn — the trainer's monster still attacks normally. Limited uses per battle." />
            </p>
            <p className="text-xs text-gray-400">Restore {Math.round(restConfig.hpRestorePercent * 100)}% HP</p>
          </button>
        </div>
      )}

      {phase === 'select_skill' && (
        <>
          <div className="border-t border-neutral-800 my-3" />
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPhase('select_item')}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all btn-tactile"
            >
              <p className="font-bold text-white text-sm flex items-center gap-1">
                🎒 Items <InfoTag text="Using an item also uses up this turn — the trainer's monster still attacks normally." />
              </p>
              <p className="text-xs text-gray-400">Use items from inventory</p>
            </button>
            <button
              onClick={() => setPhase('select_switch')}
              disabled={otherAlivePlayerMonsters.length === 0}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
            >
              <p className="font-bold text-white text-sm flex items-center gap-1">
                🔄 Switch <InfoTag text="Swap to another monster on your team — also uses up this turn." />
              </p>
              <p className="text-xs text-gray-400">{otherAlivePlayerMonsters.length > 0 ? 'Change your monster' : 'No other monsters'}</p>
            </button>
            <button
              onClick={() => setConfirmSurrender(true)}
              className="bg-neutral-800 hover:bg-neutral-700 border border-red-900/60 hover:border-red-500 rounded-xl p-4 text-left transition-all btn-tactile"
            >
              <p className="font-bold text-red-400 text-sm flex items-center gap-1">
                🏳️ Surrender <InfoTag text="Ends the battle immediately with no Monster EXP earned." />
              </p>
              <p className="text-xs text-gray-400">Forfeit the match</p>
            </button>
          </div>
        </>
      )}

      {phase === 'select_skill' && confirmSurrender && (
        <div className="mt-4 bg-neutral-950 border border-red-900 rounded-2xl p-4 text-center space-y-3">
          <p className="text-white font-bold">Surrender the battle?</p>
          <p className="text-xs text-gray-400">You'll earn no Monster EXP.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmSurrender(false)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded-lg btn-tactile"
            >
              Cancel
            </button>
            <button
              onClick={handleSurrender}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg font-bold btn-tactile"
            >
              Surrender
            </button>
          </div>
        </div>
      )}

      {phase === 'npc_turn' && (
        <div className="text-center py-4 text-gray-400 animate-pulse">Opponent is attacking...</div>
      )}

      {phase === 'select_switch' && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <p className="text-white font-bold text-center mb-2">🔄 Switch Monster</p>
          <div className="space-y-2">
            {otherAlivePlayerMonsters.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No other monsters available.</p>
            ) : (
              otherAlivePlayerMonsters.map(({ m, i }) => (
                <button
                  key={i}
                  onClick={() => handleSwitchMonster(i)}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left flex items-center gap-4 transition-all btn-tactile"
                >
                  <div className="w-10 h-10">
                    <MonsterImage monster={m.def} className="w-full h-full" emojiClassName="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{m.def.name} Lv.{m.level}</p>
                    <p className="text-xs text-gray-400">{m.currentHp}/{m.maxHp} HP</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setPhase('select_skill')}
            className="w-full text-gray-500 text-sm mt-2 hover:text-white transition-colors btn-tactile"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'select_item' && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <p className="text-white font-bold text-center mb-2">🎒 Select an Item</p>
          <div className="space-y-2">
            {Object.entries(inventory).length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No items in inventory.</p>
            ) : (
              Object.entries(inventory).map(([key, qty]) => {
                if (qty <= 0) return null;
                
                const itemData = SHOP_CATALOG.find(i => i.key === key);
                
                return (
                  <button
                    key={key}
                    onClick={() => handleItemUse(key)}
                    disabled={itemBusy}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left flex items-center gap-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
                  >
                    <span className="text-2xl">{itemData?.icon || '📦'}</span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm capitalize">{itemData?.name || key.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{itemData?.desc || 'Consumable item'}</p>
                    </div>
                    <span className="bg-neutral-700 text-yellow-400 font-bold px-3 py-1 rounded-full text-xs">x{qty}</span>
                  </button>
                );
              })
            )}
          </div>
          <button 
            onClick={() => setPhase('select_skill')} 
            className="w-full text-gray-500 text-sm mt-2 hover:text-white transition-colors btn-tactile"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'answering' && pendingSkillId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-700 rounded-2xl p-6 max-w-lg w-full battle-panel-in">
            <div className="flex items-center gap-4 mb-5 bg-amber-900/20 border border-amber-800 rounded-xl p-4">
              <MonsterImage monster={playerMon.def} className="w-14 h-14" />
              <div>
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">⚔️ Attack!</p>
                <p className="text-white font-bold">{playerMon.def.name} uses {SKILLS[pendingSkillId]?.name}!</p>
                <p className="text-sm mt-1 text-gray-300">
                  Answer <span className="text-amber-400 font-bold">{questionCount}/{questionCount}</span> correctly for full damage
                  {questionCount > 1 && <span className="text-gray-500 text-xs ml-1"> · partial = half damage</span>}
                </p>
              </div>
            </div>
            <BattleQuestionModal
              questions={questions}
              count={questionCount}
              embedded={true}
              onComplete={handleQuestionsComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STARTER SELECTION ────────────────────────────────────────────────────────

interface StarterSelectionProps {
  userId: string;
  onComplete: () => void;
}

function StarterSelection({ userId, onComplete }: StarterSelectionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const starters = Object.values(MONSTERS);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('user_monsters').insert({
      user_id: userId,
      monster_id: selected,
      monster_exp: 0,
      monster_level: 1,
      slot: 1,
      rest_used: 0,
    });
    await supabase.from('user_battle_state').upsert({
      user_id: userId,
      map_x: 1,
      map_y: 1,
      defeated_trainers: [],
      seen_monsters: [],
      active_monster_slot: 1,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (!error) onComplete();
  };

  

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-display font-bold text-white mb-2">🐉 Choose Your Starter</h2>
      <p className="text-gray-400 mb-8">Pick your first monster. Choose wisely — you'll unlock more as you level up!</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {starters.map(monster => (
          <button
            key={monster.id}
            onClick={() => setSelected(monster.id)}
            className={`p-6 rounded-2xl border-2 text-center transition-all ${
              selected === monster.id
                ? 'border-amber-400 bg-amber-900/20'
                : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
            }`}
          >
<div className="w-16 h-16 mx-auto mb-3">
              <MonsterImage monster={monster} className="w-full h-full" />
            </div>
            <p className="font-bold text-white font-display">{monster.name}</p>
            <p className="text-xs text-gray-400 capitalize mb-2">{monster.element} · {monster.archetype.replace('_', ' ')}</p>
            <p className="text-xs text-gray-500">{monster.description}</p>
            <div className="mt-3 text-xs text-gray-400 space-y-1">
              <p>❤️ {monster.baseHp} HP · ⚔️ {monster.baseAttack} ATK</p>
              <p>🛡️ {monster.baseDefense} DEF · ⚡ {monster.baseSpeed} SPD</p>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={handleConfirm}
        disabled={!selected || saving}
        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-10 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : `Choose ${selected ? MONSTERS[selected].name : '...'}`}
      </button>
    </div>
  );
}

// ─── TRAINING MAP ─────────────────────────────────────────────────────────────

interface TrainingMapProps {
  userId: string;
  battleState: BattleState;
  userMonsters: UserMonster[];
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
}

function TrainingMap({
  userId, battleState, userMonsters, questions,
  onBattleStateChange, onMonsterExpGained, onHeal, onQuestionsAnswered, onWildEncounterRoll, onChallengePlayer,
  liveBattleInbox, mapPresence, movementLocked, walkLockActive,
}: TrainingMapProps) {
  const [grassQuestion, setGrassQuestion] = useState(false);
  const [statsTargetId, setStatsTargetId] = useState<string | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [bumping, setBumping] = useState(false);
  const [dustPuffs, setDustPuffs] = useState<{ id: number; x: number; y: number }[]>([]);
  const dustIdRef = useRef(0);
  const map = buildMap();
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
    const newX = battleState.map_x + dx;
    const newY = battleState.map_y + dy;
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

    const newState = { ...battleState, map_x: newX, map_y: newY };
    onBattleStateChange(newState);

    await supabase.from('user_battle_state')
      .update({ map_x: newX, map_y: newY, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (tile.type === 'grass' && Math.random() < 0.4) {
      playMonsterAppear();
      setGrassQuestion(true);
    } else if (tile.type === 'town') {
      onHeal();
    }
  }, [battleState, map, userId, onBattleStateChange, onHeal, movementLocked]);

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
    if (correctCount > 0) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('user_battle_state').update({ last_wild_encounter_win: today }).eq('user_id', userId);
      onBattleStateChange({ ...battleState, last_wild_encounter_win: today });
    }
    // Rare wild-monster encounter roll — once per individual question answered,
    // regardless of whether it was answered correctly. Odds rise the more
    // NPC trainers the player has defeated (see getWildEncounterChance).
    const wildEncounterChance = getWildEncounterChance(battleState.defeated_trainers.length);
    const encountered = answeredQuestions.some(() => Math.random() < wildEncounterChance);
    if (encountered) onWildEncounterRoll?.();
  };

  return (
    <div>

      {/* Map (left on desktop, top on mobile) + stacked info column (right on desktop, below on mobile) */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">

        {/* Map column */}
        <div className="flex flex-col items-center gap-3 lg:flex-1">

          {/* Row: d-pad on the left of the map (mobile/tablet only — desktop relies on arrow keys) + map */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">

            {/* D-pad — mobile/tablet only */}
            <div className="flex-shrink-0 lg:hidden">
              <div className={`grid grid-cols-3 gap-1 w-16 sm:w-20 ${movementLocked ? 'opacity-40' : ''}`}>
                <div />
                <button disabled={movementLocked} onClick={() => move(0, -1)} className="bg-neutral-800 hover:bg-neutral-700 rounded-lg p-1.5 text-center text-white text-base disabled:cursor-not-allowed">▲</button>
                <div />
                <button disabled={movementLocked} onClick={() => move(-1, 0)} className="bg-neutral-800 hover:bg-neutral-700 rounded-lg p-1.5 text-center text-white text-base disabled:cursor-not-allowed">◀</button>
                <div className="bg-neutral-900 rounded-lg" />
                <button disabled={movementLocked} onClick={() => move(1, 0)}  className="bg-neutral-800 hover:bg-neutral-700 rounded-lg p-1.5 text-center text-white text-base disabled:cursor-not-allowed">▶</button>
                <div />
                <button disabled={movementLocked} onClick={() => move(0, 1)}  className="bg-neutral-800 hover:bg-neutral-700 rounded-lg p-1.5 text-center text-white text-base disabled:cursor-not-allowed">▼</button>
                <div />
              </div>
              <p className="text-[10px] text-gray-600 mt-1 text-center">
                {walkLockActive ? '⏳ wait...' : 'arrows'}
              </p>
            </div>

            {/* Map — single painted background image with a percentage-based walkability grid on top.
                Sized as a responsive square (flex-1, capped by max-w) so it never causes horizontal
                scrolling — every position on the grid is expressed in % rather than fixed pixels. */}
            <div
              className={`relative border border-neutral-700 rounded-xl overflow-hidden bg-neutral-900 flex-1 min-w-0 max-w-[560px] aspect-square ${bumping ? 'map-bump-shake' : ''}`}
              style={{ backgroundImage: `url(${MAP_IMAGE})`, backgroundSize: '100% 100%' }}
            >
              <div
                className="absolute inset-0 grid gap-0"
                style={{ gridTemplateColumns: `repeat(${MAP_SIZE}, 1fr)`, gridTemplateRows: `repeat(${MAP_SIZE}, 1fr)` }}
              >
                {map.map((row, y) =>
                  row.map((tile, x) => (
                    <div key={`${x}-${y}`} className="flex items-center justify-center" title={tile.type}>
                      {tile.type === 'town' && x === 1 && y === 1 && <TownMarker />}
                    </div>
                  ))
                )}
              </div>
              <div
                className="absolute pointer-events-none transition-[left,top] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center"
                style={{
                  left: `${battleState.map_x * TILE_PCT}%`, top: `${battleState.map_y * TILE_PCT}%`,
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
          </div>

          {/* Below map: arrow-key hint (desktop) + sticker picker */}
          <div className="flex flex-col items-center">
            <p className="hidden lg:block text-xs text-gray-600 text-center">
              {walkLockActive ? '⏳ Take a moment to review that answer before moving...' : 'Use arrow keys to move'}
            </p>

            <div className="relative mt-1 lg:mt-3 w-24">
              <button
                onClick={() => setStickerPickerOpen(v => !v)}
                className="w-full bg-neutral-800 hover:bg-neutral-700 rounded-lg p-2 text-center text-white text-sm"
              >
                💬
              </button>
              {stickerPickerOpen && (
                <div className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 rounded-lg p-2 w-40 space-y-1">
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
        </div>

        {/* Info column: Active Monster, Who's Online, then foldable Map Legend / Training Tips */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">

          {/* Active monster */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Active Monster</p>
            {activeMonster ? (() => {
              const def = ALL_MONSTERS[activeMonster.monster_id];
              const expIntoLevel = activeMonster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL;
              const expToNext = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - expIntoLevel;
              return (
                <div className="flex items-center gap-3">
                  <MonsterImage monster={def} className="w-12 h-12" />
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{def?.name}</p>
                    <p className="text-xs text-gray-400 capitalize">Lv.{activeMonster.monster_level} · {def?.element}</p>
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full bg-amber-400"
                        style={{ width: `${(expIntoLevel / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                  </div>
                </div>
              );
            })() : (
              <p className="text-gray-500 text-sm">No active monster</p>
            )}
          </div>

          {/* Who's online */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">🟢 Who's Online</p>
            {Object.keys(onlinePlayers).length === 0 ? (
              <p className="text-gray-600 text-sm">No one else is on the map right now.</p>
            ) : (
              <div className="space-y-2">
                {Object.values(onlinePlayers)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <button
                      key={p.userId}
                      onClick={() => setStatsTargetId(p.userId)}
                      className="w-full flex items-center gap-2 bg-black/30 hover:bg-black/50 rounded-lg px-3 py-2 text-left transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium truncate">
                        {USERS[p.userId]?.name || p.name}
                      </span>
                      {USERS[p.userId]?.isFamily && <GMBadge />}
                      <span className="text-xs text-gray-500 ml-auto">{USERS[p.userId]?.grade}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Map Legend — foldable */}
          <details className="group bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <summary className="text-xs text-gray-500 uppercase tracking-widest cursor-pointer select-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
              Map Legend
              <span className="text-gray-600 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-2 text-sm mt-3">
              <div className="flex items-center gap-2">
                <span>🟩</span>
                <div>
                  <p className="text-white font-medium">Grass</p>
                  <p className="text-xs text-gray-400">40% chance to trigger a training question. Answer correctly for +{BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} monster EXP.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>🏠</span>
                <div>
                  <p className="text-white font-medium">Town</p>
                  <p className="text-xs text-gray-400">Safe zone. Walking here heals your full team.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>🧒</span>
                <div>
                  <p className="text-white font-medium">You</p>
                  <p className="text-xs text-gray-400">Your current position on the map.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>🟢</span>
                <div>
                  <p className="text-white font-medium">Other players</p>
                  <p className="text-xs text-gray-400">Tap a player on the map or in the roster to view their stats or wave.</p>
                </div>
              </div>
            </div>
          </details>

          {/* Training Tips — foldable */}
          <details className="group bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <summary className="text-xs text-gray-500 uppercase tracking-widest cursor-pointer select-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
              Training Tips
              <span className="text-gray-600 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-2 text-xs text-gray-400 mt-3">
              <p>⌨️ Use <span className="text-white font-bold">arrow keys</span> or the buttons below to move.</p>
              <p>🌿 Walk through <span className="text-white font-bold">grass tiles</span> repeatedly to grind monster EXP.</p>
              <p>⚔️ Monster reaches <span className="text-white font-bold">Lv.5</span> to unlock Tier 2 skill, <span className="text-white font-bold">Lv.10</span> for Tier 3.</p>
              <p>🏠 Return to <span className="text-white font-bold">town</span> to heal before challenging a trainer.</p>
              <p>💡 Defeat trainers in order from the <span className="text-white font-bold">⚔️ Trainers</span> tab — each one gets harder and requires a higher player level.</p>
            </div>
          </details>

        </div>
      </div>

      {grassQuestion && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-emerald-700 rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center gap-4 mb-5 bg-emerald-900/30 border border-emerald-800 rounded-xl p-4">
              {activeMonster && (
                <MonsterImage monster={ALL_MONSTERS[activeMonster.monster_id]} className="w-14 h-14" />
              )}
              <div>
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">🌿 Wild Encounter!</p>
                <p className="text-white font-bold">
                  {activeMonster ? ALL_MONSTERS[activeMonster.monster_id]?.name : 'Your monster'} is training!
                </p>
                <p className="text-sm mt-1">
                  Answer correctly → <span className="text-amber-400 font-bold">+{BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} EXP</span>
                  {activeMonster && (() => {
                    const expToNext = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (activeMonster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL);
                    return <span className="text-gray-400 text-xs ml-1">({expToNext} to next level)</span>;
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
        </div>
      )}

      {statsTargetId && (
        <PlayerStatsPopup
          targetId={statsTargetId}
          onClose={() => setStatsTargetId(null)}
          onWave={sendWave}
          onChallenge={onChallengePlayer}
          targetInBattle={liveBattleInbox?.playersInBattle.has(statsTargetId) ?? false}
        />
      )}
    </div>
  );
}

// ─── TEAM PANEL ───────────────────────────────────────────────────────────────

function TeamPanel({ userMonsters, playerLevel, userId, onTeamChange }: {
  userMonsters: UserMonster[];
  playerLevel: number;
  userId: string;
  onTeamChange: () => void;
}) {
  const unlockedSlots = getUnlockedMonsterSlots(playerLevel);
  const allMonsters = Object.values(MONSTERS);

  const handleAddMonster = async (slot: number, monsterId: string) => {
    const existing = userMonsters.find(m => m.slot === slot);
    if (existing) {
      await supabase.from('user_monsters').update({ monster_id: monsterId }).eq('id', existing.id);
    } else {
      await supabase.from('user_monsters').insert({
        user_id: userId, monster_id: monsterId, monster_exp: 0, monster_level: 1, slot, rest_used: 0,
      });
    }
    onTeamChange();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">Your Team</h3>
      {[1, 2, 3].map(slot => {
        const monster = userMonsters.find(m => m.slot === slot);
        const isUnlocked = slot <= unlockedSlots || !!monster;
        const def = monster ? ALL_MONSTERS[monster.monster_id] : null;
        const expToNext = monster ? BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) : 0;

        return (
          <div
            key={slot}
            className={`p-4 rounded-xl border ${isUnlocked ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-800 bg-neutral-950 opacity-50'}`}
          >
            {!isUnlocked ? (
              <p className="text-gray-500 text-sm">🔒 Unlocks at player Level {BATTLE_CONSTANTS.PLAYER_LEVEL_FOR_SLOT[slot as 1|2|3]}</p>
            ) : !monster || !def ? (
              <div>
                <p className="text-gray-400 text-sm mb-2">Slot {slot} — Choose a monster:</p>
                <div className="flex flex-wrap gap-2">
                  {allMonsters.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleAddMonster(slot, m.id)}
                      className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded-lg text-white"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12">
                  <MonsterImage monster={def} className="w-full h-full" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{monster.monster_level}</span></p>
                  <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-amber-400 transition-all"
                      style={{ width: `${((monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {(() => {
                    const scaled = getScaledStats(def, monster.monster_level);
                    return (
                      <>
                        <p>❤️ {scaled.hp}</p>
                        <p>⚔️ {scaled.attack}</p>
                        <p>🛡️ {scaled.defense}</p>
                        <p>⚡ {scaled.speed}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── COLLECTION PANEL ───────────────────────────────────────────────────────────
// Rare, wild-caught monsters land here first (never straight into a team slot).
// Promoting one reuses the same insert/update-by-slot pattern as TeamPanel.

function CollectionPanel({ caughtMonsters, userMonsters, playerLevel, onPromote }: {
  caughtMonsters: CaughtMonster[];
  userMonsters: UserMonster[];
  playerLevel: number;
  onPromote: (caught: CaughtMonster, slot: number) => void;
}) {
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const unlockedSlots = getUnlockedMonsterSlots(playerLevel);

  // "Owned" = currently on the team or sitting in the caught-but-benched
  // collection — anything never caught (mostly the wild-only species, since
  // starters can always be freely added to an open team slot) stays greyed
  // out here as a preview of what's still out there to find.
  const ownedSpeciesIds = new Set([
    ...userMonsters.map(m => m.monster_id),
    ...caughtMonsters.map(c => c.monster_id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white font-display">🐲 Collection</h3>
        <p className="text-xs text-gray-500">Every monster species in the game. Greyed-out ones haven't been obtained yet — most only appear from a rare wild encounter on the Training Map.</p>
      </div>

      {caughtMonsters.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">Ready to add to your team</p>
          {caughtMonsters.map(caught => {
            const def = ALL_MONSTERS[caught.monster_id];
            if (!def) return null;
            return (
              <div key={caught.id} className="p-4 rounded-xl border border-amber-800 bg-amber-900/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0">
                    <MonsterImage monster={def} className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{caught.monster_level}</span></p>
                    <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  </div>
                  <button
                    onClick={() => setPromotingId(promotingId === caught.id ? null : caught.id)}
                    className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    → Move to Team
                  </button>
                </div>
                {promotingId === caught.id && (
                  <div className="mt-3 pt-3 border-t border-amber-900 flex flex-wrap gap-2">
                    {[1, 2, 3].map(slot => {
                      const existing = userMonsters.find(m => m.slot === slot);
                      const isUnlocked = slot <= unlockedSlots || !!existing;
                      if (!isUnlocked) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => { onPromote(caught, slot); setPromotingId(null); }}
                          className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg text-white"
                        >
                          {existing ? `Replace ${ALL_MONSTERS[existing.monster_id]?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">All Species</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.values(ALL_MONSTERS).map(def => {
            const owned = ownedSpeciesIds.has(def.id);
            const inTeam = userMonsters.find(m => m.monster_id === def.id);
            return (
              <div
                key={def.id}
                className={`p-3 rounded-xl border text-center ${
                  owned ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-800 bg-neutral-950/50 opacity-40 grayscale'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-2">
                  <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-3xl" />
                </div>
                <p className="text-sm font-bold text-white">{def.name}</p>
                <p className="text-xs text-gray-500 capitalize">{def.element}</p>
                {owned ? (
                  inTeam ? (
                    <p className="text-[10px] text-green-500 mt-1">✅ In Team · Lv.{inTeam.monster_level}</p>
                  ) : (
                    <p className="text-[10px] text-amber-500 mt-1">📦 In Collection</p>
                  )
                ) : (
                  <p className="text-[10px] text-gray-600 mt-1">🔒 Not obtained</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── COMPENDIUM PANEL ───────────────────────────────────────────────────────────
// A dex-style reference of every species in the game. Starters are always fully
// known (the player picks one freely at the start). Wild-only species stay a
// silhouette — shape visible, everything else hidden — until the player has
// either encountered one on the Training Map (battleState.seen_monsters) or
// already owns one (team/collection), matching WildEncounterModal's "A wild
// {name} appeared!" reveal, which fires before the catch is decided.

const ELEMENT_STYLES: Record<Element, string> = {
  fire:   'text-orange-400 border-orange-800 bg-orange-900/20',
  water:  'text-blue-400 border-blue-800 bg-blue-900/20',
  leaf:   'text-green-400 border-green-800 bg-green-900/20',
  storm:  'text-yellow-400 border-yellow-800 bg-yellow-900/20',
  shadow: 'text-purple-400 border-purple-800 bg-purple-900/20',
  light:  'text-amber-300 border-amber-700 bg-amber-900/20',
};

// Renders a monster's sprite as a flat black silhouette — deliberately
// bypasses MonsterImage so neither the emoji fallback nor the legendary
// crown badge can leak a hint about the mystery species underneath.
function MonsterSilhouette({ id, className = '' }: { id: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-neutral-950 text-neutral-700 text-2xl ${className}`}>
        ?
      </div>
    );
  }
  return (
    <img
      src={`/monsters/${id}.webp`}
      alt="???"
      className={`object-contain ${className}`}
      style={{ filter: 'brightness(0)', opacity: 0.55 }}
      onError={() => setFailed(true)}
    />
  );
}

function CompendiumStatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function CompendiumPanel({ userMonsters, caughtMonsters, seenMonsterIds }: {
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  seenMonsterIds: string[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ownedSpeciesIds = new Set([
    ...userMonsters.map(m => m.monster_id),
    ...caughtMonsters.map(c => c.monster_id),
  ]);
  const knownSpeciesIds = new Set([...ownedSpeciesIds, ...seenMonsterIds]);
  const isKnown = (id: string) => !WILD_MONSTERS[id] || knownSpeciesIds.has(id);

  const selected = selectedId ? ALL_MONSTERS[selectedId] : null;
  const selectedKnown = selectedId ? isKnown(selectedId) : false;
  const selectedOwned = selectedId ? ownedSpeciesIds.has(selectedId) : false;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white font-display">📖 Compendium</h3>
        <p className="text-xs text-gray-500">Every monster species in the game. Wild-only species stay a mystery silhouette until you encounter one on the Training Map.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {Object.values(ALL_MONSTERS).map(def => {
          const known = isKnown(def.id);
          const owned = ownedSpeciesIds.has(def.id);
          return (
            <button
              key={def.id}
              onClick={() => setSelectedId(def.id)}
              className={`p-3 rounded-xl border text-center transition-colors ${
                selectedId === def.id ? 'border-amber-400 bg-amber-900/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-2">
                {known ? (
                  <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-3xl" />
                ) : (
                  <MonsterSilhouette id={def.id} className="w-full h-full" />
                )}
              </div>
              <p className="text-xs font-bold text-white truncate">{known ? def.name : '???'}</p>
              {known && owned && <p className="text-[9px] text-green-500">✅ Owned</p>}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60">
          {selectedKnown ? (
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-28 h-28 mx-auto sm:mx-0 flex-shrink-0">
                <MonsterImage monster={selected} className="w-full h-full" emojiClassName="text-6xl" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xl font-bold text-white font-display flex items-center gap-2">
                    {selected.name}
                    {selected.isLegendary && <span title="Legendary">👑</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border capitalize ${ELEMENT_STYLES[selected.element]}`}>
                      {selected.element}
                    </span>
                    <span className="text-[10px] text-gray-500 capitalize">{selected.archetype.replace('_', ' ')}</span>
                    {selectedOwned && <span className="text-[10px] text-green-500 font-bold">✅ In your collection</span>}
                  </div>
                </div>
                <p className="text-sm text-gray-400">{selected.description}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-sm">
                  <CompendiumStatBar label="HP" value={selected.baseHp} max={150} />
                  <CompendiumStatBar label="Attack" value={selected.baseAttack} max={30} />
                  <CompendiumStatBar label="Defense" value={selected.baseDefense} max={30} />
                  <CompendiumStatBar label="Speed" value={selected.baseSpeed} max={30} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Skills</p>
                  <div className="space-y-1">
                    {selected.skills.map((skillId, i) => {
                      const skill = SKILLS[skillId];
                      if (!skill) return null;
                      const unlockLevel = i === 0 ? 1 : i === 1 ? selected.skillUnlocks.tier2 : selected.skillUnlocks.tier3;
                      return (
                        <div key={skillId} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-600 w-14 flex-shrink-0">Lv.{unlockLevel}</span>
                          <span className="font-bold text-white">{skill.name}</span>
                          <span className="text-gray-500">— {skill.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="w-28 h-28 flex-shrink-0">
                <MonsterSilhouette id={selected.id} className="w-full h-full" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl font-bold text-white font-display">???</p>
                <p className="text-sm text-gray-500 mt-2">A mysterious wild monster — its identity is still unknown. Keep answering questions on the Training Map for a chance to encounter it.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN MONSTER GUILD ───────────────────────────────────────────────────────

type GuildView = 'map' | 'team' | 'trainers' | 'collection' | 'compendium' | 'battle' | 'live_battle' | 'leaderboard';

interface WildEncounterState {
  monsterId: string;
  level: number;
  question: any;
  attemptsLeft: number;
}

export default function MonsterGuild({ userId, playerLevel, packageData, liveBattleInbox, pendingLiveBattleId, onConsumePendingLiveBattle, onBattleWon }: MonsterGuildProps) {
  const [loading, setLoading] = useState(true);
  const [userMonsters, setUserMonsters] = useState<UserMonster[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [view, setView] = useState<GuildView>('map');
  const [activeBattle, setActiveBattle] = useState<NpcTrainer | null>(null);
  const [isWildEncounterBattle, setIsWildEncounterBattle] = useState(false);
  const [isDummyBattle, setIsDummyBattle] = useState(false);
  const [wildEncounter, setWildEncounter] = useState<WildEncounterState | null>(null);
  const [walkLocked, setWalkLocked] = useState(false);
  const walkLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [caughtMonsters, setCaughtMonsters] = useState<CaughtMonster[]>([]);
  const [pvpOpponent, setPvpOpponent] = useState<{ id: UserId; name: string } | null>(null);
  const [pvpOpponentTeam, setPvpOpponentTeam] = useState<ActiveBattleMonster[] | null>(null);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);
  const [liveBattleOpponent, setLiveBattleOpponent] = useState<{ id: UserId; name: string } | null>(null);
  const [liveBattleSide, setLiveBattleSide] = useState<'challenger' | 'opponent'>('challenger');
  const [liveBattleTeams, setLiveBattleTeams] = useState<{ mine: ActiveBattleMonster[]; opp: ActiveBattleMonster[] } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [answeredArenaIds, setAnsweredArenaIds] = useState<Set<string>>(new Set());

  const allQuestions = extractQuestions(packageData);
  // Questions this player hasn't been asked yet, so repeated grinding surfaces
  // new material instead of the same handful of questions. Once every question
  // in the pool has been seen, the history resets (below) and it starts over.
  const questions = allQuestions.length === 0
    ? allQuestions
    : (() => {
        const unseen = allQuestions.filter(q => !answeredArenaIds.has(hashQuestionId(arenaQuestionText(q))));
        return unseen.length > 0 ? unseen : allQuestions;
      })();

  useEffect(() => {
    if (allQuestions.length === 0 || answeredArenaIds.size === 0) return;
    const stillUnseen = allQuestions.some(q => !answeredArenaIds.has(hashQuestionId(arenaQuestionText(q))));
    if (!stillUnseen) {
      setAnsweredArenaIds(new Set());
      resetArenaHistory(userId);
    }
  }, [allQuestions, answeredArenaIds, userId]);

  const handleQuestionsAnswered = (usedQuestions: any[]) => {
    if (usedQuestions.length === 0) return;
    setAnsweredArenaIds(prev => {
      const next = new Set(prev);
      usedQuestions.forEach(q => next.add(hashQuestionId(arenaQuestionText(q))));
      return next;
    });
    markArenaQuestionsCompleted(userId, usedQuestions);
  };

  const loadData = async (isBattleInProgress = false) => {
    // If in battle, we only want to update inventory, not reset monster/battle state
    if (isBattleInProgress) {
      const invData = await fetchInventory(userId);
      setInventory(invData || {});
      return;
    }

    setLoading(true);
    const [monstersRes, stateRes, invData, answeredIds, caughtRes] = await Promise.all([
      supabase.from('user_monsters').select('*').eq('user_id', userId).order('slot'),
      supabase.from('user_battle_state').select('*').eq('user_id', userId).single(),
      fetchInventory(userId),
      fetchAnsweredArenaQuestionIds(userId),
      supabase.from('user_caught_monsters').select('*').eq('user_id', userId).order('caught_at', { ascending: false }),
    ]);
    setUserMonsters(monstersRes.data || []);
    setBattleState(stateRes.data || null);
    setInventory(invData || {});
    setAnsweredArenaIds(answeredIds);
    setCaughtMonsters(caughtRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [userId]);

  // Mounted here (not inside TrainingMap) so a player's presence on the
  // training-map channel survives switching to the live-battle view —
  // otherwise their sprite would vanish for everyone else the instant a
  // challenge is accepted, instead of staying visible with a battle badge.
  const selfProfileForMap = USERS[userId];
  const mapPresence = useMapPresence(
    userId,
    selfProfileForMap?.name || userId,
    selfProfileForMap?.gender || 'boy',
    battleState?.map_x ?? 0,
    battleState?.map_y ?? 0,
  );

  // The invitee lands here once they've accepted a challenge from anywhere
  // else in the app (Dashboard's LiveBattleInviteToast) — fetch the battle
  // row both sides already agreed on and jump straight into the live screen.
  useEffect(() => {
    if (!pendingLiveBattleId) return;
    (async () => {
      const battle = await fetchLiveBattle(pendingLiveBattleId);
      onConsumePendingLiveBattle();
      if (!battle) return;
      const isChallenger = battle.challenger_id === userId;
      const opponentId = isChallenger ? battle.opponent_id : battle.challenger_id;
      setLiveBattleId(battle.id);
      setLiveBattleOpponent({ id: opponentId, name: USERS[opponentId]?.name ?? opponentId });
      setLiveBattleSide(isChallenger ? 'challenger' : 'opponent');
      setLiveBattleTeams({
        mine: isChallenger ? battle.challenger_team : battle.opponent_team,
        opp: isChallenger ? battle.opponent_team : battle.challenger_team,
      });
      setView('live_battle');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLiveBattleId]);

  // Lets other players' training maps show a blinking "in battle" badge over
  // this player's sprite, and blocks challenges aimed at them while it's set.
  useEffect(() => {
    liveBattleInbox.setInBattleStatus(view === 'live_battle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Challenger's side: if the invitee declines, back out of the waiting screen.
  useEffect(() => {
    const resp = liveBattleInbox.inviteResponse;
    if (!resp || resp.battleId !== liveBattleId) return;
    if (!resp.accepted) {
      showNotification(`${liveBattleOpponent?.name ?? 'They'} declined the challenge.`);
      setLiveBattleId(null);
      setLiveBattleOpponent(null);
      setLiveBattleTeams(null);
      setView('trainers');
    }
    liveBattleInbox.clearInviteResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBattleInbox.inviteResponse]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTrainerBattle = (trainer: NpcTrainer) => {
    setActiveBattle(trainer);
    setView('battle');
  };

  // Free, always-available practice opponent: one monster per monster the
  // player currently fields, each at the player's matching level and built
  // from an element the player's monster is strong against — so it's always
  // a fair, easy fight regardless of team composition.
  const buildTrainingDummy = (): NpcTrainer => {
    const monsters: TrainerMonster[] = userMonsters.map(um => {
      const def = ALL_MONSTERS[um.monster_id];
      const counterElement = getCounterElement(def.element);
      const counterMonster = Object.values(MONSTERS).find(m => m.element === counterElement);
      return { monsterId: counterMonster?.id || um.monster_id, level: um.monster_level };
    });
    return {
      id: 'training_tester',
      name: 'Training Dummy',
      element: 'mixed',
      levelRequirement: 0,
      monsters,
      reward: { exp: 10, gold: 0 },
      emoji: '🎯',
      intro: 'No hard feelings — just here to help you practice.',
    };
  };

  const handleDummyBattle = () => {
    setIsDummyBattle(true);
    setActiveBattle(buildTrainingDummy());
    setView('battle');
  };

  const handleHeal = () => {
    showNotification('🏠 Your team has been healed!');
  };

  const gradeLevel = USERS[userId]?.grade === 'Grade 2' ? 2 : 5;

  const handleWildEncounterRoll = async () => {
    if (wildEncounter || view === 'battle') return; // don't stack encounters
    const pool = await fetchQuestionPool(userId, 'sq_wild_encounter', 'wild_encounter', gradeLevel);
    if (pool.length === 0) return; // admin hasn't added any wild-encounter questions yet
    // More legendary species already caught nudges the odds of finding
    // another legendary a bit further (see pickRandomWildMonsterId).
    const ownedSpeciesIds = new Set([
      ...userMonsters.map(m => m.monster_id),
      ...caughtMonsters.map(c => c.monster_id),
    ]);
    const ownedLegendaryCount = [...ownedSpeciesIds].filter(id => ALL_MONSTERS[id]?.isLegendary).length;
    const monsterId = pickRandomWildMonsterId(ownedLegendaryCount);
    const activeMonster = userMonsters.find(m => m.slot === (battleState?.active_monster_slot || 1));
    const level = Math.max(1, (activeMonster?.monster_level || 1) + Math.floor(Math.random() * 3) - 1);
    const question = pool[Math.floor(Math.random() * pool.length)];
    setWildEncounter({ monsterId, level, question, attemptsLeft: 3 });

    // The species is revealed to the player the moment the encounter modal
    // shows "A wild {name} appeared!" — regardless of catch outcome, so
    // mark it seen here for the Compendium (only if not already recorded).
    if (battleState && !battleState.seen_monsters.includes(monsterId)) {
      const newSeen = [...battleState.seen_monsters, monsterId];
      setBattleState({ ...battleState, seen_monsters: newSeen });
      await supabase.from('user_battle_state').update({ seen_monsters: newSeen }).eq('user_id', userId);
    }
  };

  const handleWildEncounterCorrect = () => {
    if (!wildEncounter) return;
    markQuestionsCompleted(userId, 'wild_encounter', [wildEncounter.question.id]);
    const monster = WILD_MONSTERS[wildEncounter.monsterId];
    const trainer: NpcTrainer = {
      id: `wild-${wildEncounter.monsterId}-${Date.now()}`,
      name: monster.name,
      element: monster.element,
      levelRequirement: 0,
      monsters: [{ monsterId: wildEncounter.monsterId, level: wildEncounter.level }],
      reward: { exp: BATTLE_CONSTANTS.MONSTER_EXP_PER_BATTLE_WIN, gold: 0 },
      emoji: monster.emoji,
      intro: `A wild ${monster.name} blocks your path!`,
    };
    setWildEncounter(null);
    setIsWildEncounterBattle(true);
    setActiveBattle(trainer);
    setView('battle');
  };

  // Gives the player a forced pause after a wrong answer so they actually read
  // the correct choice before rushing off, instead of instantly resuming.
  const lockWalkingFor10Seconds = () => {
    if (walkLockTimeoutRef.current) clearTimeout(walkLockTimeoutRef.current);
    setWalkLocked(true);
    walkLockTimeoutRef.current = setTimeout(() => {
      setWalkLocked(false);
      walkLockTimeoutRef.current = null;
    }, 10000);
  };

  useEffect(() => () => {
    if (walkLockTimeoutRef.current) clearTimeout(walkLockTimeoutRef.current);
  }, []);

  const handleWildEncounterWrong = async () => {
    if (!wildEncounter) return;
    lockWalkingFor10Seconds();
    markQuestionsCompleted(userId, 'wild_encounter', [wildEncounter.question.id]);
    const attemptsLeft = wildEncounter.attemptsLeft - 1;
    if (attemptsLeft <= 0) {
      showNotification(`💨 The wild ${WILD_MONSTERS[wildEncounter.monsterId].name} fled...`);
      setWildEncounter(null);
      return;
    }
    const pool = await fetchQuestionPool(userId, 'sq_wild_encounter', 'wild_encounter', gradeLevel);
    if (pool.length === 0) {
      setWildEncounter(null);
      return;
    }
    const question = pool[Math.floor(Math.random() * pool.length)];
    setWildEncounter(prev => prev ? { ...prev, question, attemptsLeft } : prev);
  };

  const handlePromoteCaughtMonster = async (caught: CaughtMonster, slot: number) => {
    const existing = userMonsters.find(m => m.slot === slot);
    if (existing) {
      // Bumped monster isn't lost — it goes into the Collection so it can be
      // swapped back in later, same as any wild catch.
      await supabase.from('user_caught_monsters').insert({
        user_id: userId, monster_id: existing.monster_id,
        monster_level: existing.monster_level, monster_exp: existing.monster_exp,
      });
      await supabase.from('user_monsters')
        .update({ monster_id: caught.monster_id, monster_level: caught.monster_level, monster_exp: caught.monster_exp })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_monsters').insert({
        user_id: userId, monster_id: caught.monster_id,
        monster_level: caught.monster_level, monster_exp: caught.monster_exp,
        slot, rest_used: 0,
      });
    }
    await supabase.from('user_caught_monsters').delete().eq('id', caught.id);
    showNotification(`${ALL_MONSTERS[caught.monster_id]?.name} joined your team!`);
    loadData();
  };

  const handleChallengePlayer = async (opponentId: UserId, opponentName: string) => {
    if (!liveBattleInbox.onlinePlayerIds.has(opponentId)) {
      showNotification(`${opponentName} isn't online right now.`);
      return;
    }
    if (liveBattleInbox.playersInBattle.has(opponentId)) {
      showNotification(`${opponentName} is in a battle — try again once they're done.`);
      return;
    }

    const { data: opponentMonsters } = await supabase
      .from('user_monsters')
      .select('*')
      .eq('user_id', opponentId)
      .order('slot');

    if (!opponentMonsters || opponentMonsters.length === 0) {
      showNotification(`${opponentName} has no monsters yet!`);
      return;
    }

    const opponentTeam: ActiveBattleMonster[] = opponentMonsters.map((um: any) => {
      const def = ALL_MONSTERS[um.monster_id];
      const hp = getScaledStats(def, um.monster_level).hp;
      return {
        def,
        level: um.monster_level,
        currentHp: hp,
        maxHp: hp,
        status: null,
        statusTurns: 0,
        restUsed: 0,
        userMonster: um,
      };
    });

    const myTeam = buildPlayerTeam();
    const battle = await createInvite(userId, opponentId, myTeam, opponentTeam);
    if (!battle) {
      showNotification('Could not start a live battle right now — try again.');
      return;
    }

    await liveBattleInbox.sendInvite(opponentId, battle.id);
    setLiveBattleId(battle.id);
    setLiveBattleOpponent({ id: opponentId, name: opponentName });
    setLiveBattleSide('challenger');
    setLiveBattleTeams({ mine: myTeam, opp: opponentTeam });
    setView('live_battle');
    showNotification(`Challenge sent to ${opponentName} — waiting for them to accept...`);
  };

  const handleMonsterExpGained = async (monsterId: string, exp: number) => {
    setUserMonsters(prev => prev.map(m => {
      if (m.id !== monsterId) return m;
      const newExp = m.monster_exp + exp;
      const newLevel = getMonsterLevel(newExp);
      showNotification(`+${exp} EXP for ${ALL_MONSTERS[m.monster_id]?.name}!${newLevel > m.monster_level ? ` 🎉 Level Up! Now Lv.${newLevel}!` : ''}`);
      return { ...m, monster_exp: newExp, monster_level: newLevel };
    }));
  };

  const handleBattleEnd = async (won: boolean, expEarned: number) => {
    const today = new Date().toISOString().split('T')[0];

    if (isWildEncounterBattle && activeBattle) {
      const wildMonsterId = activeBattle.monsters[0].monsterId;
      const wildLevel = activeBattle.monsters[0].level;
      if (won) {
        await supabase.from('user_caught_monsters').insert({
          user_id: userId, monster_id: wildMonsterId, monster_level: wildLevel, monster_exp: 0,
        });
        await supabase.from('user_battle_state').update({ last_wild_encounter_win: today }).eq('user_id', userId);
        setBattleState(prev => prev ? { ...prev, last_wild_encounter_win: today } : prev);
        showNotification(`🎉 You caught ${activeBattle.name}!`);
        logAction(userId, today, 'battle', `🐉 Captured wild ${activeBattle.name}!`, 0, 0);
      } else {
        showNotification(`💨 ${activeBattle.name} broke free and fled...`);
        logAction(userId, today, 'battle', `💨 Failed to capture wild ${activeBattle.name}`, 0, 0);
      }
      setIsWildEncounterBattle(false);
      setActiveBattle(null);
      setView('map');
      loadData();
      return;
    }

    if (isDummyBattle && activeBattle) {
      if (won) {
        if (expEarned > 0) {
          const activeMonster = userMonsters.find(m => m.slot === (battleState?.active_monster_slot || 1));
          if (activeMonster) {
            await handleMonsterExpGained(activeMonster.id, expEarned);
            const newExp = activeMonster.monster_exp + expEarned;
            await supabase.from('user_monsters').update({ monster_exp: newExp, monster_level: getMonsterLevel(newExp) }).eq('id', activeMonster.id);
          }
        }
        showNotification('🥊 You bullied the Training Dummy!');
        await supabase.from('monster_battle_log').insert({ user_id: userId, opponent: 'training_tester', result: 'win', monster_exp_earned: expEarned });
        logAction(userId, today, 'battle', `🥊 Beat the Training Dummy — +${expEarned} Monster EXP`, expEarned, 0);
        onBattleWon('dummy');
      } else {
        showNotification('💀 Even the dummy got you this time...');
        await supabase.from('monster_battle_log').insert({ user_id: userId, opponent: 'training_tester', result: 'loss', monster_exp_earned: 0 });
        logAction(userId, today, 'battle', '💀 Lost to the Training Dummy', 0, 0);
      }
      setIsDummyBattle(false);
      setActiveBattle(null);
      setView('map');
      loadData();
      return;
    }

    if (won && activeBattle) {
      const newDefeated = [...(battleState?.defeated_trainers || []), activeBattle.id];
      await supabase.from('user_battle_state').update({ defeated_trainers: newDefeated }).eq('user_id', userId);
      setBattleState(prev => prev ? { ...prev, defeated_trainers: newDefeated } : prev);

      if (expEarned > 0) {
        const activeMonster = userMonsters.find(m => m.slot === (battleState?.active_monster_slot || 1));
        if (activeMonster) {
          await handleMonsterExpGained(activeMonster.id, expEarned);
          const newExp = activeMonster.monster_exp + expEarned;
          await supabase.from('user_monsters').update({ monster_exp: newExp, monster_level: getMonsterLevel(newExp) }).eq('id', activeMonster.id);
        }
      }
      showNotification(`🏆 You defeated ${activeBattle.name}!`);
      await supabase.from('monster_battle_log').insert({ user_id: userId, opponent: activeBattle.id, result: 'win', monster_exp_earned: expEarned });
      logAction(userId, today, 'battle', `🏆 Defeated Trainer ${activeBattle.name} — +${expEarned} Monster EXP`, expEarned, 0);
      onBattleWon('trainer');
    } else {
      showNotification('💀 You lost the battle...');
      await supabase.from('monster_battle_log').insert({ user_id: userId, opponent: activeBattle?.id || 'unknown', result: 'loss', monster_exp_earned: 0 });
      logAction(userId, today, 'battle', `💀 Lost battle against Trainer ${activeBattle?.name ?? 'Unknown'}`, 0, 0);
    }
    setActiveBattle(null);
    setView('map');
    loadData();
  };

  const handlePvpBattleEnd = async (won: boolean, expEarned: number) => {
    const today = new Date().toISOString().split('T')[0];
    const opponent = pvpOpponent!;
    if (won) {
      const alreadyWonToday = battleState?.last_pvp_win === today;
      const goldReward = alreadyWonToday ? 0 : 50;
      if (!alreadyWonToday) {
        await supabase.from('user_battle_state').update({ last_pvp_win: today }).eq('user_id', userId);
        setBattleState(prev => prev ? { ...prev, last_pvp_win: today } : prev);
      }
      await supabase.from('monster_battle_log').insert({ user_id: userId, opponent: opponent.id, result: 'win', monster_exp_earned: 0 });
      if (goldReward > 0) {
        showNotification(`🏆 Defeated ${opponent.name}! +50 Gold!`);
        logAction(userId, today, 'battle', `⚔️ Challenge vs ${opponent.name} — Victory! +50 Gold`, 0, 50);
      } else {
        showNotification(`🏆 Defeated ${opponent.name}! (First win gold already claimed today)`);
        logAction(userId, today, 'battle', `⚔️ Challenge vs ${opponent.name} — Victory!`, 0, 0);
      }
      onBattleWon('sibling');
    } else {
      showNotification(`💀 ${opponent.name}'s team was too strong!`);
      await supabase.from('monster_battle_log').insert({ user_id: userId, opponent: opponent.id, result: 'loss', monster_exp_earned: 0 });
      logAction(userId, today, 'battle', `💀 Challenge vs ${opponent.name} — Defeated`, 0, 0);
    }
    setPvpOpponent(null);
    setPvpOpponentTeam(null);
    setView('trainers');
    loadData();
  };

  const buildPlayerTeam = (): ActiveBattleMonster[] => {
    return userMonsters.map(um => {
      const def = ALL_MONSTERS[um.monster_id];
      const hp = getScaledStats(def, um.monster_level).hp;
      return { def, level: um.monster_level, currentHp: hp, maxHp: hp, status: null, statusTurns: 0, restUsed: 0, userMonster: um } as ActiveBattleMonster;
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 animate-pulse">Loading Monster Guild...</div>;
  }

  if (userMonsters.length === 0) {
    return (
      <div className="py-10">
        <StarterSelection userId={userId} onComplete={loadData} />
      </div>
    );
  }

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">
          {notification}
        </div>
      )}

      <h2 className="text-3xl font-display font-bold text-white mb-6">🐉 Monster Guild</h2>

      {/* Sub-nav */}
      <div className="flex gap-2 mb-8 border-b border-neutral-800">
        {([
          { id: 'map',        label: '🗺️ Training Map' },
          { id: 'team',       label: '👥 My Team' },
          { id: 'trainers',   label: '⚔️ Trainers' },
          { id: 'collection', label: `🐲 Collection${caughtMonsters.length > 0 ? ` (${caughtMonsters.length})` : ''}` },
          { id: 'compendium', label: '📖 Compendium' },
          { id: 'leaderboard', label: '🏆 Leaderboard' },
        ] as { id: GuildView; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-px ${
              view === tab.id
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Map view */}
      {view === 'map' && battleState && (
        <TrainingMap
          userId={userId}
          battleState={battleState}
          userMonsters={userMonsters}
          questions={questions}
          onBattleStateChange={setBattleState}
          onMonsterExpGained={handleMonsterExpGained}
          onHeal={handleHeal}
          onQuestionsAnswered={handleQuestionsAnswered}
          onWildEncounterRoll={handleWildEncounterRoll}
          onChallengePlayer={(targetId, name) => handleChallengePlayer(targetId as UserId, name)}
          liveBattleInbox={liveBattleInbox}
          mapPresence={mapPresence}
          movementLocked={!!wildEncounter || walkLocked}
          walkLockActive={walkLocked}
        />
      )}

      {/* Team view */}
      {view === 'team' && (
        <TeamPanel
          userMonsters={userMonsters}
          playerLevel={playerLevel}
          userId={userId}
          onTeamChange={loadData}
        />
      )}

      {/* Collection view — rare wild monsters, promote into a team slot */}
      {view === 'collection' && (
        <CollectionPanel
          caughtMonsters={caughtMonsters}
          userMonsters={userMonsters}
          playerLevel={playerLevel}
          onPromote={handlePromoteCaughtMonster}
        />
      )}

      {/* Compendium view — dex-style reference, wild-only species stay a silhouette until encountered */}
      {view === 'compendium' && (
        <CompendiumPanel
          caughtMonsters={caughtMonsters}
          userMonsters={userMonsters}
          seenMonsterIds={battleState?.seen_monsters || []}
        />
      )}

      {view === 'leaderboard' && <LeaderboardPanel />}

      {/* Trainers view */}
      {view === 'trainers' && battleState && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white font-display">NPC Trainers</h3>

          {/* PvP — Challenge To A Battle */}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const alreadyWonToday = battleState?.last_pvp_win === today;
            const otherPlayers = getOtherPlayers(userId as UserId);
            return (
              <div className="border border-indigo-800 bg-indigo-900/10 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">👊</span>
                  <div>
                    <p className="font-bold text-white">Challenge To A Battle</p>
                    <p className="text-xs text-gray-400">
                      Battle another player's team.
                      {alreadyWonToday
                        ? ' First win gold already claimed today — resets tomorrow.'
                        : ' First win today earns '}
                      {!alreadyWonToday && <span className="text-amber-400 font-bold">50 Gold</span>}
                      {!alreadyWonToday && '.'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {otherPlayers.map(player => {
                    const inBattle = liveBattleInbox.playersInBattle.has(player.id);
                    return (
                    <div key={player.id} className="flex items-center justify-between bg-black/30 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.avatar || '/userpics/Spr_RS_School_Kid_M.png'}
                          alt={player.name}
                          className="w-9 h-9 rounded-full object-cover border border-neutral-600 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/userpics/Spr_RS_School_Kid_M.png'; }}
                        />
                        <div>
                          <p className="text-white text-sm font-bold">{player.fullName}</p>
                          <p className="text-gray-500 text-xs">
                            {inBattle ? `⚔️ ${player.name} is in a battle` : `${player.grade}${!player.isFamily ? ' · Classmate' : ''}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleChallengePlayer(player.id as UserId, player.name)}
                        disabled={inBattle}
                        className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Challenge!
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div className="p-5 rounded-xl border flex items-center gap-4 border-neutral-700 bg-neutral-900">
            <div className="w-14 h-14 flex-shrink-0 relative flex items-center justify-center text-4xl bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
              <span className="opacity-50">🎯</span>
              <img
                src="/trainers/training_tester.png"
                alt="Training Dummy"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Training Dummy</p>
              <p className="text-xs text-gray-400">Always available · Matches your team</p>
              <p className="text-xs text-gray-500 italic mt-1">"No hard feelings — just here to help you practice."</p>
              <div className="flex gap-2 mt-2">
                {userMonsters.map((um, i) => {
                  const def = ALL_MONSTERS[um.monster_id];
                  const counterElement = getCounterElement(def.element);
                  const counterMonster = Object.values(MONSTERS).find(m => m.element === counterElement);
                  return (
                    <span key={i} className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-gray-300">
                      {counterMonster?.name || def.name} Lv.{um.monster_level}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="text-right">
              <button
                onClick={handleDummyBattle}
                className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Battle!
              </button>
            </div>
          </div>
          {NPC_TRAINERS.map(trainer => {
            const defeated = battleState.defeated_trainers.includes(trainer.id);
            const locked = playerLevel < trainer.levelRequirement;
            return (
              <div
                key={trainer.id}
                className={`p-5 rounded-xl border flex items-center gap-4 ${
                  defeated ? 'border-green-800 bg-green-900/10' :
                  locked   ? 'border-neutral-800 bg-neutral-950 opacity-50' :
                             'border-neutral-700 bg-neutral-900'
                }`}
              >
                <div className="w-14 h-14 flex-shrink-0 relative flex items-center justify-center text-4xl bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
                  {/* Fallback emoji if the image hasn't loaded or is missing */}
                  <span className="opacity-50">{trainer.emoji}</span>
                  <img 
                    src={`/trainers/${trainer.id}.png`}
                    alt={trainer.name} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{trainer.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{trainer.element} · Requires Level {trainer.levelRequirement}</p>
                  <p className="text-xs text-gray-500 italic mt-1">"{trainer.intro}"</p>
                  <div className="flex gap-2 mt-2">
                    {trainer.monsters.map((tm, i) => (
                      <span key={i} className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-gray-300">
                        {ALL_MONSTERS[tm.monsterId]?.name} Lv.{tm.level}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  {defeated ? (
                    <span className="text-green-400 text-sm font-bold">✅ Defeated</span>
                  ) : locked ? (
                    <span className="text-gray-500 text-sm">🔒 Locked</span>
                  ) : (
                    <button
                      onClick={() => handleTrainerBattle(trainer)}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Battle!
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Battle view — NPC */}
      {view === 'battle' && activeBattle && !pvpOpponentTeam && (
        <BattleScreen
          userId={userId}
          playerTeam={buildPlayerTeam()}
          trainer={activeBattle}
          questions={questions}
          inventory={inventory}
          onUseItem={async (key) => {
            const ok = await useInventoryItem(userId, key);
            if (ok) await loadData(true); // <--- Pass 'true' to skip full reset
            return ok;
          }}
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
          inventory={inventory}
          onUseItem={async (key) => {
            const ok = await useInventoryItem(userId, key);
            if (ok) await loadData(true); // skip full reset — would unmount BattleScreen mid-fight
            return ok;
          }}
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
          questions={questions}
          inventory={inventory}
          onUseItem={async (key) => {
            const ok = await useInventoryItem(userId, key);
            if (ok) await loadData(true); // skip full reset — would unmount LiveBattleScreen mid-fight
            return ok;
          }}
          onBattleResultKnown={(won) => {
            liveBattleInbox.sendBattleResultFlash(won);
            liveBattleInbox.setInBattleStatus(false);
          }}
          onBattleEnd={(won) => {
            showNotification(won ? `🏆 Defeated ${liveBattleOpponent.name}!` : `💀 ${liveBattleOpponent.name} was too strong!`);
            if (won) {
              onBattleWon('sibling');
            }
            setLiveBattleId(null);
            setLiveBattleOpponent(null);
            setLiveBattleTeams(null);
            setView('trainers');
            loadData();
          }}
        />
      )}

      {wildEncounter && (
        <WildEncounterModal
          key={wildEncounter.question.id}
          monster={WILD_MONSTERS[wildEncounter.monsterId]}
          level={wildEncounter.level}
          question={wildEncounter.question}
          attemptsLeft={wildEncounter.attemptsLeft}
          onCorrect={handleWildEncounterCorrect}
          onWrong={handleWildEncounterWrong}
        />
      )}
    </div>
  );
}
