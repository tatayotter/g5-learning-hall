'use client';
// components/LiveBattleScreen.tsx
// Real-time 1v1 PVP battle screen — "simultaneous racing rounds": both sides
// pick a skill and answer their own questions each round at the same time,
// synced via hooks/useLiveBattle.ts. See the plan for why this is a sibling
// to BattleScreen (components/MonsterGuild.tsx) rather than a retrofit of it:
// BattleScreen's phase machine is sequential/alternating (doNpcTurn-driven),
// which doesn't fit two independently-timed live sides.
//
// Each side tracks its own full roster (myRoster/oppRoster) + an active index.
// A player only ever mutates their own roster's active slot directly; the
// opponent's mirror is kept in sync purely via broadcasts (round outcomes,
// self_state_sync, monster_switch) — never written to speculatively.
import { useEffect, useRef, useState } from 'react';
import { useLiveBattle, TIMEOUT_ACTION_ID } from '@/hooks/useLiveBattle';
import { resolveBattle } from '@/lib/liveBattle';
import { ActiveBattleMonster, BattleQuestionModal, MonsterImage } from '@/components/battle/shared';
import MonsterHpPanel from '@/components/battle/MonsterHpPanel';
import { SKILLS, getAvailableSkillTiers, getEquippedSkills, REST_BY_ELEMENT, StatusEffect, BATTLE_CONSTANTS } from '@/lib/monsterConfig';
import PostBattleSummary from '@/components/battle/PostBattleSummary';
import { InventoryMap } from '@/lib/inventory';
import { SHOP_CATALOG } from '@/lib/inventory';
import { USERS } from '@/lib/userSession';
import { playAttackWhoosh, playHitThud, playVictory, playDefeat } from '@/lib/sounds';
import InfoTag from '@/components/InfoTag';

// Sentinel skillIds for non-skill round actions — not real SKILLS entries, so
// the round-resolution damage lookup in hooks/useLiveBattle.ts naturally
// treats them as dealing 0 damage (mirrors handleRest/handleItemUse in the
// solo BattleScreen).
const REST_ACTION_ID = '__rest__';
const ITEM_ACTION_ID = '__item__';
const SWITCH_ACTION_ID = '__switch__';

interface LiveBattleScreenProps {
  battleId: string;
  myUserId: string;
  opponentId: string;
  opponentName: string;
  side: 'challenger' | 'opponent';
  myTeam: ActiveBattleMonster[];
  opponentTeam: ActiveBattleMonster[];
  questions: any[];
  inventory: InventoryMap;
  onUseItem: (key: string) => Promise<boolean>;
  onBattleEnd: (won: boolean) => void;
  onBattleResultKnown?: (won: boolean) => void;
}

export default function LiveBattleScreen({
  battleId, myUserId, opponentId, opponentName, side, myTeam, opponentTeam, questions, inventory, onUseItem, onBattleEnd,
  onBattleResultKnown,
}: LiveBattleScreenProps) {
  const [myRoster, setMyRoster] = useState<ActiveBattleMonster[]>(myTeam);
  const [myActiveIdx, setMyActiveIdx] = useState(0);
  const [oppRoster, setOppRoster] = useState<ActiveBattleMonster[]>(opponentTeam);
  const [oppActiveIdx, setOppActiveIdx] = useState(0);
  const [log, setLog] = useState<string[]>([`Live battle started against ${opponentName}!`]);
  const [answering, setAnswering] = useState(false);
  const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [itemBusy, setItemBusy] = useState(false);
  const itemBusyRef = useRef(false);
  const battleMusicRef = useRef<HTMLAudioElement | null>(null);
  const [myAnim, setMyAnim] = useState('');
  const [oppAnim, setOppAnim] = useState('');

  const myMon = myRoster[myActiveIdx];
  const oppMon = oppRoster[oppActiveIdx];

  const myMonRef = useRef(myMon);
  myMonRef.current = myMon;
  const oppMonRef = useRef(oppMon);
  oppMonRef.current = oppMon;

  const {
    phase, round, deadlineAt, lastOutcome, forfeitedByOpponent, battleEnded,
    incomingStatusEffect, incomingSelfSync, incomingSwitch,
    submitRoundAnswer, advanceToNextRound, declareBattleEnd, registerMonsterGetters,
    sendStatusEffectToOpponent, clearIncomingStatusEffect,
    sendSelfStateSync, clearIncomingSelfSync,
    sendMonsterSwitch, clearIncomingSwitch,
  } = useLiveBattle(battleId, myUserId, side, SKILLS);
  const timedOutRoundRef = useRef<number | null>(null);

  const updateMyActive = (updater: (m: ActiveBattleMonster) => ActiveBattleMonster) => {
    setMyRoster(prev => prev.map((m, i) => (i === myActiveIdx ? updater(m) : m)));
  };
  const updateOppActive = (updater: (m: ActiveBattleMonster) => ActiveBattleMonster) => {
    setOppRoster(prev => prev.map((m, i) => (i === oppActiveIdx ? updater(m) : m)));
  };

  const addLog = (msg: string) => setLog(prev => [msg, ...prev.slice(0, 6)]);

  // Same reset-then-double-rAF pattern as the solo BattleScreen's triggerAnim
  // (components/MonsterGuild.tsx) — resetting to '' first forces the CSS
  // animation to restart even if the same class is applied on consecutive hits.
  const triggerAnim = (target: 'my' | 'opp', anim: string) => {
    const setter = target === 'my' ? setMyAnim : setOppAnim;
    setter('');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setter(anim);
        setTimeout(() => setter(''), 600);
      });
    });
  };

  // The countdown display below reads `now` rather than calling Date.now()
  // directly at render time — without this tick, secondsLeft would only ever
  // recompute when some other state change happens to trigger a re-render,
  // making the timer look frozen between broadcasts.
  useEffect(() => {
    if (!deadlineAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  // If the round timer runs out before a skill is picked, auto-submit a miss
  // instead of leaving the round stuck waiting forever. Guarded by round so
  // it fires at most once per round even though `now` keeps ticking after.
  useEffect(() => {
    if (phase !== 'select_skill' || answering) return;
    if (!deadlineAt || now < deadlineAt) return;
    if (timedOutRoundRef.current === round) return;
    timedOutRoundRef.current = round;
    submitRoundAnswer(TIMEOUT_ACTION_ID, 0, 0, false);
  }, [now, deadlineAt, phase, answering, round, submitRoundAnswer]);

  // A cross-effect item the opponent used against me (currently only
  // Poison Fang's inflict_curse) arrives here instead of through the normal
  // round-resolution path, since it's not tied to either side's skill pick.
  useEffect(() => {
    if (!incomingStatusEffect) return;
    updateMyActive(prev => ({ ...prev, status: incomingStatusEffect.status, statusTurns: incomingStatusEffect.statusTurns }));
    addLog(`${opponentName} inflicted ${incomingStatusEffect.status} on ${myMon.def.name}!`);
    clearIncomingStatusEffect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingStatusEffect]);

  // Mirrors the opponent's self-only Rest/item changes onto my view of their
  // active monster — without this, their HP/status badge on my screen goes
  // stale and our two clients' independent round-damage math can diverge.
  useEffect(() => {
    if (!incomingSelfSync) return;
    updateOppActive(prev => ({ ...prev, ...incomingSelfSync }));
    clearIncomingSelfSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSelfSync]);

  // The opponent switched their active monster (manually, or forced by a
  // faint) — mirror the index locally. oppRoster[idx] already holds that
  // monster's correct last-known HP/status since bench members never change
  // state while inactive, so no extra data needs to travel with the switch.
  useEffect(() => {
    if (!incomingSwitch) return;
    const newMon = oppRoster[incomingSwitch.idx];
    setOppActiveIdx(incomingSwitch.idx);
    if (newMon) {
      addLog(incomingSwitch.forced
        ? `${oppMon.def.name} fainted! ${opponentName} sends out ${newMon.def.name}!`
        : `${opponentName} switched to ${newMon.def.name}!`);
    }
    clearIncomingSwitch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSwitch]);

  useEffect(() => {
    registerMonsterGetters(() => myMonRef.current, () => oppMonRef.current);
  }, [registerMonsterGetters]);

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

  // Applies the round's resolved damage/status once, from whichever source
  // arrived first — my own resolveRound() call or the opponent's round_result.
  useEffect(() => {
    if (!lastOutcome) return;

    updateOppActive(prev => {
      let newHp = Math.max(0, prev.currentHp - lastOutcome.myDamageDealt);
      if (lastOutcome.oppHpDelta !== 0) newHp = Math.max(0, Math.min(prev.maxHp, newHp + lastOutcome.oppHpDelta));
      return {
        ...prev,
        currentHp: newHp,
        status: lastOutcome.oppCleanse ? null : lastOutcome.myStatusInflicted ?? prev.status,
        statusTurns: lastOutcome.oppCleanse ? 0 : prev.statusTurns,
        modifiers: lastOutcome.oppModifiers,
      };
    });
    updateMyActive(prev => {
      let newHp = Math.max(0, prev.currentHp - lastOutcome.opponentDamageDealt);
      if (lastOutcome.myHpDelta !== 0) newHp = Math.max(0, Math.min(prev.maxHp, newHp + lastOutcome.myHpDelta));
      return {
        ...prev,
        currentHp: newHp,
        status: lastOutcome.myCleanse ? null : lastOutcome.opponentStatusInflicted ?? prev.status,
        statusTurns: lastOutcome.myCleanse ? 0 : prev.statusTurns,
        modifiers: lastOutcome.myModifiers,
      };
    });

    if (lastOutcome.myDamageDealt > 0) playHitThud(); else playAttackWhoosh();

    if (lastOutcome.myDamageDealt > 0) {
      triggerAnim('my', 'battle-attack-right');
      triggerAnim('opp', 'battle-hit');
    }
    if (lastOutcome.opponentDamageDealt > 0) {
      triggerAnim('opp', 'battle-attack-left');
      triggerAnim('my', 'battle-hit');
    }

    if (lastOutcome.myTimedOut) {
      addLog(`⏰ Your attack missed! (took too long to decide)`);
    } else if (lastOutcome.myAttackMissed) {
      addLog(`❌ Your attack missed! (wrong answer)`);
    } else if (lastOutcome.myDamageDealt > 0) {
      addLog(`You dealt ${lastOutcome.myDamageDealt} damage!`);
    }
    if (lastOutcome.opponentTimedOut) {
      addLog(`⏰ ${opponentName}'s attack missed! (took too long to decide)`);
    } else if (lastOutcome.opponentAttackMissed) {
      addLog(`${opponentName}'s attack missed! (wrong answer)`);
    } else if (lastOutcome.opponentDamageDealt > 0) {
      addLog(`${opponentName} dealt ${lastOutcome.opponentDamageDealt} damage to you!`);
    }
    if (lastOutcome.speedWinner === 'me') {
      addLog(`⚡ You were faster — your hit landed first!`);
    } else if (lastOutcome.speedWinner === 'opponent') {
      addLog(`⚡ ${opponentName} was faster and struck first!`);
    }
    if (lastOutcome.myHpDelta > 0) addLog(`💚 Your skill restored ${lastOutcome.myHpDelta} HP!`);
    if (lastOutcome.oppHpDelta > 0) addLog(`💚 ${opponentName}'s skill restored ${lastOutcome.oppHpDelta} HP!`);
    if (lastOutcome.myCleanse) addLog(`🧼 Your status conditions were cleansed!`);
    if (lastOutcome.oppCleanse) addLog(`🧼 ${opponentName}'s status conditions were cleansed!`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOutcome]);

  // Once HP updates from the round above land: if my own active monster
  // fainted and I still have a live teammate, auto-switch (mirrors the solo
  // BattleScreen's auto-advance). The match only actually ends once one
  // side's whole roster is down — only one of the two racing clients' calls
  // actually writes the result (see lib/liveBattle.ts:resolveBattle).
  useEffect(() => {
    if (resolving || battleEnded) return;
    const myFainted = myMon.currentHp <= 0;
    const oppFainted = oppMon.currentHp <= 0;
    if (!myFainted && !oppFainted) return;

    const myWiped = myRoster.every(m => m.currentHp <= 0);
    const oppWiped = oppRoster.every(m => m.currentHp <= 0);

    if (myFainted && !myWiped) {
      const nextIdx = myRoster.findIndex((m, i) => i !== myActiveIdx && m.currentHp > 0);
      if (nextIdx !== -1) {
        addLog(`${myMon.def.name} fainted! Go, ${myRoster[nextIdx].def.name}!`);
        setMyActiveIdx(nextIdx);
        sendMonsterSwitch(nextIdx, true);
      }
    }

    if (myWiped || oppWiped) {
      setResolving(true);
      const won = oppWiped && !myWiped;
      const winnerId = myWiped && oppWiped ? null : (won ? myUserId : opponentId);
      addLog(won ? `${opponentName} was defeated!` : 'All your curios fainted!');
      (won ? playVictory : playDefeat)();
      battleMusicRef.current?.pause();
      declareBattleEnd(winnerId, 'ko');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMon.currentHp, oppMon.currentHp]);

  // Once a round resolves and nobody fainted (or the auto-switch above has
  // already replaced a fainted monster with a live one), kick off the next
  // round. Only the challenger's client sends round_start (stable
  // tie-breaker — see hooks/useLiveBattle.ts), so only it schedules the advance.
  useEffect(() => {
    if (phase !== 'round_resolved') return;
    if (side !== 'challenger') return;
    if (myMon.currentHp <= 0 || oppMon.currentHp <= 0) return; // KO effect above will end the battle instead
    const timer = setTimeout(() => advanceToNextRound(), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myMon.currentHp, oppMon.currentHp, side]);

  // Whichever client's battle_end fires first calls the Edge Function; the
  // second call is a harmless no-op read of the already-resolved row. The
  // player reviews the fight summary screen below and leaves via its own
  // button rather than being auto-navigated away.
  useEffect(() => {
    if (!battleEnded) return;
    const winnerMonsterId = battleEnded.winnerId === myUserId
      ? myRoster[myActiveIdx]?.userMonster?.id
      : battleEnded.winnerId === opponentId
        ? oppRoster[oppActiveIdx]?.userMonster?.id
        : undefined;
    resolveBattle(battleId, battleEnded.winnerId, battleEnded.reason as any, winnerMonsterId);
    // Fires the instant the result is known, rather than waiting for this
    // player to click "Continue" on the summary screen below — otherwise
    // onlookers' training maps keep showing a blinking "in battle" badge
    // (and never see the win/loss emoji) until both players click through.
    onBattleResultKnown?.(battleEnded.winnerId === myUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleEnded]);

  const handleSkillSelect = (skillId: string) => {
    setPendingSkillId(skillId);
    setAnswering(true);
  };

  const handleQuestionsComplete = (correctCount: number, answeredQuestions: any[]) => {
    setAnswering(false);
    if (!pendingSkillId) return;
    const skill = SKILLS[pendingSkillId];
    // Falls back to skill.questionCount when the modal wasn't able to ask
    // that many questions (e.g. a tier-3 skill wants 3 but the unseen-
    // question pool for that subject only had 2 left) — scoring against
    // however many were actually asked, so a capped-down round can still
    // register as a perfect hit instead of being permanently unreachable.
    const askedCount = answeredQuestions.length || skill.questionCount;
    const isPerfect = correctCount === askedCount;
    addLog(`You used ${skill.name}! (${correctCount}/${askedCount} correct)`);
    submitRoundAnswer(pendingSkillId, correctCount, askedCount, isPerfect);
    setPendingSkillId(null);
  };

  // Rest heals immediately (no questions) and still counts as this round's
  // action — the opponent's attack this round still lands normally, same as
  // the solo BattleScreen's handleRest.
  const restConfig = REST_BY_ELEMENT[myMon.def.element];
  const handleRest = () => {
    if (myMon.restUsed >= restConfig.maxUsesPerBattle) return;
    const healAmount = Math.round(myMon.maxHp * restConfig.hpRestorePercent);
    const newHp = Math.min(myMon.maxHp, myMon.currentHp + healAmount);
    const newRestUsed = myMon.restUsed + 1;
    updateMyActive(prev => ({ ...prev, currentHp: newHp, restUsed: newRestUsed }));
    sendSelfStateSync({ currentHp: newHp, restUsed: newRestUsed });
    addLog(`${myMon.def.name} used Rest and restored ${healAmount} HP!`);
    submitRoundAnswer(REST_ACTION_ID, 0, 0, false);
  };

  // Using an item consumes this round's action, same as Rest — the opponent's
  // pick still resolves against me normally. Self-targeting effects (heal,
  // buffs, cure, revive) apply directly to local state; the one
  // opponent-targeting effect (inflict_curse) is broadcast so their client
  // applies it to their own monster (see incomingStatusEffect above).
  const handleUseItem = async (key: string) => {
    // onUseItem is an async DB round-trip — without this guard, clicking the
    // same (or another) item several times before it resolves fires the item
    // multiple times in a single turn instead of once. The ref (not just
    // itemBusy state) makes the guard effective immediately, since a state
    // update isn't guaranteed to have committed before the next click event.
    if (itemBusyRef.current) return;
    const item = SHOP_CATALOG.find(i => i.key === key);
    if (!item) return;

    itemBusyRef.current = true;
    setItemBusy(true);

    const used = await onUseItem(key);
    if (!used) {
      itemBusyRef.current = false;
      setItemBusy(false);
      return;
    }

    setShowItemMenu(false);

    switch (item.effect) {
      case 'heal_30': {
        const healAmount = 30;
        const newHp = Math.min(myMon.maxHp, myMon.currentHp + healAmount);
        updateMyActive(prev => ({ ...prev, currentHp: newHp }));
        sendSelfStateSync({ currentHp: newHp });
        addLog(`🧪 Used ${item.name}: Restored ${healAmount} HP!`);
        break;
      }
      case 'atk_boost_1t':
        updateMyActive(prev => ({ ...prev, status: 'atk_boost' as StatusEffect, statusTurns: 1 }));
        sendSelfStateSync({ status: 'atk_boost' as StatusEffect, statusTurns: 1 });
        addLog(`⚔️ Used ${item.name}: Attack boosted!`);
        break;
      case 'def_boost_1t':
        updateMyActive(prev => ({ ...prev, status: 'def_boost' as StatusEffect, statusTurns: 1 }));
        sendSelfStateSync({ status: 'def_boost' as StatusEffect, statusTurns: 1 });
        addLog(`🛡️ Used ${item.name}: Defense boosted!`);
        break;
      case 'apply_blessed':
        updateMyActive(prev => ({ ...prev, status: 'blessed' as StatusEffect, statusTurns: 3 }));
        sendSelfStateSync({ status: 'blessed' as StatusEffect, statusTurns: 3 });
        addLog(`✨ Used ${item.name}: Blessed status applied!`);
        break;
      case 'cure_status':
        updateMyActive(prev => ({ ...prev, status: null, statusTurns: 0 }));
        sendSelfStateSync({ status: null, statusTurns: 0 });
        addLog(`💊 Used ${item.name}: Status conditions cured!`);
        break;
      case 'inflict_curse': {
        const statusTurns = BATTLE_CONSTANTS.CURSE_DURATION_TURNS;
        sendStatusEffectToOpponent('curse', statusTurns);
        addLog(`💀 Used ${item.name}: ${opponentName}'s curio is now Cursed!`);
        break;
      }
      case 'revive': {
        if (myMon.currentHp <= 0) {
          const newHp = Math.round(myMon.maxHp * 0.5);
          updateMyActive(prev => ({ ...prev, currentHp: newHp }));
          sendSelfStateSync({ currentHp: newHp });
          addLog(`🔄 Used ${item.name}: ${myMon.def.name} revived!`);
        } else {
          addLog('❌ Only works on fainted curios!');
        }
        break;
      }
      default:
        addLog(`Used ${item.name}!`);
    }

    submitRoundAnswer(ITEM_ACTION_ID, 0, 0, false);
    itemBusyRef.current = false;
    setItemBusy(false);
  };

  const otherAliveMonsters = myRoster
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => i !== myActiveIdx && m.currentHp > 0);

  const handleSwitchMonster = (idx: number) => {
    const newMon = myRoster[idx];
    if (!newMon || newMon.currentHp <= 0) return;
    addLog(`You switched to ${newMon.def.name}!`);
    setMyActiveIdx(idx);
    sendMonsterSwitch(idx, false);
    setShowSwitchMenu(false);
    submitRoundAnswer(SWITCH_ACTION_ID, 0, 0, false);
  };

  const handleSurrender = () => {
    setConfirmSurrender(false);
    addLog('You surrendered the battle.');
    battleMusicRef.current?.pause();
    playDefeat();
    declareBattleEnd(opponentId, 'surrender');
  };

  if (forfeitedByOpponent && !battleEnded) {
    addLog(`${opponentName} disconnected — you win!`);
  }

  const availableTiers = getAvailableSkillTiers(myMon.level, myMon.def);
  const equippedSkills = getEquippedSkills(myMon.userMonster?.equipped_skills, myMon.def);
  const secondsLeft = deadlineAt ? Math.max(0, Math.ceil((deadlineAt - now) / 1000)) : null;

  if (phase === 'ended' && battleEnded) {
    const iWon = battleEnded.winnerId === myUserId;
    const isDraw = !battleEnded.winnerId;
    const me = USERS[myUserId];
    const opponent = USERS[opponentId];

    const reasonLabel =
      battleEnded.reason === 'forfeit_disconnect' ? `${opponentName} disconnected`
      : battleEnded.reason === 'surrender' ? (iWon ? `${opponentName} surrendered` : 'You surrendered')
      : 'Fight complete';

    return (
      <PostBattleSummary
        outcome={isDraw ? 'draw' : iWon ? 'win' : 'loss'}
        reasonLabel={reasonLabel}
        left={{ avatarSrc: me?.avatar || '/userpics/Spr_RS_School_Kid_M.png', name: me?.fullName ?? myUserId, mon: myMon, isWinner: iWon }}
        right={{ avatarSrc: opponent?.avatar || '/userpics/Spr_RS_School_Kid_M.png', name: opponent?.fullName ?? opponentName, mon: oppMon, isWinner: !iWon && !isDraw }}
        log={log}
        onContinue={() => onBattleEnd(iWon)}
      />
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 battle-panel-in">
      <div className="flex justify-between items-start mb-6">
        <MonsterHpPanel
          name={myMon.def.name} level={myMon.level} def={myMon.def}
          currentHp={myMon.currentHp} maxHp={myMon.maxHp} status={myMon.status} align="left"
          animClassName={myAnim}
        />

        <div className="flex-1 mx-6 bg-black/30 rounded-xl p-3 h-32 overflow-y-auto">
          {phase === 'waiting_for_opponent' && (
            <p className="text-xs text-gray-400">Waiting for {opponentName} to join the battle channel...</p>
          )}
          {log.map((msg, i) => (
            <p key={i} className="text-xs text-gray-300 mb-1">{msg}</p>
          ))}
        </div>

        <MonsterHpPanel
          name={`${oppMon.def.name} (${opponentName})`} level={oppMon.level} def={oppMon.def}
          currentHp={oppMon.currentHp} maxHp={oppMon.maxHp} status={oppMon.status} align="right"
          animClassName={oppAnim}
        />
      </div>

      {phase === 'select_skill' && !answering && (
        <div>
          {secondsLeft !== null && <p className="text-xs text-amber-400 mb-2 font-mono">⏱ {secondsLeft}s to pick a skill</p>}

          {/* Row 1-2: the monster's 3 skill tiers (locked ones shown greyed
              out to nudge leveling) + Rest, in a fixed 2x2 grid. */}
          <div className="grid grid-cols-2 gap-2">
            {([1, 2, 3] as const).map(tier => {
              // See BattleScreen's identical logic (components/MonsterGuild.tsx)
              // — a customized slot (unlearned and/or re-taught) is usable
              // immediately regardless of level; only a still-default slot
              // stays gated by skillUnlocks.
              const slotValue = myMon.userMonster?.equipped_skills?.[tier - 1];
              const isCustomized = slotValue != null;
              const equippedSkill = equippedSkills[tier - 1];
              const isLocked = !isCustomized && !availableTiers.includes(tier);
              if (isLocked) {
                const requiredLevel = tier === 2 ? myMon.def.skillUnlocks.tier2 : myMon.def.skillUnlocks.tier3;
                return (
                  <div
                    key={tier}
                    className="p-3 rounded-xl border-2 border-dashed border-neutral-800 bg-neutral-950/50 text-left opacity-60"
                  >
                    <p className="text-sm font-bold text-gray-500">🔒 {SKILLS[myMon.def.skills[tier - 1]]?.name}</p>
                    <p className="text-xs text-amber-500/80">Unlocks at Lv.{requiredLevel}</p>
                  </div>
                );
              }
              if (!equippedSkill) {
                return (
                  <div
                    key={tier}
                    className="p-3 rounded-xl border-2 border-dashed border-neutral-800 bg-neutral-950/50 text-left opacity-60"
                  >
                    <p className="text-sm font-bold text-gray-500">Empty slot</p>
                    <p className="text-xs text-gray-600">Teach this curio a skill from the Compendium.</p>
                  </div>
                );
              }
              return (
                <button
                  key={tier}
                  onClick={() => handleSkillSelect(equippedSkill.id)}
                  className="p-3 rounded-xl border-2 border-neutral-700 hover:border-amber-500 text-left btn-tactile"
                >
                  <p className="text-sm font-bold text-white">{equippedSkill.name}</p>
                  <p className="text-xs text-gray-400">{equippedSkill.questionCount} question{equippedSkill.questionCount > 1 ? 's' : ''}</p>
                </button>
              );
            })}
            <button
              onClick={handleRest}
              disabled={myMon.restUsed >= restConfig.maxUsesPerBattle}
              className="p-3 rounded-xl border-2 border-neutral-700 hover:border-amber-500 text-left disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
            >
              <p className="text-sm font-bold text-white flex items-center gap-1">
                <img src="/icons/stats/rest.svg" alt="" className="w-4 h-4 object-contain" /> Rest <InfoTag text="Heals your monster and uses up this round's turn — the opponent still attacks normally. Limited uses per battle." />
              </p>
              <p className="text-xs text-gray-400">Restore {Math.round(restConfig.hpRestorePercent * 100)}% HP</p>
            </button>
          </div>

          <div className="border-t border-neutral-800 my-3" />

          {/* Row 3: Items / Switch Monster / Surrender. */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setShowItemMenu(true); setShowSwitchMenu(false); setConfirmSurrender(false); }}
              className="p-3 rounded-xl border-2 border-neutral-700 hover:border-amber-500 text-left btn-tactile"
            >
              <p className="text-sm font-bold text-white flex items-center gap-1">
                <img src="/icons/stats/items.svg" alt="" className="w-4 h-4 object-contain" /> Items <InfoTag text="Using an item also uses up this round's turn — the opponent still attacks normally." />
              </p>
              <p className="text-xs text-gray-400">Use an item</p>
            </button>
            <button
              onClick={() => { setShowSwitchMenu(true); setShowItemMenu(false); setConfirmSurrender(false); }}
              disabled={otherAliveMonsters.length === 0}
              className="p-3 rounded-xl border-2 border-neutral-700 hover:border-amber-500 text-left disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
            >
              <p className="text-sm font-bold text-white flex items-center gap-1">
                <img src="/icons/stats/switch.svg" alt="" className="w-4 h-4 object-contain" /> Switch <InfoTag text="Swap to another curio on your team — also uses up this round's turn." />
              </p>
              <p className="text-xs text-gray-400">{otherAliveMonsters.length > 0 ? 'Change your curio' : 'No other curios'}</p>
            </button>
            <button
              onClick={() => { setConfirmSurrender(true); setShowItemMenu(false); setShowSwitchMenu(false); }}
              className="p-3 rounded-xl border-2 border-red-900/60 hover:border-red-500 text-left btn-tactile"
            >
              <p className="text-sm font-bold text-red-400 flex items-center gap-1">
                <img src="/icons/stats/surrender.svg" alt="" className="w-4 h-4 object-contain" /> Surrender <InfoTag text="Ends the match immediately. You earn no EXP or Gold; your opponent wins with half EXP and no Gold." />
              </p>
              <p className="text-xs text-gray-400">Forfeit the match</p>
            </button>
          </div>
        </div>
      )}

      {phase === 'select_skill' && !answering && showItemMenu && (
        <div className="mt-4 bg-neutral-950 border border-neutral-700 rounded-2xl p-4 space-y-2">
          <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
            <img src="/icons/stats/items.svg" alt="" className="w-4 h-4 object-contain" /> Select an Item
          </p>
          {Object.entries(inventory).filter(([, qty]) => !!qty && qty > 0).length === 0 ? (
            <p className="text-gray-500 text-sm text-center">No items in inventory.</p>
          ) : (
            Object.entries(inventory).map(([key, qty]) => {
              if (!qty || qty <= 0) return null;
              const itemData = SHOP_CATALOG.find(i => i.key === key);
              if (!itemData) return null;
              return (
                <button
                  key={key}
                  onClick={() => handleUseItem(key)}
                  disabled={itemBusy}
                  className="w-full flex items-center justify-between bg-black/30 hover:bg-black/50 rounded-lg px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed btn-tactile"
                >
                  <span className="text-left flex items-center gap-2">
                    <img src={itemData.icon} alt={itemData.name} className="w-6 h-6 object-contain flex-shrink-0" />
                    <span>
                      <span className="text-sm font-bold text-white">{itemData.name}</span>
                      <span className="block text-xs text-gray-400">{itemData.desc}</span>
                    </span>
                  </span>
                  <span className="text-xs text-amber-400 font-mono">x{qty}</span>
                </button>
              );
            })
          )}
          <button
            onClick={() => setShowItemMenu(false)}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 pt-1 btn-tactile"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'select_skill' && !answering && showSwitchMenu && (
        <div className="mt-4 bg-neutral-950 border border-neutral-700 rounded-2xl p-4 space-y-2">
          <p className="text-white font-bold text-center mb-2 flex items-center justify-center gap-1">
            <img src="/icons/stats/switch.svg" alt="" className="w-4 h-4 object-contain" /> Switch Curio
          </p>
          {otherAliveMonsters.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">No other curios available.</p>
          ) : (
            otherAliveMonsters.map(({ m, i }) => (
              <button
                key={i}
                onClick={() => handleSwitchMonster(i)}
                className="w-full flex items-center justify-between bg-black/30 hover:bg-black/50 rounded-lg px-4 py-2 transition-colors btn-tactile"
              >
                <span className="text-left">
                  <span className="text-sm font-bold text-white">{m.def.name} Lv.{m.level}</span>
                  <span className="block text-xs text-gray-400">{m.currentHp}/{m.maxHp} HP</span>
                </span>
              </button>
            ))
          )}
          <button
            onClick={() => setShowSwitchMenu(false)}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 pt-1 btn-tactile"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'select_skill' && !answering && confirmSurrender && (
        <div className="mt-4 bg-neutral-950 border border-red-900 rounded-2xl p-4 text-center space-y-3">
          <p className="text-white font-bold">Surrender the battle?</p>
          <p className="text-xs text-gray-400">
            You'll earn no Monster EXP or Gold. {opponentName} will win with half EXP and no Gold.
          </p>
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

      {answering && pendingSkillId && (
        <BattleQuestionModal
          questions={questions}
          count={SKILLS[pendingSkillId].questionCount}
          embedded
          onComplete={handleQuestionsComplete}
        />
      )}

      {phase === 'awaiting_opponent' && !answering && (
        <p className="text-sm text-gray-400 text-center">Waiting for {opponentName} to finish their round...</p>
      )}

      {phase === 'round_resolved' && myMon.currentHp > 0 && oppMon.currentHp > 0 && (
        <p className="text-sm text-gray-400 text-center">Round resolved — next round starting...</p>
      )}
    </div>
  );
}
