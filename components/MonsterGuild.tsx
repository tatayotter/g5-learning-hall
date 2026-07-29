'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { playCurioLevelUp } from '@/lib/sounds';
import { logAction } from '@/lib/playerlog';
import { getOtherPlayers, UserId, USERS, gradeToNumber } from '@/lib/userSession';
import { useMapPresence } from '@/hooks/useMapPresence';
import WildEncounterModal from '@/components/WildEncounterModal';
import CurioRevealModal from '@/components/CurioRevealModal';
import {
  MONSTERS, WILD_MONSTERS, ALL_MONSTERS, GUILD_MONSTERS, NPC_TRAINERS, BATTLE_CONSTANTS,
  getScaledStats, getMonsterLevel, getCounterElement,
  pickRandomWildMonsterId, getGuildMonsterDisplay, getGraduatedMonsterDisplay,
  NpcTrainer, MonsterDef, TrainerMonster,
} from '@/lib/monsterConfig';
import { fetchInventory, useInventoryItem, InventoryMap } from '@/lib/inventory';
import {
  hashQuestionId, arenaQuestionText,
  fetchAnsweredArenaQuestionIds, markArenaQuestionsCompleted, resetArenaHistory,
  fetchQuestionPool, markQuestionsCompleted,
  fetchSubclassProfile, guildLevelForKey, SubclassProfile,
} from '@/lib/guildEngine';
import { UserMonster, ActiveBattleMonster } from '@/components/battle/shared';
import LiveBattleScreen from '@/components/LiveBattleScreen';
import LeaderboardPanel from '@/components/LeaderboardPanel';
import { createInvite, fetchLiveBattle } from '@/lib/liveBattle';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import WorldMap from '@/components/WorldMap';
import { REGIONS } from '@/lib/regions';
import { CaughtMonster, BattleState } from '@/components/monster/types';
import TrainingMap from '@/components/monster/TrainingMap';
import TeamPanel from '@/components/monster/TeamPanel';
import CompendiumPanel from '@/components/monster/CompendiumPanel';
import BattleScreen from '@/components/monster/BattleScreen';
import StarterSelection from '@/components/monster/StarterSelection';

// ─── TYPES ───────────────────────────────────────────────────────────────────

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

  const gradeLevel = gradeToNumber(USERS[userId]?.grade);

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
    // Demo accounts are single-player only (see app/api/demo-login) — never
    // let one start a live battle against a real student.
    if (userId.startsWith('demo_')) return;
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
            onExitToMenu={() => setView('team')}
          />
        ) : (
          <WorldMap playerLevel={playerLevel} onSelectRegion={setActiveRegion} onExit={() => setView('team')} />
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
          {/* PvP — Challenge To A Battle (never shown to demo accounts —
              single-player only, see app/api/demo-login) */}
          {!userId.startsWith('demo_') && (() => {
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
            <img
              src="/trainers/training_tester.png"
              alt="Training Dummy"
              className="w-24 h-24 flex-shrink-0 object-contain"
            />
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
                <img
                  src={trainer.spriteOverride ?? `/trainers/${trainer.id}.png`}
                  alt={trainer.name}
                  className="w-24 h-24 flex-shrink-0 object-contain"
                />
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
