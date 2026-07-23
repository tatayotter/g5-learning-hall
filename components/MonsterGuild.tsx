'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { playAttackWhoosh, playHitThud, playMiss, playVictory, playDefeat, playFootstepGrass, playFootstepTown, playWallBump, playMonsterAppear, playChime, playClash, playCurioLevelUp } from '@/lib/sounds';
import { logAction } from '@/lib/playerlog';
import { getOtherPlayers, UserId, USERS } from '@/lib/userSession';
import { useMapPresence } from '@/hooks/useMapPresence';
import PlayerStatsPopup from '@/components/PlayerStatsPopup';
import WildEncounterModal from '@/components/WildEncounterModal';
import CurioRevealModal from '@/components/CurioRevealModal';
import GraduationCeremonyModal from '@/components/GraduationCeremonyModal';
import {
  MONSTERS, WILD_MONSTERS, ALL_MONSTERS, GUILD_MONSTERS, EVENT_MONSTERS, NPC_TRAINERS, SKILLS, BATTLE_CONSTANTS,
  getUnlockedMonsterSlots, getAvailableSkillTiers, calculateDamage, getScaledStats, getEquippedSkills,
  getModifierMultiplier, tickModifiers, applySkillEffects,
  getMonsterLevel, REST_BY_ELEMENT, ELEMENT_STATUS, STATUS_DEFINITIONS, getCounterElement,
  pickRandomWildMonsterId, getWildEncounterChance, getWildEncounterPityThreshold, getGuildMonsterDisplay, getGuildMonsterTier, getGuildMonsterTierDef,
  getGraduatedMonsterDisplay, getMaxGraduationTier, GRADUATION_LEVEL_REQUIREMENT,
  Element, StatusEffect, NpcTrainer, MonsterDef, TrainerMonster, ELEMENT_ICON_SRC,
} from '@/lib/monsterConfig';
import { fetchInventory, useInventoryItem, SHOP_CATALOG, InventoryMap } from '@/lib/inventory';
import { SCROLL_CATALOG, unlearnMonsterSkill, learnMonsterSkill } from '@/lib/skillScrolls';
import { graduateMonster } from '@/lib/monsterGraduation';
import {
  hashQuestionId, arenaQuestionText,
  fetchAnsweredArenaQuestionIds, markArenaQuestionsCompleted, resetArenaHistory,
  fetchQuestionPool, markQuestionsCompleted,
  fetchSubclassProfile, guildLevelForKey, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile,
} from '@/lib/guildEngine';
import { GUILDS } from '@/lib/dailyChecklist';
import {
  UserMonster, ActiveBattleMonster, MonsterImage, BattleQuestionModal, LegendaryBadge,
} from '@/components/battle/shared';
import LiveBattleScreen from '@/components/LiveBattleScreen';
import PostBattleSummary from '@/components/battle/PostBattleSummary';
import LeaderboardPanel from '@/components/LeaderboardPanel';
import InfoTag from '@/components/InfoTag';
import { createInvite, fetchLiveBattle } from '@/lib/liveBattle';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import WorldMap from '@/components/WorldMap';
import { REGIONS } from '@/lib/regions';

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
  questions_since_wild_encounter: number;
}

interface MonsterGuildProps {
  userId: string;
  playerLevel: number;
  packageData: any;
  liveBattleInbox: ReturnType<typeof useLiveBattleInbox>;
  pendingLiveBattleId: string | null;
  onConsumePendingLiveBattle: () => void;
  onBattleWon: (kind: 'trainer' | 'sibling' | 'dummy') => void;
  onGoldAwarded: (amount: number) => void;
  initialView?: GuildView;
}

// Gold awarded when a wild encounter win would-be-catch a species already
// owned (active team or uncollected inbox) — converted instead of stacking.
const DUPLICATE_CATCH_GOLD = 100;

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
  inventory: InventoryMap;
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
  const [phase, setPhase] = useState<'select_skill' | 'select_item' | 'select_switch' | 'select_revive_target' | 'answering' | 'npc_turn' | 'ended'>('select_skill');
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
    dmg *= 100 / (100 + getScaledStats(defender.def, defender.level).defense * getModifierMultiplier(defender.modifiers, 'def'));
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

    // Revive Stone can target any fainted teammate, not just the active
    // curio, so it needs a target picker before the item is actually
    // consumed — bail out here (no DB round-trip yet) if there's nothing
    // to revive.
    if (item.effect === 'revive') {
      if (!faintedPlayerMonsters.length) {
        addLog('❌ No fainted curios to revive!');
        return;
      }
      setPhase('select_revive_target');
      return;
    }

    itemBusyRef.current = true;
    setItemBusy(true);

    const itemUsed = await onUseItem(key);
    if (!itemUsed) {
      itemBusyRef.current = false;
      setItemBusy(false);
      return;
    }

    switch (item.effect) {
      case 'heal_30':
      case 'heal_60':
      case 'heal_120': {
        const healAmount = Number(item.effect.split('_')[1]);
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

  const handleReviveTarget = async (idx: number) => {
    if (itemBusyRef.current) return;
    const target = playerMonsters[idx];
    if (!target || target.currentHp > 0) return;

    itemBusyRef.current = true;
    setItemBusy(true);

    const itemUsed = await onUseItem('revive_stone');
    if (!itemUsed) {
      itemBusyRef.current = false;
      setItemBusy(false);
      setPhase('select_item');
      return;
    }

    const revivedHp = Math.round(target.maxHp * 0.75);
    setPlayerMonsters(prev => prev.map((m, i) => i === idx ? { ...m, currentHp: revivedHp } : m));
    addLog(`🔄 Used Revive Stone: ${target.def.name} revived!`);

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
          addLog('All your curios fainted! You lost!');
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

    const atkMult = getModifierMultiplier(playerMon.modifiers, 'atk');
    const defMult = getModifierMultiplier(npcMon.modifiers, 'def');
    const accuracyBonus = getModifierMultiplier(playerMon.modifiers, 'accuracy');

    let damage = calculateDamage(
      skill,
      getScaledStats(playerMon.def, playerMon.level).attack * atkMult,
      correctCount,
      askedCount,
      playerMon.def.element,
      npcMon.def.element,
      isBlessed,
      getScaledStats(npcMon.def, npcMon.level).defense * defMult,
      accuracyBonus,
    );

    if (playerMon.status === 'curse') {
      damage = Math.round(damage * (1 - BATTLE_CONSTANTS.CURSE_DAMAGE_REDUCTION));
    }

    setAttackMessage(`${playerMon.def.name} used ${skill.name}!`);
    playAttackWhoosh();
    triggerAnim('player', 'battle-attack-right');
    setTimeout(() => setAttackMessage(null), 1000);

    let msg: string;
    if (damage === 0 && !skill.effects?.length) {
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

    // Alt/universal skills' secondary effects (self/enemy stat modifiers,
    // lifesteal, accuracy-soften, flat heal + cleanse) — no-op for base
    // species skills, which never set `effects`.
    const effectResult = applySkillEffects(skill, damage, playerMon.maxHp, playerMon.modifiers, npcMon.modifiers);
    effectResult.logMessages.forEach(m => { msg += ` ${m}`; });
    newNpcMon.modifiers = effectResult.targetModifiers;

    newNpcMonsters[npcMonsterIdx] = newNpcMon;

    let newPlayerMonsters = playerMonsters.map((m, i) => {
      if (i !== playerMonsterIdx) return m;
      let updated = { ...m, modifiers: effectResult.casterModifiers };
      if (updated.status === 'blessed') updated.status = null as StatusEffect;
      if (effectResult.casterHpDelta !== 0) {
        updated.currentHp = Math.max(0, Math.min(updated.maxHp, updated.currentHp + effectResult.casterHpDelta));
      }
      if (effectResult.cleanseCaster) {
        updated.status = null;
        updated.statusTurns = 0;
      }
      return updated;
    });

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
      addLog(`${opponentName} sends out ${npcMonsters[nextNpc]?.def.name || 'another curio'}!`);
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
      tickedNpc.modifiers = tickModifiers(tickedNpc.modifiers);

      const updatedPlayer = playerMonstersRef.current.map((m, i) =>
        i === currentIdx ? { ...m, currentHp: newHp, modifiers: tickModifiers(m.modifiers) } : m
      );
      const updatedNpc = npcMonstersRef.current.map((m, i) => i === npcMonsterIdx ? tickedNpc : m);

      setPlayerMonsters(updatedPlayer);
      setNpcMonsters(updatedNpc);

      if (newHp <= 0) {
        addLog(`${currentPlayer.def.name} fainted!`);
        const nextIdx = updatedPlayer.findIndex((m, i) => i !== currentIdx && m.currentHp > 0);
        if (nextIdx === -1) {
          addLog('All your curios fainted! You lost!');
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

  const faintedPlayerMonsters = playerMonsters
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.currentHp <= 0);

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
  const equippedSkills = getEquippedSkills(playerMon.userMonster?.equipped_skills, playerMon.def);
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
        rewardLine={battleResult.won && battleResult.exp > 0 ? `+${battleResult.exp} Curio EXP earned!` : undefined}
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
          <p className="text-xs text-gray-500 mb-1">Your Curio</p>
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
          {playerMon.status && (
            <p className="text-xs mt-1 flex items-center justify-center gap-1">
              <img src={STATUS_DEFINITIONS[playerMon.status].iconSrc} alt={playerMon.status} className="w-4 h-4 object-contain" />
              {playerMon.status}
            </p>
          )}
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
          {npcMon.status && (
            <p className="text-xs mt-1 flex items-center justify-center gap-1">
              <img src={STATUS_DEFINITIONS[npcMon.status].iconSrc} alt={npcMon.status} className="w-4 h-4 object-contain" />
              {npcMon.status}
            </p>
          )}
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
            // A slot that's been customized via the Compendium (unlearned
            // and/or re-taught — 'EMPTY' or an explicit skill id) is usable
            // right away regardless of level: the scroll purchase is itself
            // the gate. Only a slot still on its free species default stays
            // level-gated by skillUnlocks.
            const slotValue = playerMon.userMonster?.equipped_skills?.[tier - 1];
            const isCustomized = slotValue != null;
            const equippedSkill = equippedSkills[tier - 1];
            const isLocked = !isCustomized && !availableTiers.includes(tier);
            if (isLocked) {
              const requiredLevel = tier === 2 ? playerMon.def.skillUnlocks.tier2 : playerMon.def.skillUnlocks.tier3;
              return (
                <div
                  key={tier}
                  className="bg-neutral-950/50 border-2 border-dashed border-neutral-800 rounded-xl p-4 text-left opacity-60"
                >
                  <p className="font-bold text-gray-500 text-sm">🔒 {SKILLS[playerMon.def.skills[tier - 1]]?.name}</p>
                  <p className="text-xs text-amber-500/80 mt-1">Unlocks at Lv.{requiredLevel}</p>
                </div>
              );
            }
            if (!equippedSkill) {
              return (
                <div
                  key={tier}
                  className="bg-neutral-950/50 border-2 border-dashed border-neutral-800 rounded-xl p-4 text-left opacity-60"
                >
                  <p className="font-bold text-gray-500 text-sm">Empty slot</p>
                  <p className="text-xs text-gray-600 mt-1">Teach this curio a skill from the Compendium.</p>
                </div>
              );
            }
            return (
              <button
                key={tier}
                onClick={() => handleSkillSelect(equippedSkill.id)}
                className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all btn-tactile"
              >
                <p className="font-bold text-white text-sm">{equippedSkill.name}</p>
                <p className="text-xs text-gray-400">{equippedSkill.questionCount} question{equippedSkill.questionCount > 1 ? 's' : ''} · Tier {tier}</p>
                <p className="text-xs text-gray-500 mt-1">{equippedSkill.description}</p>
              </button>
            );
          })}
          <button
            onClick={handleRest}
            disabled={playerMon.restUsed >= restConfig.maxUsesPerBattle}
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
          >
            <p className="font-bold text-white text-sm flex items-center gap-1">
              <img src="/icons/stats/rest.svg" alt="" className="w-4 h-4 object-contain" /> Rest <InfoTag text="Heals your curio and uses up this turn — the trainer's curio still attacks normally. Limited uses per battle." />
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
                <img src="/icons/stats/items.svg" alt="" className="w-4 h-4 object-contain" /> Items <InfoTag text="Using an item also uses up this turn — the trainer's curio still attacks normally." />
              </p>
              <p className="text-xs text-gray-400">Use items from inventory</p>
            </button>
            <button
              onClick={() => setPhase('select_switch')}
              disabled={otherAlivePlayerMonsters.length === 0}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
            >
              <p className="font-bold text-white text-sm flex items-center gap-1">
                <img src="/icons/stats/switch.svg" alt="" className="w-4 h-4 object-contain" /> Switch <InfoTag text="Swap to another curio on your team — also uses up this turn." />
              </p>
              <p className="text-xs text-gray-400">{otherAlivePlayerMonsters.length > 0 ? 'Change your curio' : 'No other curios'}</p>
            </button>
            <button
              onClick={() => setConfirmSurrender(true)}
              className="bg-neutral-800 hover:bg-neutral-700 border border-red-900/60 hover:border-red-500 rounded-xl p-4 text-left transition-all btn-tactile"
            >
              <p className="font-bold text-red-400 text-sm flex items-center gap-1">
                <img src="/icons/stats/surrender.svg" alt="" className="w-4 h-4 object-contain" /> Surrender <InfoTag text="Ends the battle immediately with no Curio EXP earned." />
              </p>
              <p className="text-xs text-gray-400">Forfeit the match</p>
            </button>
          </div>
        </>
      )}

      {phase === 'select_skill' && confirmSurrender && (
        <div className="mt-4 bg-neutral-950 border border-red-900 rounded-2xl p-4 text-center space-y-3">
          <p className="text-white font-bold">Surrender the battle?</p>
          <p className="text-xs text-gray-400">You'll earn no Curio EXP.</p>
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
          <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
            <img src="/icons/stats/switch.svg" alt="" className="w-4 h-4 object-contain" /> Switch Curio
          </p>
          <div className="space-y-2">
            {otherAlivePlayerMonsters.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No other curios available.</p>
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

      {phase === 'select_revive_target' && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
            <img src="/icons/rewards/gift.svg" alt="" className="w-4 h-4 object-contain" /> Revive Which Curio?
          </p>
          <div className="space-y-2">
            {faintedPlayerMonsters.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No fainted curios available.</p>
            ) : (
              faintedPlayerMonsters.map(({ m, i }) => (
                <button
                  key={i}
                  onClick={() => handleReviveTarget(i)}
                  disabled={itemBusy}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left flex items-center gap-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
                >
                  <div className="w-10 h-10">
                    <MonsterImage monster={m.def} className="w-full h-full" emojiClassName="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{m.def.name} Lv.{m.level}</p>
                    <p className="text-xs text-gray-400">0/{m.maxHp} HP — Fainted</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setPhase('select_item')}
            className="w-full text-gray-500 text-sm mt-2 hover:text-white transition-colors btn-tactile"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'select_item' && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
            <img src="/icons/stats/items.svg" alt="" className="w-4 h-4 object-contain" /> Select an Item
          </p>
          <div className="space-y-2">
            {Object.entries(inventory).length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No items in inventory.</p>
            ) : (
              Object.entries(inventory).map(([key, qty]) => {
                if (!qty || qty <= 0) return null;
                
                const itemData = SHOP_CATALOG.find(i => i.key === key);
                const noReviveTargets = itemData?.effect === 'revive' && faintedPlayerMonsters.length === 0;

                return (
                  <button
                    key={key}
                    onClick={() => handleItemUse(key)}
                    disabled={itemBusy || noReviveTargets}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-4 text-left flex items-center gap-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
                  >
                    {itemData?.icon ? (
                      <img src={itemData.icon} alt={itemData.name} className="w-8 h-8 object-contain flex-shrink-0" />
                    ) : (
                      <span className="text-2xl"><img src="/icons/rewards/package.svg" alt="Package" className="inline w-4 h-4 align-[-2px]" /></span>
                    )}
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm capitalize">{itemData?.name || key.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{noReviveTargets ? 'No fainted curios to revive' : (itemData?.desc || 'Consumable item')}</p>
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
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                  <img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> Attack!
                </p>
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
      <p className="text-gray-400 mb-8">Pick your first curio. Choose wisely — you'll unlock more as you level up!</p>
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
              <p className="flex items-center gap-1 flex-wrap">
                <img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseHp} HP ·
                <img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseAttack} ATK
              </p>
              <p className="flex items-center gap-1 flex-wrap">
                <img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseDefense} DEF ·
                <img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {monster.baseSpeed} SPD
              </p>
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
}

function TrainingMap({
  userId, battleState, userMonsters, caughtMonsters, questions,
  onBattleStateChange, onMonsterExpGained, onHeal, onQuestionsAnswered, onWildEncounterRoll, onChallengePlayer,
  liveBattleInbox, mapPresence, movementLocked, walkLockActive, monsterDisplay,
  regionId, onExitRegion,
}: TrainingMapProps) {
  const [grassQuestion, setGrassQuestion] = useState(false);
  const [statsTargetId, setStatsTargetId] = useState<string | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
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

  return (
    <div>

      {onExitRegion && (
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={onExitRegion}
            className="text-sm font-bold text-gray-400 hover:text-white flex items-center gap-1"
          >
            ← Back to World Map
          </button>
          <p className="text-sm font-display font-bold text-white">
            {isLedgersHeart ? REGIONS.ledgers_heart.name : region!.name}
          </p>
        </div>
      )}

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

          {/* Your team — every teammate, not just the one currently active in
              grass encounters. The active one (whichever gets grass-answer EXP)
              is called out with an amber border + badge rather than being the
              only curio shown at all. */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Your Team</p>
            {userMonsters.filter(m => m.slot !== null).length === 0 ? (
              <p className="text-gray-500 text-sm">No curios on your team</p>
            ) : (
              <div className="space-y-3">
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
                        className={`rounded-lg p-2 ${isActive ? 'border border-amber-700 bg-amber-900/10' : 'border border-neutral-800'}`}
                      >
                        <div className="flex items-center gap-3">
                          <MonsterImage monster={def} className="w-12 h-12" />
                          <div className="flex-1">
                            <p className="font-bold text-white text-sm">
                              {def?.name}
                              {isActive && <span className="ml-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wide">Active</span>}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">Lv.{monster.monster_level} · {def?.element}</p>
                            <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-1">
                              <div
                                className="h-1.5 rounded-full bg-amber-400"
                                style={{ width: `${(expIntoLevel / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                          </div>
                          <div className="text-[10px] text-gray-400 space-y-0.5 flex-shrink-0">
                            <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.hp}</p>
                            <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.attack}</p>
                            <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.defense}</p>
                            <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.speed}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
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
              <p>🌿 Walk through <span className="text-white font-bold">grass tiles</span> repeatedly to grind curio EXP.</p>
              <p>⚔️ Curio reaches <span className="text-white font-bold">Lv.5</span> to unlock Tier 2 skill, <span className="text-white font-bold">Lv.10</span> for Tier 3.</p>
              <p>🏠 Return to <span className="text-white font-bold">town</span> to heal before challenging a trainer.</p>
              <p>💡 Defeat trainers in order from the <span className="text-white font-bold">Trainers</span> tab — each one gets harder and requires a higher player level.</p>
            </div>
          </details>

        </div>
      </div>

      {grassQuestion && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-emerald-700 rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center gap-4 mb-5 bg-emerald-900/30 border border-emerald-800 rounded-xl p-4">
              {activeMonster && (
                <MonsterImage monster={monsterDisplay[activeMonster.monster_id]} className="w-14 h-14" />
              )}
              <div>
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <img src="/icons/encounter/atk.svg" alt="Training" className="w-6 h-6" /> Grass Training
                </p>
                <p className="text-white font-bold">
                  {activeMonster ? monsterDisplay[activeMonster.monster_id]?.name : 'Your monster'} is practicing!
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

function TeamPanel({ userMonsters, playerLevel, userId, onTeamChange, monsterDisplay, caughtMonsters, onPromote }: {
  userMonsters: UserMonster[];
  playerLevel: number;
  userId: string;
  onTeamChange: () => void;
  monsterDisplay: Record<string, MonsterDef>;
  caughtMonsters: CaughtMonster[];
  onPromote: (caught: CaughtMonster, slot: number) => void;
}) {
  const unlockedSlots = getUnlockedMonsterSlots(playerLevel);
  const benchedMonsters = userMonsters.filter(m => m.slot === null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promotingBenchId, setPromotingBenchId] = useState<string | null>(null);

  const handleAddMonster = async (slot: number, monsterId: string) => {
    // set_team_slot never overwrites an existing monster's row — it reuses
    // monsterId's own persistent row if one exists (so a previously-benched
    // monster comes back with its own level/exp/equipped_skills intact) and
    // benches whoever it displaces, rather than destroying either identity.
    const { error } = await supabase.rpc('set_team_slot', {
      p_user_id: userId, p_monster_id: monsterId, p_slot: slot,
    });
    if (error) {
      console.error('set_team_slot error:', error);
      return;
    }
    onTeamChange();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">Your Team</h3>
      {[1, 2, 3].map(slot => {
        const monster = userMonsters.find(m => m.slot === slot);
        const isUnlocked = slot <= unlockedSlots || !!monster;
        const def = monster ? monsterDisplay[monster.monster_id] : null;
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
                {benchedMonsters.length === 0 ? (
                  <p className="text-xs text-gray-600">No captured monsters available. Catch one on the Training Map first!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {benchedMonsters.map(bm => {
                      const bmDef = monsterDisplay[bm.monster_id];
                      if (!bmDef) return null;
                      return (
                        <button
                          key={bm.id}
                          onClick={() => handleAddMonster(slot, bm.monster_id)}
                          className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded-lg text-white"
                        >
                          {bmDef.name} <span className="text-gray-500">Lv.{bm.monster_level}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                        <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Everything not currently sitting in slot 1-3: monsters already owned but
          benched (slot IS NULL — displaced teammates, guild-reward familiars) and
          rare wild catches waiting to join for the first time. This has to be an
          always-visible section: the per-slot "Choose a monster" list above only
          renders for slots that are already empty, so once every unlocked slot is
          full, a benched monster would otherwise have no UI to be seen or swapped
          back in from at all. */}
      {(benchedMonsters.length > 0 || caughtMonsters.length > 0) && (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-cyan-500 font-bold uppercase tracking-widest">Your Bench (Add To Your Team)</p>
          {benchedMonsters.map(bm => {
            const def = monsterDisplay[bm.monster_id];
            if (!def) return null;
            const scaled = getScaledStats(def, bm.monster_level);
            return (
              <div key={bm.id} className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0">
                    <MonsterImage monster={def} className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{bm.monster_level}</span></p>
                    <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                  </div>
                  <button
                    onClick={() => setPromotingBenchId(promotingBenchId === bm.id ? null : bm.id)}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    → Move to Team
                  </button>
                </div>
                {promotingBenchId === bm.id && (
                  <div className="mt-3 pt-3 border-t border-cyan-900 flex flex-wrap gap-2">
                    {[1, 2, 3].map(slot => {
                      const existing = userMonsters.find(m => m.slot === slot);
                      const isUnlocked = slot <= unlockedSlots || !!existing;
                      if (!isUnlocked) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => { handleAddMonster(slot, bm.monster_id); setPromotingBenchId(null); }}
                          className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg text-white"
                        >
                          {existing ? `Replace ${monsterDisplay[existing.monster_id]?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {caughtMonsters.map(caught => {
            // Deliberately ALL_MONSTERS, not monsterDisplay — a bench catch is
            // always the ungraduated tier-1 form (user_caught_monsters has no
            // graduation_tier column; only a promoted team monster can be
            // graduated), so it must never render via the species-wide
            // graduation-aware display override, even if the player's own
            // team already owns a graduated instance of this same species.
            const def = ALL_MONSTERS[caught.monster_id];
            if (!def) return null;
            const scaled = getScaledStats(def, caught.monster_level);
            return (
              <div key={caught.id} className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0">
                    <MonsterImage monster={def} className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{def.name} <span className="text-gray-400 text-sm">Lv.{caught.monster_level}</span></p>
                    <p className="text-xs text-gray-500 capitalize">{def.element} · {def.archetype.replace('_', ' ')}</p>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.hp}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.attack}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.defense}</p>
                    <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3.5 h-3.5 object-contain" /> {scaled.speed}</p>
                  </div>
                  <button
                    onClick={() => setPromotingId(promotingId === caught.id ? null : caught.id)}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    → Move to Team
                  </button>
                </div>
                {promotingId === caught.id && (
                  <div className="mt-3 pt-3 border-t border-cyan-900 flex flex-wrap gap-2">
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
                          {existing ? `Replace ${monsterDisplay[existing.monster_id]?.name || existing.monster_id} (Slot ${slot})` : `Empty Slot ${slot}`}
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
// bypasses MonsterImage so the emoji fallback can't leak a hint about the
// mystery species underneath. Callers overlay their own LegendaryBadge
// (isLegendary is safe to reveal — it doesn't identify the species).
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

// One Compendium tile — a plain species, a single evolution tier of a guild
// companion, or a graduation stage of a regular monster (each tier/stage
// gets its own card; see CompendiumPanel).
interface DexEntry {
  key: string;
  speciesId: string; // the underlying monster_id (DB key) — same across all tiers/stages of a species
  def: MonsterDef;    // tier-appropriate display def (name/emoji/spriteId), stats/skills always the base species values
  tier: 1 | 2 | 3;
  unlockLevel: number;   // guild level (guild tiers) or monster level (graduation tiers) required to reveal this tier; 1 for a plain tier1 entry
  guildLabel?: string;   // e.g. "Lorekeeper" — only set for guild-tier entries, used in the locked hint
  isGraduationTier?: boolean; // true for a species' graduated-form card (tier 2/3 = first/second graduation)
}

function CompendiumPanel({ userId, userMonsters, caughtMonsters, seenMonsterIds, monsterDisplay, subclassProfile, inventory, onLoadoutChange }: {
  userId: UserId;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  seenMonsterIds: string[];
  monsterDisplay: Record<string, MonsterDef>;
  subclassProfile: SubclassProfile | null;
  inventory: InventoryMap;
  onLoadoutChange: () => Promise<void> | void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<{ fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; speciesId: string; targetTier: 1 | 2 } | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ monsterRowId: string; slotIndex: number } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);

  const handleUnlearn = async (monsterRowId: string, slotIndex: number) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await unlearnMonsterSkill(userId, monsterRowId, slotIndex);
      if (ok) await onLoadoutChange();
      else alert('Could not unlearn that skill — make sure you have an Unlearn Scroll.');
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleLearn = async (monsterRowId: string, slotIndex: number, skillId: string, scrollKey: string) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await learnMonsterSkill(userId, monsterRowId, slotIndex, skillId, scrollKey);
      if (ok) {
        setPendingSlot(null);
        await onLoadoutChange();
      } else {
        alert('Could not learn that skill — make sure you still have that scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleGraduate = async (monsterRowId: string, requiredLevel: number, targetTier: 1 | 2, speciesId: string, currentTier: number, monsterLevel: number) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    try {
      const ok = await graduateMonster(userId, monsterRowId, requiredLevel, targetTier);
      if (ok) {
        const speciesDef = ALL_MONSTERS[speciesId];
        // Snapshot before/after display defs now, off the pre-refresh data —
        // the ceremony below renders from this snapshot, so it's unaffected
        // by onLoadoutChange()'s refresh (fired in the background here)
        // updating userMonsters/inventory underneath it.
        setCeremony({
          fromDef: getGraduatedMonsterDisplay(speciesDef, currentTier),
          toDef: getGraduatedMonsterDisplay(speciesDef, targetTier),
          monsterLevel,
          speciesId,
          targetTier,
        });
        onLoadoutChange();
      } else {
        alert('Could not graduate — make sure the monster has reached the required level and you have a Graduation Scroll.');
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const ownedSpeciesIds = new Set([
    ...userMonsters.map(m => m.monster_id),
    ...caughtMonsters.map(c => c.monster_id),
  ]);
  const knownSpeciesIds = new Set([...ownedSpeciesIds, ...seenMonsterIds]);
  const isKnownSpecies = (id: string) => {
    // Event-exclusive curios never appear wild, so seen_monsters can't apply —
    // they're a mystery until actually claimed/owned.
    if (EVENT_MONSTERS[id]) return ownedSpeciesIds.has(id);
    return !WILD_MONSTERS[id] || knownSpeciesIds.has(id);
  };

  // A player only ever owns one instance of a given species, so this lookup
  // (used below for both the "active graduation tier" checks) is unambiguous.
  const graduationTierForSpecies = (speciesId: string) => userMonsters.find(m => m.monster_id === speciesId)?.graduation_tier ?? 0;

  const dexEntries: DexEntry[] = [];
  for (const def of Object.values(ALL_MONSTERS)) {
    if (def.guildEvolution) {
      const guildLabel = GUILDS.find(g => g.key === def.guildEvolution!.guildKey)?.label;
      ([1, 2, 3] as const).forEach(tier => {
        const unlockLevel = tier === 1 ? GUILD_MONSTER_GRANT_LEVEL : tier === 2 ? def.guildEvolution!.tier2.level : def.guildEvolution!.tier3.level;
        dexEntries.push({
          key: `${def.id}__t${tier}`,
          speciesId: def.id,
          def: getGuildMonsterTierDef(def, tier),
          tier,
          unlockLevel,
          guildLabel,
        });
      });
      continue;
    }
    dexEntries.push({ key: def.id, speciesId: def.id, def, tier: 1, unlockLevel: 1 });
    if (def.graduation) {
      const maxTier = getMaxGraduationTier(def);
      for (let t = 1; t <= maxTier; t++) {
        const graduationTier = t as 1 | 2;
        dexEntries.push({
          key: `${def.id}__grad${graduationTier}`,
          speciesId: def.id,
          def: getGraduatedMonsterDisplay(def, graduationTier),
          tier: (graduationTier + 1) as 2 | 3, // base entry is tier 1, so first/second graduation land on tier 2/3
          unlockLevel: GRADUATION_LEVEL_REQUIREMENT[graduationTier],
          isGraduationTier: true,
        });
      }
    }
  }

  // Whether a given dex entry is revealed. Plain species use the existing
  // wild-encounter "known" rule; guild-tier entries (including tier 1 — the
  // companion is a reward, not a starter) are revealed purely by the owning
  // player's guild level crossing that tier's threshold; graduation-tier
  // entries are revealed only once the player has actually purchased that
  // graduation on their owned instance (it's not auto-computed from level).
  const isEntryKnown = (entry: DexEntry) => {
    if (entry.isGraduationTier) return graduationTierForSpecies(entry.speciesId) >= entry.tier - 1;
    if (!entry.guildLabel) return isKnownSpecies(entry.speciesId);
    const guildDef = ALL_MONSTERS[entry.speciesId];
    const guildLevel = guildLevelForKey(subclassProfile, guildDef.guildEvolution?.guildKey);
    return guildLevel >= entry.unlockLevel;
  };

  const selectedEntry = selectedKey ? dexEntries.find(e => e.key === selectedKey) ?? null : null;
  const selected = selectedEntry?.def ?? null;
  const selectedKnown = selectedEntry ? isEntryKnown(selectedEntry) : false;
  const selectedOwned = selectedEntry ? ownedSpeciesIds.has(selectedEntry.speciesId) : false;
  // Only the tile matching the species' *currently active* tier shows the
  // owned/team badge — as guild level rises (or a monster gets graduated),
  // the badge visually "moves" to the new tier's card.
  const selectedIsActiveTier = selectedEntry
    ? (selectedEntry.guildLabel
        ? selectedEntry.tier === getGuildMonsterTier(ALL_MONSTERS[selectedEntry.speciesId], guildLevelForKey(subclassProfile, ALL_MONSTERS[selectedEntry.speciesId].guildEvolution?.guildKey))
        : selectedEntry.tier === graduationTierForSpecies(selectedEntry.speciesId) + 1)
    : false;
  // The actual team row for the selected species, if any — a player only
  // ever owns one instance of a given monster, so this lookup is unambiguous.
  // Only team monsters (not benched catches) have an editable skill loadout.
  // Gated on selectedIsActiveTier so a species' now-superseded tier (e.g. the
  // pre-graduation form after graduating) reads as unowned, same as any dex
  // entry the player never actually holds — no skill editing, no team badge.
  const ownedMonster = selectedEntry && selectedIsActiveTier ? userMonsters.find(m => m.monster_id === selectedEntry.speciesId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white font-display">📖 Compendium</h3>
        <p className="text-xs text-gray-500">Every curio species in the game. Wild-only species stay a mystery silhouette until you encounter one on the Training Map.</p>
      </div>

      {ceremony && (
        <GraduationCeremonyModal
          fromDef={ceremony.fromDef}
          toDef={ceremony.toDef}
          monsterLevel={ceremony.monsterLevel}
          userId={userId}
          onGoToCompendium={() => {
            setSelectedKey(`${ceremony.speciesId}__grad${ceremony.targetTier}`);
            setCeremony(null);
          }}
        />
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl battle-panel-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedKey(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none btn-tactile"
              aria-label="Close"
            >
              ✕
            </button>
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
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border capitalize ${ELEMENT_STYLES[selected.element]}`}>
                      <img src={ELEMENT_ICON_SRC[selected.element]} alt="" className="w-3 h-3 object-contain" />
                      {selected.element}
                    </span>
                    <span className="text-[10px] text-gray-500 capitalize">{selected.archetype.replace('_', ' ')}</span>
                    {selectedOwned && selectedIsActiveTier && <span className="text-[10px] text-green-500 font-bold">✅ In your collection</span>}
                    {selectedEntry?.guildLabel && <span className="text-[10px] text-gray-500">Tier {selectedEntry.tier} · {selectedEntry.guildLabel} Lv.{selectedEntry.unlockLevel}+</span>}
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
                  {ownedMonster ? (
                    <div className="space-y-2">
                      {getEquippedSkills(ownedMonster.equipped_skills, selected).map((skill, i) => {
                        const slotIndex = i + 1;
                        const isPending = pendingSlot?.monsterRowId === ownedMonster.id && pendingSlot.slotIndex === slotIndex;
                        const unlearnQty = inventory['unlearn_scroll'] || 0;
                        const slotScrolls = SCROLL_CATALOG.filter(s =>
                          s.skillId && (s.element === selected.element || s.category === 'universal') && (inventory[s.key] || 0) > 0
                        );
                        return (
                          <div key={i} className="border border-neutral-800 rounded-lg p-2">
                            {skill ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs min-w-0">
                                  <span className="font-bold text-white">{skill.name}</span>
                                  <span className="text-gray-500"> — {skill.description}</span>
                                </div>
                                <button
                                  onClick={() => handleUnlearn(ownedMonster.id, slotIndex)}
                                  disabled={unlearnQty === 0 || actionBusy}
                                  className="text-[10px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded text-white flex-shrink-0"
                                >
                                  {unlearnQty === 0 ? 'Need Unlearn Scroll' : 'Unlearn'}
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-500 italic">Empty slot</span>
                                  <button
                                    onClick={() => setPendingSlot(isPending ? null : { monsterRowId: ownedMonster.id, slotIndex })}
                                    className="text-[10px] bg-amber-800 hover:bg-amber-700 px-2 py-1 rounded text-white flex-shrink-0"
                                  >
                                    {isPending ? 'Cancel' : 'Teach a Skill'}
                                  </button>
                                </div>
                                {isPending && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {slotScrolls.length === 0 ? (
                                      <p className="text-[10px] text-gray-600 italic">No scrolls owned for this slot yet — buy some in the Rewards Vault.</p>
                                    ) : (
                                      slotScrolls.map(s => (
                                        <button
                                          key={s.key}
                                          disabled={actionBusy}
                                          onClick={() => handleLearn(ownedMonster.id, slotIndex, s.skillId!, s.key)}
                                          className="text-[10px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 px-2 py-1 rounded text-white"
                                        >
                                          {s.name} (x{inventory[s.key]})
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
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
                  )}
                </div>
                {selectedEntry && !selectedEntry.isGraduationTier && ownedMonster && ALL_MONSTERS[selectedEntry.speciesId].graduation && (() => {
                  const speciesDef = ALL_MONSTERS[selectedEntry.speciesId];
                  const grad = speciesDef.graduation!;
                  const maxTier = getMaxGraduationTier(speciesDef);
                  const currentTier = ownedMonster.graduation_tier ?? 0;
                  if (currentTier >= maxTier) return null;
                  const targetTier = (currentTier + 1) as 1 | 2;
                  const stage = targetTier === 2 && grad.second ? grad.second : grad.first;
                  const requiredLevel = GRADUATION_LEVEL_REQUIREMENT[targetTier];
                  const scrollQty = inventory['graduation_scroll'] || 0;
                  const levelMet = ownedMonster.monster_level >= requiredLevel;
                  return (
                    <div className="border border-amber-900 bg-amber-900/10 rounded-lg p-3">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Graduation</p>
                      <p className="text-xs text-gray-400 mb-2">
                        Reach Lv.{requiredLevel} and use a Graduation Scroll to graduate into <span className="font-bold text-white">{stage.name}</span>.
                      </p>
                      <button
                        onClick={() => handleGraduate(ownedMonster.id, requiredLevel, targetTier, selectedEntry.speciesId, currentTier, ownedMonster.monster_level)}
                        disabled={!levelMet || scrollQty === 0 || actionBusy}
                        className="text-[10px] bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded text-white"
                      >
                        {!levelMet ? `Need Lv.${requiredLevel} (currently Lv.${ownedMonster.monster_level})` : scrollQty === 0 ? 'Need Graduation Scroll' : `Graduate to ${stage.name} (x${scrollQty} Scroll)`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="relative w-28 h-28 flex-shrink-0">
                <MonsterSilhouette id={selected.spriteId ?? selected.id} className="w-full h-full" />
                {selected.isLegendary && <LegendaryBadge />}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl font-bold text-white font-display">???</p>
                {selectedEntry?.guildLabel ? (
                  <p className="text-sm text-gray-500 mt-2">
                    🔒 Reach {selectedEntry.guildLabel} Level {selectedEntry.unlockLevel} to {selectedEntry.tier === 1 ? 'earn this companion' : 'reveal this graduation'}.
                  </p>
                ) : selectedEntry?.isGraduationTier ? (
                  <p className="text-sm text-gray-500 mt-2">
                    🔒 Reach Lv.{selectedEntry.unlockLevel} and use a Graduation Scroll on your {ALL_MONSTERS[selectedEntry.speciesId].name} to reveal this graduation.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">A mysterious wild curio — its identity is still unknown. Keep answering questions on the Training Map for a chance to encounter it.</p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {dexEntries.map(entry => {
          const known = isEntryKnown(entry);
          const owned = ownedSpeciesIds.has(entry.speciesId);
          const speciesDef = ALL_MONSTERS[entry.speciesId];
          // Same formula for the base tier (always tier 1) and graduation
          // tiers alike, so a species' now-superseded pre-graduation card
          // stops showing the owned/team badge once graduated past it.
          const isActiveTier = entry.guildLabel
            ? entry.tier === getGuildMonsterTier(speciesDef, guildLevelForKey(subclassProfile, speciesDef.guildEvolution!.guildKey))
            : entry.tier === graduationTierForSpecies(entry.speciesId) + 1;
          const inTeam = userMonsters.find(m => m.monster_id === entry.speciesId);
          return (
            <button
              key={entry.key}
              onClick={() => setSelectedKey(entry.key)}
              className={`p-3 rounded-xl border text-center transition-colors ${
                selectedKey === entry.key ? 'border-amber-400 bg-amber-900/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
              }`}
            >
              <div className="relative w-14 h-14 mx-auto mb-2">
                {known ? (
                  <MonsterImage monster={entry.def} className="w-full h-full" emojiClassName="text-3xl" />
                ) : (
                  <>
                    <MonsterSilhouette id={entry.def.spriteId ?? entry.speciesId} className="w-full h-full" />
                    {entry.def.isLegendary && <LegendaryBadge />}
                  </>
                )}
              </div>
              <p className="text-xs font-bold text-white truncate">{known ? entry.def.name : '???'}</p>
              {(entry.guildLabel || entry.isGraduationTier) && <p className="text-[9px] text-gray-600">Tier {entry.tier}</p>}
              {known && owned && isActiveTier && (
                inTeam ? (
                  <p className="text-[9px] text-green-500">✅ In Team</p>
                ) : (
                  <p className="text-[9px] text-amber-500">📦 Benched</p>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN MONSTER GUILD ───────────────────────────────────────────────────────

type GuildView = 'map' | 'team' | 'trainers' | 'compendium' | 'battle' | 'live_battle' | 'leaderboard';

interface WildEncounterState {
  monsterId: string;
  level: number;
  question: any;
  attemptsLeft: number;
}

export default function MonsterGuild({ userId, playerLevel, packageData, liveBattleInbox, pendingLiveBattleId, onConsumePendingLiveBattle, onBattleWon, onGoldAwarded, initialView }: MonsterGuildProps) {
  const [loading, setLoading] = useState(true);
  const [userMonsters, setUserMonsters] = useState<UserMonster[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [view, setView] = useState<GuildView>(initialView ?? 'map');
  // World Map — null shows the region picker; a region id enters that
  // region's Training Map. 'ledgers_heart' behaves exactly like the original
  // single Training Map (unfiltered encounters, DB-persisted position).
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
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
  const [revealMonster, setRevealMonster] = useState<MonsterDef | null>(null);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [answeredArenaIds, setAnsweredArenaIds] = useState<Set<string>>(new Set());
  const [subclassProfile, setSubclassProfile] = useState<SubclassProfile | null>(null);

  // ALL_MONSTERS, but with each guild companion swapped for the display tier
  // the player's guild level currently allows — name/emoji/description/base
  // stats all come from that tier (skills/skillUnlocks never change).
  const displayMonsters: Record<string, MonsterDef> = { ...ALL_MONSTERS };
  for (const id of Object.keys(GUILD_MONSTERS)) {
    const def = GUILD_MONSTERS[id];
    const guildLevel = guildLevelForKey(subclassProfile, def.guildEvolution?.guildKey);
    displayMonsters[id] = getGuildMonsterDisplay(def, guildLevel);
  }
  // A player only ever owns one team instance of a given species — layer its
  // purchased graduation tier (see MonsterDef.graduation) onto that species'
  // display, same as guild companions above but keyed on the owned instance's
  // own graduation_tier column instead of guild level.
  for (const m of userMonsters) {
    const def = ALL_MONSTERS[m.monster_id];
    if (def?.graduation) {
      displayMonsters[m.monster_id] = getGraduatedMonsterDisplay(displayMonsters[m.monster_id] ?? def, m.graduation_tier);
    }
  }

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
    const [monstersRes, stateRes, invData, answeredIds, caughtRes, subProfile] = await Promise.all([
      supabase.from('user_monsters').select('*').eq('user_id', userId).order('slot'),
      supabase.from('user_battle_state').select('*').eq('user_id', userId).single(),
      fetchInventory(userId),
      fetchAnsweredArenaQuestionIds(userId),
      supabase.from('user_caught_monsters').select('*').eq('user_id', userId).order('caught_at', { ascending: false }),
      fetchSubclassProfile(userId),
    ]);
    setUserMonsters(monstersRes.data || []);
    setBattleState(stateRes.data || null);
    setInventory(invData || {});
    setAnsweredArenaIds(answeredIds);
    setCaughtMonsters(caughtRes.data || []);
    setSubclassProfile(subProfile);
    setLoading(false);
  };

  // Refreshes just userMonsters + inventory after a Compendium learn/unlearn
  // — unlike loadData()'s full reload, this never touches `loading`, so the
  // Compendium's local selectedKey/pendingSlot state survives the refresh
  // instead of the panel unmounting mid-interaction.
  const refreshMonsterLoadouts = async () => {
    const [monstersRes, invData] = await Promise.all([
      supabase.from('user_monsters').select('*').eq('user_id', userId).order('slot'),
      fetchInventory(userId),
    ]);
    setUserMonsters(monstersRes.data || []);
    setInventory(invData || {});
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
    const monsters: TrainerMonster[] = userMonsters.filter(um => um.slot !== null).map(um => {
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
    // Elemental World Map regions restrict wild encounters to their own
    // element; 'ledgers_heart' (or no active region) stays fully unfiltered.
    const activeRegionDef = activeRegion ? REGIONS[activeRegion] : null;
    const allowedElements = activeRegionDef && activeRegionDef.element !== 'all' ? [activeRegionDef.element] : undefined;
    const monsterId = pickRandomWildMonsterId(ownedLegendaryCount, allowedElements);
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
    // Bumped monster isn't lost — set_team_slot benches it (slot -> NULL) in
    // place, keeping its own row (and level/exp/equipped_skills) untouched,
    // so it comes back exactly as it was if it's ever slotted in again. The
    // caught record only seeds a *fresh* row if this species has never been
    // owned before; an already-owned (possibly benched) instance keeps its
    // real progress instead of being reset to the new catch's stats.
    const { error } = await supabase.rpc('set_team_slot', {
      p_user_id: userId, p_monster_id: caught.monster_id, p_slot: slot,
      p_init_level: caught.monster_level, p_init_exp: caught.monster_exp,
    });
    if (error) {
      console.error('set_team_slot error:', error);
      return;
    }
    await supabase.from('user_caught_monsters').delete().eq('id', caught.id);
    showNotification(`${displayMonsters[caught.monster_id]?.name} joined your team!`);
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
      .not('slot', 'is', null)
      .order('slot');

    if (!opponentMonsters || opponentMonsters.length === 0) {
      showNotification(`${opponentName} has no curios yet!`);
      return;
    }

    // Resolve the opponent's own guild-companion tier and graduation (name/
    // emoji/description/stats) so a fully-evolved/graduated curio fights as
    // strong as it looks, same as displayMonsters does for the local player
    // above (graduation and guildEvolution are mutually exclusive per
    // species, so applying both here is never a double-boost).
    const opponentSubclassProfile = await fetchSubclassProfile(opponentId);
    const opponentTeam: ActiveBattleMonster[] = opponentMonsters.map((um: any) => {
      const baseDef = ALL_MONSTERS[um.monster_id];
      const guildDef = baseDef.guildEvolution
        ? getGuildMonsterDisplay(baseDef, guildLevelForKey(opponentSubclassProfile, baseDef.guildEvolution.guildKey))
        : baseDef;
      const def = baseDef.graduation ? getGraduatedMonsterDisplay(guildDef, um.graduation_tier ?? 0) : guildDef;
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
      const leveledUp = newLevel > m.monster_level;
      if (leveledUp) playCurioLevelUp();
      showNotification(`+${exp} EXP for ${displayMonsters[m.monster_id]?.name}!${leveledUp ? ` 🎉 Level Up! Now Lv.${newLevel}!` : ''}`);
      return { ...m, monster_exp: newExp, monster_level: newLevel };
    }));
  };

  const handleBattleEnd = async (won: boolean, expEarned: number) => {
    const today = new Date().toISOString().split('T')[0];

    if (isWildEncounterBattle && activeBattle) {
      const wildMonsterId = activeBattle.monsters[0].monsterId;
      const wildLevel = activeBattle.monsters[0].level;
      if (won) {
        const wasNew = !userMonsters.some(m => m.monster_id === wildMonsterId)
          && !caughtMonsters.some(m => m.monster_id === wildMonsterId);
        if (wasNew) {
          // monster_exp must stay consistent with monster_level under
          // getMonsterLevel's exp/100+1 formula — every later EXP gain
          // recomputes level purely from monster_exp, so seeding exp at 0
          // for a non-1 wildLevel would make the monster's level collapse
          // back to 1 the instant it earned any EXP after being promoted.
          await supabase.from('user_caught_monsters').insert({
            user_id: userId, monster_id: wildMonsterId, monster_level: wildLevel, monster_exp: (wildLevel - 1) * BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL,
          });
        }
        await supabase.from('user_battle_state').update({ last_wild_encounter_win: today }).eq('user_id', userId);
        setBattleState(prev => prev ? { ...prev, last_wild_encounter_win: today } : prev);
        if (wasNew) {
          setRevealMonster(ALL_MONSTERS[wildMonsterId]);
          logAction(userId, today, 'battle', `🐉 Captured wild ${activeBattle.name}!`, 0, 0);
        } else {
          // Already own this species (active or in the catch inbox) — a
          // duplicate catch converts to gold instead of piling up unused rows.
          onGoldAwarded(DUPLICATE_CATCH_GOLD);
          showNotification(`✨ You already have ${activeBattle.name} — converted to ${DUPLICATE_CATCH_GOLD} gold!`);
          logAction(userId, today, 'battle', `✨ ${activeBattle.name} was a duplicate — converted to ${DUPLICATE_CATCH_GOLD} gold`, 0, DUPLICATE_CATCH_GOLD);
        }
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
        logAction(userId, today, 'battle', `🥊 Beat the Training Dummy — +${expEarned} Curio EXP`, expEarned, 0);
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
      logAction(userId, today, 'battle', `🏆 Defeated Trainer ${activeBattle.name} — +${expEarned} Curio EXP`, expEarned, 0);
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
    return userMonsters.filter(um => um.slot !== null).map(um => {
      const def = displayMonsters[um.monster_id];
      const hp = getScaledStats(def, um.monster_level).hp;
      return { def, level: um.monster_level, currentHp: hp, maxHp: hp, status: null, statusTurns: 0, restUsed: 0, userMonster: um } as ActiveBattleMonster;
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 animate-pulse">Loading Curio Guild...</div>;
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

      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-white">Curio Arena</h2>
        <p className="text-xs text-gray-500 mt-1">Train, catch, and battle with every curio species in the game.</p>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 mb-8 border-b border-neutral-800">
        {([
          { id: 'map',        label: 'World Map' },
          { id: 'team',       label: 'My Team' },
          { id: 'trainers',   label: 'Trainers' },
          { id: 'compendium', label: `Compendium${caughtMonsters.length > 0 ? ` (${caughtMonsters.length})` : ''}` },
          { id: 'leaderboard', label: 'Leaderboard' },
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

      {/* Map view — World Map region picker, or the selected region's Training Map */}
      {view === 'map' && battleState && (
        activeRegion ? (
          <TrainingMap
            userId={userId}
            battleState={battleState}
            userMonsters={userMonsters}
            caughtMonsters={caughtMonsters}
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
            monsterDisplay={displayMonsters}
            regionId={activeRegion}
            onExitRegion={() => setActiveRegion(null)}
          />
        ) : (
          <WorldMap playerLevel={playerLevel} onSelectRegion={setActiveRegion} />
        )
      )}

      {/* Team view */}
      {view === 'team' && (
        <TeamPanel
          userMonsters={userMonsters}
          playerLevel={playerLevel}
          userId={userId}
          onTeamChange={loadData}
          monsterDisplay={displayMonsters}
          caughtMonsters={caughtMonsters}
          onPromote={handlePromoteCaughtMonster}
        />
      )}

      {/* Compendium view — dex-style reference; wild-only species stay a silhouette
          until encountered, and rare wild catches surface here to promote into a team slot */}
      {view === 'compendium' && (
        <CompendiumPanel
          userId={userId}
          caughtMonsters={caughtMonsters}
          userMonsters={userMonsters}
          seenMonsterIds={battleState?.seen_monsters || []}
          monsterDisplay={displayMonsters}
          subclassProfile={subclassProfile}
          inventory={inventory}
          onLoadoutChange={refreshMonsterLoadouts}
        />
      )}

      {view === 'leaderboard' && <LeaderboardPanel userId={userId} />}

      {/* Trainers view */}
      {view === 'trainers' && battleState && (
        <div className="space-y-4">
          {/* PvP — Challenge To A Battle */}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const alreadyWonToday = battleState?.last_pvp_win === today;
            const otherPlayers = getOtherPlayers(userId as UserId).filter(p => liveBattleInbox.onlinePlayerIds.has(p.id));
            return (
              <div className="border border-indigo-800 bg-indigo-900/10 rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
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
                  <button
                    onClick={() => liveBattleInbox.refreshPresence()}
                    className="text-xs bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    title="Refresh online list"
                  >
                    🔄 Refresh
                  </button>
                </div>
                <div className="space-y-2">
                  {otherPlayers.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No one else is online right now.</p>
                  )}
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

          <h3 className="text-lg font-bold text-white font-display">NPC Trainers</h3>
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
                {userMonsters.filter(um => um.slot !== null).map((um, i) => {
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

      {revealMonster && (
        <CurioRevealModal monster={revealMonster} userId={userId} onClose={() => setRevealMonster(null)} />
      )}
    </div>
  );
}
