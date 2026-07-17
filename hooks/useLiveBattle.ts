// hooks/useLiveBattle.ts
// Per-battle realtime channel for a live 1v1 PVP match ("simultaneous racing
// rounds" — see plan). Modeled on hooks/useMapPresence.ts's presence+broadcast
// pattern, extended with join/leave handling for forfeit detection.
import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Skill, calculateDamage, getElementMultiplier, getScaledStats, ELEMENT_STATUS, StatusEffect } from '@/lib/monsterConfig';
import { ActiveBattleMonster } from '@/components/battle/shared';

export type BattlePhase = 'waiting_for_opponent' | 'select_skill' | 'awaiting_opponent' | 'round_resolved' | 'ended';

// Sentinel skillId LiveBattleScreen submits when a player lets the round
// timer run out without picking a skill — not a real SKILLS entry, so
// resolveRound's damage lookup naturally treats it as 0 damage, same as
// Rest/an item/a switch. Exported (rather than defined in LiveBattleScreen)
// so resolveRound here can specifically flag it as a timeout miss rather
// than a deliberate 0-damage action.
export const TIMEOUT_ACTION_ID = '__timeout__';

export interface RoundOutcome {
  round: number;
  myDamageDealt: number;
  opponentDamageDealt: number;
  myStatusInflicted: StatusEffect;
  opponentStatusInflicted: StatusEffect;
  // True only when a real skill was picked (not Rest/an item) and every
  // question for it was answered wrong — distinct from a deliberate 0-damage
  // action, so the UI can say "your attack missed" rather than staying vague.
  myAttackMissed: boolean;
  opponentAttackMissed: boolean;
  // True when the side let the round timer expire without picking a skill —
  // logged with its own "took too long to decide" message, distinct from a
  // wrong-answer miss.
  myTimedOut: boolean;
  opponentTimedOut: boolean;
  // Set when both hits would have been mutually lethal this round and Speed
  // broke the tie — the named side's attack landed first, so the other
  // side's damage never happened (mirrors the solo BattleScreen's doNpcTurn
  // speed-preemption rule).
  speedWinner: 'me' | 'opponent' | null;
}

interface RoundAnswer {
  round: number;
  userId: string;
  skillId: string;
  correctCount: number;
  totalQuestions: number;
  isPerfect: boolean;
}

// Self-inflicted HP/status changes (Rest, self-buff/heal/cure/revive items)
// only ever happen on the acting client's own local monster state. Without
// this, the opponent's copy of that monster (rendered as their "oppMon")
// goes stale — its status badge and HP bar stop reflecting reality, and
// worse, each side's independent round-damage math (which reads local
// status like "blessed"/"def_boost") can silently diverge between screens.
export interface SelfStatePatch {
  currentHp?: number;
  status?: StatusEffect;
  statusTurns?: number;
  restUsed?: number;
}

const ROUND_DURATION_MS = 30_000;
const FORFEIT_GRACE_MS = 20_000;

export function useLiveBattle(
  battleId: string,
  userId: string,
  side: 'challenger' | 'opponent',
  skills: Record<string, Skill>,
) {
  const [phase, setPhase] = useState<BattlePhase>('waiting_for_opponent');
  const [round, setRound] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);
  const [forfeitedByOpponent, setForfeitedByOpponent] = useState(false);
  const [battleEnded, setBattleEnded] = useState<{ winnerId: string | null; reason: string } | null>(null);
  const [incomingStatusEffect, setIncomingStatusEffect] = useState<{ status: StatusEffect; statusTurns: number } | null>(null);
  const [incomingSelfSync, setIncomingSelfSync] = useState<SelfStatePatch | null>(null);
  const [incomingSwitch, setIncomingSwitch] = useState<{ idx: number; forced: boolean } | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const myAnswerRef = useRef<RoundAnswer | null>(null);
  const opponentAnswerRef = useRef<RoundAnswer | null>(null);
  const resolvedRoundsRef = useRef<Set<number>>(new Set());
  const monsterGettersRef = useRef<{
    getMine: () => ActiveBattleMonster | null;
    getOpponent: () => ActiveBattleMonster | null;
  } | null>(null);
  const forfeitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LiveBattleScreen registers accessors here so round resolution always
  // reads the current (possibly just-switched-in) active monster on each side.
  const registerMonsterGetters = useCallback(
    (getMine: () => ActiveBattleMonster | null, getOpponent: () => ActiveBattleMonster | null) => {
      monsterGettersRef.current = { getMine, getOpponent };
    },
    [],
  );

  const resolveRound = useCallback((mine: RoundAnswer, theirs: RoundAnswer) => {
    if (resolvedRoundsRef.current.has(mine.round)) return;
    resolvedRoundsRef.current.add(mine.round);

    const getters = monsterGettersRef.current;
    const myMonster = getters?.getMine();
    const oppMonster = getters?.getOpponent();
    if (!myMonster || !oppMonster) return;

    const mySkill = skills[mine.skillId];
    const oppSkill = skills[theirs.skillId];

    let myDamageDealt = mySkill
      ? calculateDamage(mySkill, getScaledStats(myMonster.def, myMonster.level).attack, mine.correctCount, mine.totalQuestions, myMonster.def.element, oppMonster.def.element, myMonster.status === 'blessed', getScaledStats(oppMonster.def, oppMonster.level).defense)
      : 0;
    let opponentDamageDealt = oppSkill
      ? calculateDamage(oppSkill, getScaledStats(oppMonster.def, oppMonster.level).attack, theirs.correctCount, theirs.totalQuestions, oppMonster.def.element, myMonster.def.element, oppMonster.status === 'blessed', getScaledStats(myMonster.def, myMonster.level).defense)
      : 0;

    // Iron Shield's def_boost halves damage taken while active — matches the
    // solo BattleScreen's doNpcTurn handling of the same status.
    if (oppMonster.status === 'def_boost') myDamageDealt = Math.round(myDamageDealt / 2);
    if (myMonster.status === 'def_boost') opponentDamageDealt = Math.round(opponentDamageDealt / 2);

    // Speed only matters when both hits would otherwise be mutually lethal
    // this round — the faster side's attack lands first and defeats the
    // other before its own hit can register, so that damage is zeroed out.
    // Equal speed leaves the trade as a mutual KO (unchanged).
    let speedWinner: 'me' | 'opponent' | null = null;
    const myMonsterWouldFaint = myMonster.currentHp - opponentDamageDealt <= 0;
    const oppMonsterWouldFaint = oppMonster.currentHp - myDamageDealt <= 0;
    if (myMonsterWouldFaint && oppMonsterWouldFaint) {
      const mySpeed = getScaledStats(myMonster.def, myMonster.level).speed;
      const oppSpeed = getScaledStats(oppMonster.def, oppMonster.level).speed;
      if (mySpeed > oppSpeed) {
        speedWinner = 'me';
        opponentDamageDealt = 0;
      } else if (oppSpeed > mySpeed) {
        speedWinner = 'opponent';
        myDamageDealt = 0;
      }
    }

    const myStatusInflicted = mine.isPerfect && mySkill ? ELEMENT_STATUS[mySkill.element] ?? null : null;
    const opponentStatusInflicted = theirs.isPerfect && oppSkill ? ELEMENT_STATUS[oppSkill.element] ?? null : null;

    const myAttackMissed = !!mySkill && mine.correctCount === 0;
    const opponentAttackMissed = !!oppSkill && theirs.correctCount === 0;
    const myTimedOut = mine.skillId === TIMEOUT_ACTION_ID;
    const opponentTimedOut = theirs.skillId === TIMEOUT_ACTION_ID;

    setLastOutcome({ round: mine.round, myDamageDealt, opponentDamageDealt, myStatusInflicted, opponentStatusInflicted, myAttackMissed, opponentAttackMissed, myTimedOut, opponentTimedOut, speedWinner });
    setPhase('round_resolved');

    channelRef.current?.send({
      type: 'broadcast',
      event: 'round_result',
      payload: { round: mine.round, myDamageDealt, opponentDamageDealt, myStatusInflicted, opponentStatusInflicted, myAttackMissed, opponentAttackMissed, myTimedOut, opponentTimedOut, speedWinner, from: userId },
    });
  }, [skills, userId]);

  const startNextRound = useCallback((nextRound: number) => {
    myAnswerRef.current = null;
    opponentAnswerRef.current = null;
    const deadline = Date.now() + ROUND_DURATION_MS;
    setRound(nextRound);
    setDeadlineAt(deadline);
    setPhase('select_skill');
  }, []);

  useEffect(() => {
    if (!battleId || !userId) return;

    const channel = supabase.channel(`battle-${battleId}`, {
      config: { presence: { key: userId }, broadcast: { self: true } },
    });
    channelRef.current = channel;

    let opponentSeen = false;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const keys = Object.keys(state);
      const bothPresent = keys.length >= 2;
      if (bothPresent && !opponentSeen) {
        opponentSeen = true;
        if (forfeitTimerRef.current) {
          clearTimeout(forfeitTimerRef.current);
          forfeitTimerRef.current = null;
        }
        // Challenger is the deterministic tie-breaker that kicks off round 1.
        if (side === 'challenger') {
          channel.send({ type: 'broadcast', event: 'round_start', payload: { round: 1, deadlineAt: Date.now() + ROUND_DURATION_MS } });
        }
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === userId) return;
      forfeitTimerRef.current = setTimeout(() => {
        setForfeitedByOpponent(true);
        setBattleEnded({ winnerId: userId, reason: 'forfeit_disconnect' });
        setPhase('ended');
      }, FORFEIT_GRACE_MS);
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key === userId) return;
      if (forfeitTimerRef.current) {
        clearTimeout(forfeitTimerRef.current);
        forfeitTimerRef.current = null;
      }
    });

    channel.on('broadcast', { event: 'round_start' }, ({ payload }) => {
      if (!payload?.round) return;
      startNextRound(payload.round);
    });

    channel.on('broadcast', { event: 'round_answer_submitted' }, ({ payload }) => {
      if (!payload || payload.round == null) return;
      const answer: RoundAnswer = payload;
      if (answer.userId === userId) {
        myAnswerRef.current = answer;
      } else {
        // Just bookkeeping — must NOT touch phase here. This client may not
        // have picked a skill yet; flipping it to 'awaiting_opponent' before
        // that would hide the skill-select UI and strand this player unable
        // to ever submit, deadlocking both sides waiting on each other.
        opponentAnswerRef.current = answer;
      }
      if (myAnswerRef.current && opponentAnswerRef.current && myAnswerRef.current.round === opponentAnswerRef.current.round) {
        resolveRound(myAnswerRef.current, opponentAnswerRef.current);
      }
    });

    // Idempotent: whichever client's round_result arrives first is applied;
    // a duplicate for an already-resolved round is a no-op via resolvedRoundsRef.
    channel.on('broadcast', { event: 'round_result' }, ({ payload }) => {
      if (!payload || resolvedRoundsRef.current.has(payload.round)) return;
      if (payload.from === userId) return; // already applied locally in resolveRound
      resolvedRoundsRef.current.add(payload.round);
      // Mirror the damage from the opponent's perspective back to mine.
      setLastOutcome({
        round: payload.round,
        myDamageDealt: payload.opponentDamageDealt,
        opponentDamageDealt: payload.myDamageDealt,
        myStatusInflicted: payload.opponentStatusInflicted,
        opponentStatusInflicted: payload.myStatusInflicted,
        myAttackMissed: payload.opponentAttackMissed,
        opponentAttackMissed: payload.myAttackMissed,
        myTimedOut: payload.opponentTimedOut,
        opponentTimedOut: payload.myTimedOut,
        speedWinner: payload.speedWinner === 'me' ? 'opponent' : payload.speedWinner === 'opponent' ? 'me' : null,
      });
      setPhase('round_resolved');
    });

    // A cross-effect item (e.g. Poison Fang's inflict_curse) targets the
    // *opponent's* monster — the acting client can't mutate the other
    // client's local state directly, so it broadcasts the effect and the
    // receiving side applies it to its own monster.
    channel.on('broadcast', { event: 'status_effect' }, ({ payload }) => {
      if (!payload || payload.from === userId) return;
      setIncomingStatusEffect({ status: payload.status, statusTurns: payload.statusTurns });
    });

    // Mirrors a self-only HP/status change (Rest, self-buff/heal/cure/revive)
    // onto the other client's view of this player's monster.
    channel.on('broadcast', { event: 'self_state_sync' }, ({ payload }) => {
      if (!payload || payload.from === userId) return;
      const { from, ...patch } = payload;
      setIncomingSelfSync(patch);
    });

    // The opponent switched their active monster (manually or forced by a
    // faint) — mirrors the index onto our local copy of their team, which
    // already holds that monster's correct last-known HP/status since bench
    // members never change state while inactive.
    channel.on('broadcast', { event: 'monster_switch' }, ({ payload }) => {
      if (!payload || payload.from === userId) return;
      setIncomingSwitch({ idx: payload.idx, forced: !!payload.forced });
    });

    channel.on('broadcast', { event: 'battle_end' }, ({ payload }) => {
      if (!payload) return;
      setBattleEnded({ winnerId: payload.winnerId ?? null, reason: payload.reason ?? 'ko' });
      setPhase('ended');
    });

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, ready: true });
      }
    });

    return () => {
      if (forfeitTimerRef.current) clearTimeout(forfeitTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, userId, side]);

  const submitRoundAnswer = useCallback((skillId: string, correctCount: number, totalQuestions: number, isPerfect: boolean) => {
    const answer: RoundAnswer = { round, userId, skillId, correctCount, totalQuestions, isPerfect };
    myAnswerRef.current = answer;
    channelRef.current?.send({ type: 'broadcast', event: 'round_answer_submitted', payload: answer });
    setPhase(prev => (opponentAnswerRef.current ? prev : 'awaiting_opponent'));
    if (opponentAnswerRef.current && opponentAnswerRef.current.round === round) {
      resolveRound(answer, opponentAnswerRef.current);
    }
  }, [round, userId, resolveRound]);

  const advanceToNextRound = useCallback(() => {
    const next = round + 1;
    if (side === 'challenger') {
      channelRef.current?.send({ type: 'broadcast', event: 'round_start', payload: { round: next, deadlineAt: Date.now() + ROUND_DURATION_MS } });
    }
  }, [round, side]);

  const declareBattleEnd = useCallback((winnerId: string | null, reason: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'battle_end', payload: { winnerId, reason } });
    setBattleEnded({ winnerId, reason });
    setPhase('ended');
  }, []);

  const sendStatusEffectToOpponent = useCallback((status: StatusEffect, statusTurns: number) => {
    channelRef.current?.send({ type: 'broadcast', event: 'status_effect', payload: { status, statusTurns, from: userId } });
  }, [userId]);

  const sendSelfStateSync = useCallback((patch: SelfStatePatch) => {
    channelRef.current?.send({ type: 'broadcast', event: 'self_state_sync', payload: { ...patch, from: userId } });
  }, [userId]);

  const sendMonsterSwitch = useCallback((idx: number, forced: boolean) => {
    channelRef.current?.send({ type: 'broadcast', event: 'monster_switch', payload: { idx, forced, from: userId } });
  }, [userId]);

  const clearIncomingStatusEffect = useCallback(() => setIncomingStatusEffect(null), []);
  const clearIncomingSelfSync = useCallback(() => setIncomingSelfSync(null), []);
  const clearIncomingSwitch = useCallback(() => setIncomingSwitch(null), []);

  return {
    phase, round, deadlineAt, lastOutcome, forfeitedByOpponent, battleEnded,
    incomingStatusEffect, incomingSelfSync, incomingSwitch,
    submitRoundAnswer, advanceToNextRound, declareBattleEnd, registerMonsterGetters,
    sendStatusEffectToOpponent, clearIncomingStatusEffect,
    sendSelfStateSync, clearIncomingSelfSync,
    sendMonsterSwitch, clearIncomingSwitch,
  };
}
