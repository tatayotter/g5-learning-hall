'use client';
import { useState, useRef, useEffect } from 'react';
import { playAttackWhoosh, playHitThud, playMiss, playVictory, playDefeat, playItemUse, startBattleTheme, stopBattleTheme, pauseBattleTheme } from '@/lib/sounds';
import { USERS } from '@/lib/userSession';
import {
  ALL_MONSTERS, SKILLS, BATTLE_CONSTANTS,
  getAvailableSkillTiers, calculateDamage, getScaledStats, getEquippedSkills,
  getModifierMultiplier, tickModifiers, applySkillEffects, statusDuration, tickStatus,
  REST_BY_ELEMENT, ELEMENT_STATUS, SELF_TARGETING_ELEMENT_STATUSES, STATUS_DEFINITIONS,
  StatusEffect, NpcTrainer, getSkillIconSrc,
} from '@/lib/monsterConfig';
import { SHOP_CATALOG, InventoryMap } from '@/lib/inventory';
import {
  ActiveBattleMonster, MonsterImage, BattleQuestionModal,
  BattleBeat, runBattleBeats, resolveItemEffect, getSkillSlotLock,
} from '@/components/battle/shared';
import BattleStage, { ActionTile, PlaceholderTile } from '@/components/battle/BattleStage';
import PostBattleSummary from '@/components/battle/PostBattleSummary';
import InfoTag from '@/components/InfoTag';

interface BattleScreenProps {
  userId: string;
  playerTeam: ActiveBattleMonster[];
  trainer?: NpcTrainer;
  siblingTeam?: ActiveBattleMonster[];
  siblingName?: string;
  questions: any[];
  gradingUserId: string;
  inventory: InventoryMap;
  onUseItem: (key: string) => Promise<boolean>;
  onBattleEnd: (won: boolean, expEarned: number) => void;
  onQuestionsAnswered?: (questions: any[]) => void;
}

export default function BattleScreen({ userId, playerTeam, trainer, siblingTeam, siblingName, questions, gradingUserId, inventory, onUseItem, onBattleEnd, onQuestionsAnswered }: BattleScreenProps) {
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
  const [banner, setBanner] = useState<{ text: string; iconSrc: string | null } | null>(null);
  const [playerDamagePopup, setPlayerDamagePopup] = useState<{ key: number; value: number; missed: boolean } | null>(null);
  const [npcDamagePopup, setNpcDamagePopup] = useState<{ key: number; value: number; missed: boolean } | null>(null);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [battleResult, setBattleResult] = useState<{ won: boolean; exp: number; reason: 'ko' | 'surrender' } | null>(null);
  const [itemBusy, setItemBusy] = useState(false);
  const itemBusyRef = useRef(false);

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
    startBattleTheme();
    return () => stopBattleTheme();
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
    // Every status (including burn/paralyze, which used to be hardcoded to
    // never clear here — the cause of a monster staying paralyzed forever)
    // wears off once its duration runs out, same as any other status.
    const wasStatus = updated.status;
    const ticked = tickStatus(updated.status, updated.statusTurns);
    updated.status = ticked.status;
    updated.statusTurns = ticked.statusTurns;
    if (wasStatus && !updated.status) {
      msgs.push(`${updated.def.name}'s ${wasStatus} wore off!`);
    }
    return [updated, msgs];
  };

  // The skill an NPC curio counter-attacks with — same tier gating players
  // get (skillUnlocks tier2/tier3), so a low-level NPC can't use a move it
  // wouldn't actually have learned yet.
  const getNpcSkill = (attacker: ActiveBattleMonster) => {
    const tier = attacker.level >= 15 ? 3 : attacker.level >= 8 ? 2 : 1;
    return SKILLS[attacker.def.skills[tier - 1]];
  };

  // Shared by doNpcTurn's normal counter-attack and handleQuestionsComplete's
  // speed-preemption check below, so the stat/defense/def_boost math can't
  // drift between the two call sites. Uses the same calculateDamage formula
  // as the player's own attacks and live PVP (lib/liveBattle.ts /
  // hooks/useLiveBattle.ts) — full ATK stat, the NPC's real skill multiplier,
  // elemental type, mitigated by the defender's DEF — instead of a flat
  // per-tier number, so every battle mode (trainer, wild encounter, training
  // dummy, PVP) scales damage the same way. NPCs don't answer questions, so
  // NPC_COUNTER_ACCURACY stands in for a real correct/total ratio — without
  // it every NPC hit would land at a player's "perfect answer" damage, every
  // single turn, which is far harder than any player ever has to face.
  const computeNpcDamage = (attacker: ActiveBattleMonster, defender: ActiveBattleMonster): number => {
    const skill = getNpcSkill(attacker);
    const atkMult = getModifierMultiplier(attacker.modifiers, 'atk');
    const defMult = getModifierMultiplier(defender.modifiers, 'def');
    let dmg = calculateDamage(
      skill,
      getScaledStats(attacker.def, attacker.level, attacker.userMonster?.quality).attack * atkMult,
      BATTLE_CONSTANTS.NPC_COUNTER_ACCURACY.correct,
      BATTLE_CONSTANTS.NPC_COUNTER_ACCURACY.total,
      attacker.def.element,
      defender.def.element,
      attacker.status === 'blessed',
      getScaledStats(defender.def, defender.level, defender.userMonster?.quality).defense * defMult,
    );
    if (attacker.status === 'atk_boost') dmg *= BATTLE_CONSTANTS.ATK_BOOST_MULTIPLIER;
    if (attacker.status === 'curse') dmg *= (1 - BATTLE_CONSTANTS.CURSE_DAMAGE_REDUCTION);
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
    // doNpcTurn (below) now runs synchronously and reads playerMonstersRef —
    // which only picks up this heal on the NEXT render. Syncing the ref here
    // too keeps that same-tick read from clobbering the heal with stale,
    // pre-Rest HP (see playerMonstersRef's declaration comment above).
    playerMonstersRef.current = updated;
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

    playItemUse();

    switch (item.effect) {
      case 'heal_30':
      case 'heal_60':
      case 'heal_120':
      case 'atk_boost_1t':
      case 'def_boost_1t':
      case 'apply_blessed':
      case 'cure_status':
      case 'inflict_curse': {
        const result = resolveItemEffect(item);
        if (result.healAmount !== undefined) {
          const newHp = Math.min(playerMon.maxHp, playerMon.currentHp + result.healAmount);
          setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, currentHp: newHp } : m));
        } else if (result.selfStatus) {
          const { status, statusTurns } = result.selfStatus;
          setPlayerMonsters(prev => prev.map((m, i) => i === playerMonsterIdx ? { ...m, status, statusTurns } : m));
        } else if (result.opponentStatus) {
          const { status, statusTurns } = result.opponentStatus;
          setNpcMonsters(prev => prev.map((m, i) => i === npcMonsterIdx ? { ...m, status, statusTurns } : m));
        }
        addLog(result.logMessage);
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

    playItemUse();

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
      && getScaledStats(npcMon.def, npcMon.level, npcMon.userMonster?.quality).speed > getScaledStats(playerMon.def, playerMon.level, playerMon.userMonster?.quality).speed;
    if (npcIsFaster) {
      const preemptDamage = computeNpcDamage(npcMon, playerMon);
      const preemptAttackVerb = `uses ${getNpcSkill(npcMon).name}`;
      if (playerMon.currentHp - preemptDamage <= 0) {
        let updatedPlayerAfterPreempt: ActiveBattleMonster[] = playerMonsters;
        const beat: BattleBeat = {
          actor: 'opponent',
          message: `${npcMon.def.name} is faster and strikes first!`,
          iconSrc: null,
          damage: preemptDamage,
          missed: false,
          apply: () => {
            playHitThud();
            triggerAnim('player', 'battle-hit');
            setPlayerDamagePopup({ key: Date.now(), value: preemptDamage, missed: false });
            addLog(`⚡ ${npcMon.def.name} is faster and ${preemptAttackVerb} for ${preemptDamage} damage before you can move!`);
            const newHp = Math.max(0, playerMon.currentHp - preemptDamage);
            updatedPlayerAfterPreempt = playerMonsters.map((m, i) => i === playerMonsterIdx ? { ...m, currentHp: newHp } : m);
            setPlayerMonsters(updatedPlayerAfterPreempt);
          },
        };
        runBattleBeats([beat], b => setBanner({ text: b.message, iconSrc: b.iconSrc }), () => {
          setBanner(null);
          addLog(`${playerMon.def.name} fainted before it could attack!`);
          const nextIdx = updatedPlayerAfterPreempt.findIndex((m, i) => i !== playerMonsterIdx && m.currentHp > 0);
          if (nextIdx === -1) {
            addLog('All your curios fainted! You lost!');
            playDefeat();
            pauseBattleTheme();
            setBattleResult({ won: false, exp: 0, reason: 'ko' });
            setPhase('ended');
          } else {
            setPlayerMonsterIdx(nextIdx);
            playerMonsterIdxRef.current = nextIdx;
            addLog(`Go, ${updatedPlayerAfterPreempt[nextIdx].def.name}!`);
            setPhase('select_skill');
          }
        });
        return;
      }
    }

    const atkMult = getModifierMultiplier(playerMon.modifiers, 'atk');
    const defMult = getModifierMultiplier(npcMon.modifiers, 'def');
    const accuracyBonus = getModifierMultiplier(playerMon.modifiers, 'accuracy');

    let damage = calculateDamage(
      skill,
      getScaledStats(playerMon.def, playerMon.level, playerMon.userMonster?.quality).attack * atkMult,
      correctCount,
      askedCount,
      playerMon.def.element,
      npcMon.def.element,
      isBlessed,
      getScaledStats(npcMon.def, npcMon.level, npcMon.userMonster?.quality).defense * defMult,
      accuracyBonus,
    );

    if (playerMon.status === 'atk_boost') {
      damage = Math.round(damage * BATTLE_CONSTANTS.ATK_BOOST_MULTIPLIER);
    }

    if (playerMon.status === 'curse') {
      damage = Math.round(damage * (1 - BATTLE_CONSTANTS.CURSE_DAMAGE_REDUCTION));
    }

    const missed = damage === 0 && !skill.effects?.length;
    let msg: string;
    if (missed) {
      msg = `❌ ${playerMon.def.name} used ${skill.name}, but the attack missed! (wrong answer)`;
    } else {
      msg = `${playerMon.def.name} used ${skill.name}! (${correctCount}/${skill.questionCount} correct) → ${damage} damage!`;
    }

    let newNpcMonsters = [...npcMonsters];
    let newNpcMon = { ...npcMon, currentHp: Math.max(0, npcMon.currentHp - damage) };

    // A perfect hit's ELEMENT_STATUS effect is either a debuff (burn/paralyze/
    // curse — applied to whoever got hit) or a buff (blessed — applied to the
    // caster's own next attack instead). selfBlessed is folded into
    // newPlayerMonsters below rather than set here directly.
    let selfBlessed = false;
    if (isPerfect && ELEMENT_STATUS[playerMon.def.element]) {
      const effect = ELEMENT_STATUS[playerMon.def.element]!;
      if (SELF_TARGETING_ELEMENT_STATUSES.includes(effect)) {
        selfBlessed = true;
        msg += ` ${STATUS_DEFINITIONS[effect].emoji} ${playerMon.def.name} is ${effect}!`;
      } else {
        newNpcMon.status = effect;
        newNpcMon.statusTurns = statusDuration(effect);
        msg += ` ${STATUS_DEFINITIONS[effect].emoji} ${newNpcMon.def.name} is ${effect}!`;
      }
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
      // Consume any blessed carried in from a prior turn (it just powered
      // this attack via isBlessed above), then re-bless for the next turn if
      // this hit itself earned a fresh one.
      if (updated.status === 'blessed') updated.status = null as StatusEffect;
      if (selfBlessed) { updated.status = 'blessed' as StatusEffect; updated.statusTurns = statusDuration('blessed'); }
      if (effectResult.casterHpDelta !== 0) {
        updated.currentHp = Math.max(0, Math.min(updated.maxHp, updated.currentHp + effectResult.casterHpDelta));
      }
      if (effectResult.cleanseCaster) {
        updated.status = null;
        updated.statusTurns = 0;
      }
      return updated;
    });

    const playerBeat: BattleBeat = {
      actor: 'player',
      message: `${playerMon.def.name} used ${skill.name}!`,
      iconSrc: getSkillIconSrc(skill),
      damage,
      missed,
      apply: () => {
        playAttackWhoosh();
        triggerAnim('player', 'battle-attack-right');
        if (missed) { playMiss(); } else { playHitThud(); triggerAnim('npc', 'battle-hit'); }
        setNpcDamagePopup({ key: Date.now(), value: damage, missed });
        addLog(msg);
        setNpcMonsters(newNpcMonsters);
        setPlayerMonsters(newPlayerMonsters);
      },
    };

    runBattleBeats([playerBeat], b => setBanner({ text: b.message, iconSrc: b.iconSrc }), () => {
      setBanner(null);
      if (newNpcMon.currentHp <= 0) {
        addLog(`${newNpcMon.def.name} fainted!`);
        const nextNpc = npcMonsterIdx + 1;
        if (nextNpc >= (trainer?.monsters.length ?? npcMonsters.length)) {
          const earned = trainer?.reward.exp ?? 0;
          setExpEarned(earned);
          addLog(`You defeated ${opponentName}!`);
          playVictory();
          pauseBattleTheme();
          setBattleResult({ won: true, exp: earned, reason: 'ko' });
          setPhase('ended');
          return;
        }
        setNpcMonsterIdx(nextNpc);
        addLog(`${opponentName} sends out ${npcMonsters[nextNpc]?.def.name || 'another curio'}!`);
      }
      doNpcTurn();
    });
  };

  const doNpcTurn = () => {
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
      // A full round still passed for the player even though the NPC's turn
      // was skipped — tick their own status (item buffs like atk_boost/
      // def_boost) down too, so those don't linger forever either.
      const [updatedPlayer, playerMsgs] = applyStatusTick(currentPlayer);
      playerMsgs.forEach(addLog);
      setNpcMonsters(npcMonstersRef.current.map((m, i) => i === npcMonsterIdx ? updatedNpc : m));
      setPlayerMonsters(playerMonstersRef.current.map((m, i) => i === currentIdx ? updatedPlayer : m));
      setPhase('select_skill');
      return;
    }

    const damage = computeNpcDamage(currentNpc, currentPlayer);

    if (currentPlayer.status === 'def_boost') {
      addLog(`🛡️ ${currentPlayer.def.name}'s Iron Shield blocked half the damage!`);
    }

    const [tickedNpc, tickMsgs] = applyStatusTick(currentNpc);
    tickedNpc.modifiers = tickModifiers(tickedNpc.modifiers);
    const newHp = Math.max(0, currentPlayer.currentHp - damage);
    // Ticks the player's own status (atk_boost/def_boost/blessed) down for
    // this round too — mirrors the NPC's own tick above, so a one-turn item
    // buff can't stay active turn after turn.
    const [tickedPlayer, playerTickMsgs] = applyStatusTick({ ...currentPlayer, currentHp: newHp });

    const npcAttackVerb = `uses ${getNpcSkill(currentNpc).name}`;

    let updatedPlayerAfterNpc: ActiveBattleMonster[] = playerMonstersRef.current;
    const npcBeat: BattleBeat = {
      actor: 'opponent',
      message: `${currentNpc.def.name} ${npcAttackVerb}!`,
      iconSrc: null,
      damage,
      missed: false,
      apply: () => {
        playHitThud();
        triggerAnim('player', 'battle-hit');
        setPlayerDamagePopup({ key: Date.now(), value: damage, missed: false });
        addLog(`${currentNpc.def.name} ${npcAttackVerb} for ${damage} damage!`);
        tickMsgs.forEach(addLog);
        playerTickMsgs.forEach(addLog);
        updatedPlayerAfterNpc = playerMonstersRef.current.map((m, i) =>
          i === currentIdx
            ? { ...m, currentHp: tickedPlayer.currentHp, status: tickedPlayer.status, statusTurns: tickedPlayer.statusTurns, modifiers: tickModifiers(m.modifiers) }
            : m
        );
        const updatedNpc = npcMonstersRef.current.map((m, i) => i === npcMonsterIdx ? tickedNpc : m);
        setPlayerMonsters(updatedPlayerAfterNpc);
        setNpcMonsters(updatedNpc);
      },
    };

    runBattleBeats([npcBeat], b => setBanner({ text: b.message, iconSrc: b.iconSrc }), () => {
      setBanner(null);
      if (tickedPlayer.currentHp <= 0) {
        addLog(`${currentPlayer.def.name} fainted!`);
        const nextIdx = updatedPlayerAfterNpc.findIndex((m, i) => i !== currentIdx && m.currentHp > 0);
        if (nextIdx === -1) {
          addLog('All your curios fainted! You lost!');
          playDefeat();
          pauseBattleTheme();
          setBattleResult({ won: false, exp: 0, reason: 'ko' });
          setPhase('ended');
        } else {
          setPlayerMonsterIdx(nextIdx);
          playerMonsterIdxRef.current = nextIdx;
          addLog(`Go, ${updatedPlayerAfterNpc[nextIdx].def.name}!`);
          setPhase('select_skill');
        }
      } else {
        setPhase('select_skill');
      }
    });
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
    pauseBattleTheme();
    setBattleResult({ won: false, exp: 0, reason: 'surrender' });
    setPhase('ended');
  };

  const availableTiers = getAvailableSkillTiers(playerMon.level, playerMon.def);
  const equippedSkills = getEquippedSkills(playerMon.userMonster?.equipped_skills, playerMon.def);
  const restConfig = REST_BY_ELEMENT[playerMon.def.element];

  if (phase === 'ended' && battleResult) {
    const me = USERS[userId];
    const opponentAvatarSrc = trainer ? (trainer.spriteOverride ?? `/trainers/${trainer.id}.png`) : '/userpics/userpics_premium/ssb3.png';
    const opponentFallbackEmoji = trainer?.emoji ?? '⚔️';
    const reasonLabel = battleResult.reason === 'surrender' ? 'You surrendered' : 'Fight complete';

    return (
      <PostBattleSummary
        outcome={battleResult.won ? 'win' : 'loss'}
        reasonLabel={reasonLabel}
        left={{ avatarSrc: me?.avatar || '/userpics/userpics_premium/ssb3.png', name: me?.fullName ?? userId, mon: playerMon, isWinner: battleResult.won }}
        right={{ avatarSrc: opponentAvatarSrc, avatarFallbackEmoji: opponentFallbackEmoji, avatarContain: !!trainer?.spriteOverride, name: opponentName, mon: npcMon, isWinner: !battleResult.won }}
        log={log}
        rewardLine={battleResult.won && battleResult.exp > 0 ? `+${battleResult.exp} Curio EXP earned!` : undefined}
        onContinue={() => onBattleEnd(battleResult.won, battleResult.exp)}
      />
    );
  }

  const playerDisplayName = USERS[userId]?.fullName ?? userId;

  const overlay = phase === 'answering' && pendingSkillId ? (
    <div className="w-full max-w-xl bg-neutral-900 border border-amber-700 rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in">
      <div className="flex items-center gap-3 mb-2 bg-amber-900/20 border border-amber-800 rounded-xl px-3 py-2">
        <MonsterImage monster={playerMon.def} className="w-9 h-9 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">{playerMon.def.name} uses {SKILLS[pendingSkillId]?.name}!</p>
          <p className="text-xs text-gray-300 leading-tight">
            Answer <span className="text-amber-400 font-bold">{questionCount}/{questionCount}</span> correctly for full damage
            {questionCount > 1 && <span className="text-gray-500 text-xs ml-1"> · partial = half damage</span>}
          </p>
        </div>
      </div>
      <BattleQuestionModal
        questions={questions}
        count={questionCount}
        embedded={true}
        gradingUserId={gradingUserId}
        onComplete={handleQuestionsComplete}
      />
    </div>
  ) : phase === 'select_item' ? (
    <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-4 space-y-2 max-h-full overflow-y-auto battle-panel-in">
      <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
        <img src="/icons/stats/items.svg" alt="" className="w-4 h-4 object-contain" /> Select an Item
      </p>
      {/* player_inventory also holds non-battle rows (userpic cosmetics,
          skill scrolls, the Compendium-only graduation scroll) — only show
          entries that are actual battle consumables, not just anything the
          player owns. */}
      {(() => {
        const battleItems = Object.entries(inventory).filter(([key, qty]) => {
          if (!qty || qty <= 0) return false;
          const itemData = SHOP_CATALOG.find(i => i.key === key);
          return !!itemData && itemData.effect !== 'graduate_monster';
        });

        if (battleItems.length === 0) {
          return <p className="text-gray-500 text-sm text-center">No items in inventory.</p>;
        }

        return battleItems.map(([key, qty]) => {
          const itemData = SHOP_CATALOG.find(i => i.key === key)!;
          const noReviveTargets = itemData.effect === 'revive' && faintedPlayerMonsters.length === 0;

          return (
            <button
              key={key}
              onClick={() => handleItemUse(key)}
              disabled={itemBusy || noReviveTargets}
              className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-3 text-left flex items-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
            >
              <img src={itemData.icon} alt={itemData.name} className="w-8 h-8 object-contain flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm capitalize">{itemData.name}</p>
                <p className="text-xs text-gray-400">{noReviveTargets ? 'No fainted curios to revive' : itemData.desc}</p>
              </div>
              <span className="bg-neutral-700 text-yellow-400 font-bold px-3 py-1 rounded-full text-xs">x{qty}</span>
            </button>
          );
        });
      })()}
      <button
        onClick={() => setPhase('select_skill')}
        className="w-full text-gray-500 text-sm mt-2 hover:text-white transition-colors btn-tactile"
      >
        Cancel
      </button>
    </div>
  ) : phase === 'select_switch' ? (
    <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-4 space-y-2 max-h-full overflow-y-auto battle-panel-in">
      <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
        <img src="/icons/stats/switch.svg" alt="" className="w-4 h-4 object-contain" /> Switch Curio
      </p>
      {otherAlivePlayerMonsters.length === 0 ? (
        <p className="text-gray-500 text-sm text-center">No other curios available.</p>
      ) : (
        otherAlivePlayerMonsters.map(({ m, i }) => (
          <button
            key={i}
            onClick={() => handleSwitchMonster(i)}
            className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-3 text-left flex items-center gap-3 transition-all btn-tactile"
          >
            <div className="w-9 h-9">
              <MonsterImage monster={m.def} className="w-full h-full" emojiClassName="text-2xl" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{m.def.name} Lv.{m.level}</p>
              <p className="text-xs text-gray-400">{m.currentHp}/{m.maxHp} HP</p>
            </div>
          </button>
        ))
      )}
      <button
        onClick={() => setPhase('select_skill')}
        className="w-full text-gray-500 text-sm mt-2 hover:text-white transition-colors btn-tactile"
      >
        Cancel
      </button>
    </div>
  ) : phase === 'select_revive_target' ? (
    <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-4 space-y-2 max-h-full overflow-y-auto battle-panel-in">
      <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
        <img src="/icons/rewards/gift.svg" alt="" className="w-4 h-4 object-contain" /> Revive Which Curio?
      </p>
      {faintedPlayerMonsters.length === 0 ? (
        <p className="text-gray-500 text-sm text-center">No fainted curios available.</p>
      ) : (
        faintedPlayerMonsters.map(({ m, i }) => (
          <button
            key={i}
            onClick={() => handleReviveTarget(i)}
            disabled={itemBusy}
            className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl p-3 text-left flex items-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
          >
            <div className="w-9 h-9">
              <MonsterImage monster={m.def} className="w-full h-full" emojiClassName="text-2xl" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{m.def.name} Lv.{m.level}</p>
              <p className="text-xs text-gray-400">0/{m.maxHp} HP — Fainted</p>
            </div>
          </button>
        ))
      )}
      <button
        onClick={() => setPhase('select_item')}
        className="w-full text-gray-500 text-sm mt-2 hover:text-white transition-colors btn-tactile"
      >
        Cancel
      </button>
    </div>
  ) : confirmSurrender ? (
    <div className="w-full max-w-sm bg-neutral-950 border border-red-900 rounded-2xl p-4 text-center space-y-3 battle-panel-in">
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
  ) : null;

  const actionPanel = phase !== 'npc_turn' ? (
    <div>
      <div className="bstage-moves">
        {([1, 2, 3] as const).map(tier => {
          const equippedSkill = equippedSkills[tier - 1];
          const { isLocked, requiredLevel } = getSkillSlotLock(playerMon.userMonster?.equipped_skills, playerMon.def, tier, availableTiers);
          if (isLocked) {
            return <PlaceholderTile key={tier} title={`🔒 ${SKILLS[playerMon.def.skills[tier - 1]]?.name}`} sub={`Unlocks at Lv.${requiredLevel}`} />;
          }
          if (!equippedSkill) {
            return <PlaceholderTile key={tier} title="Empty slot" sub="Teach a skill from the Compendium" />;
          }
          return (
            <ActionTile
              key={tier}
              onClick={() => handleSkillSelect(equippedSkill.id)}
              icon={<img src={getSkillIconSrc(equippedSkill)} alt="" className="w-7 h-7 object-contain" />}
              title={equippedSkill.name}
              sub={`${equippedSkill.questionCount} question${equippedSkill.questionCount > 1 ? 's' : ''} · Tier ${tier}`}
              element={equippedSkill.element}
            />
          );
        })}
      </div>

      <div className="bstage-utils mt-[7px]">
        <ActionTile
          onClick={handleRest}
          disabled={playerMon.restUsed >= restConfig.maxUsesPerBattle}
          icon={<img src="/icons/stats/rest.svg" alt="" className="w-7 h-7 object-contain" />}
          title={<>Rest <InfoTag text="Heals your curio and uses up this turn — the trainer's curio still attacks normally. Limited uses per battle." /></>}
          sub={`Restore ${Math.round(restConfig.hpRestorePercent * 100)}% HP`}
        />
        <ActionTile
          onClick={() => setPhase('select_item')}
          icon={<img src="/icons/stats/items.svg" alt="" className="w-7 h-7 object-contain" />}
          title={<>Items <InfoTag text="Using an item also uses up this turn — the trainer's curio still attacks normally." /></>}
          sub="Use items from inventory"
        />
        <ActionTile
          onClick={() => setPhase('select_switch')}
          disabled={otherAlivePlayerMonsters.length === 0}
          icon={<img src="/icons/stats/switch.svg" alt="" className="w-7 h-7 object-contain" />}
          title={<>Switch <InfoTag text="Swap to another curio on your team — also uses up this turn." /></>}
          sub={otherAlivePlayerMonsters.length > 0 ? 'Change your curio' : 'No other curios'}
        />
        <ActionTile
          onClick={() => setConfirmSurrender(true)}
          danger
          icon={<img src="/icons/stats/surrender.svg" alt="" className="w-7 h-7 object-contain" />}
          title={<>Surrender <InfoTag text="Ends the battle immediately with no Curio EXP earned." /></>}
          sub="Forfeit the match"
        />
      </div>
    </div>
  ) : null;

  const statusBanner = phase === 'npc_turn' ? (
    <p className="text-sm text-gray-300 bg-black/50 inline-block px-3 py-1 rounded-full animate-pulse">Opponent is attacking...</p>
  ) : null;

  return (
    <BattleStage
      leftName={playerDisplayName}
      rightName={opponentName}
      leftMon={{ name: playerMon.def.name, level: playerMon.level, def: playerMon.def, currentHp: playerMon.currentHp, maxHp: playerMon.maxHp, status: playerMon.status, animClassName: playerAnim, damagePopup: playerDamagePopup, quality: playerMon.userMonster?.quality }}
      rightMon={{ name: npcMon.def.name, level: npcMonsters[npcMonsterIdx].level, def: npcMon.def, currentHp: npcMon.currentHp, maxHp: npcMon.maxHp, status: npcMon.status, animClassName: npcAnim, damagePopup: npcDamagePopup, quality: npcMon.userMonster?.quality }}
      log={log}
      banner={banner}
      statusBanner={statusBanner}
      actionPanel={actionPanel}
      overlay={overlay}
    />
  );
}
