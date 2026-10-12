// hooks/useBossFightProgress.ts
// useWeeklyData-shaped hook (this codebase has no React Context anywhere —
// session state is threaded via hooks called in app/page.tsx and
// prop-drilled) for the Term Exam Boss Fight's per-user progress: which
// personas are defeated this term, the term's question-pool counts (which
// decide the roster and each shadow's readiness), the term's sealed Curio
// and whether it's been freed, and whether the admin's global toggle is on.
// Consumed by the board's Trial takeover, the intro and the mist overlay.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { BossPersona, getPersonasForGrade } from '@/lib/bossPersonas';
import { getScheduleForGrade } from '@/lib/subjectSchedule';
import { bankLatestWeek, bankPoolCounts, readBossBank, syncBossBank } from '@/lib/bossQuestionBank';

export interface SealedCurioReward {
  monsterId: string;
  loreMarkdown: string | null;
}

export interface BossFightProgress {
  defeated: Set<string>; // subject names defeated this grade+term
  personas: BossPersona[]; // this grade's roster for the term
  poolCounts: Record<string, number>; // published questions per subject this term
  total: number;
  // boss_gauntlet_rewards for this grade+term; null if the admin hasn't set one.
  sealedCurio: SealedCurioReward | null;
  sealedCurioClaimed: boolean;
  // End of the term's last lesson week (its Friday); null before it loads.
  endsAt: Date | null;
  bossFightsEnabled: boolean;
  loading: boolean;
  refresh: () => void;
  // claim_boss_gauntlet_reward: re-verifies every shadow is down server-side,
  // grants the Curio once. Resolves false when not eligible / already claimed.
  claimSealedCurio: () => Promise<boolean>;
}

// Friday 23:59 (local) of the week that starts on `sunday` (YYYY-MM-DD).
function fridayEnd(sunday: string): Date {
  const [y, m, d] = sunday.split('-').map(Number);
  return new Date(y, m - 1, d + 5, 23, 59, 59);
}

export function useBossFightProgress(userId: string, grade: number, term: number = CURRENT_TERM): BossFightProgress {
  const [defeated, setDefeated] = useState<Set<string>>(new Set());
  const [poolCounts, setPoolCounts] = useState<Record<string, number>>({});
  const [sealedCurio, setSealedCurio] = useState<SealedCurioReward | null>(null);
  const [sealedCurioClaimed, setSealedCurioClaimed] = useState(false);
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [bossFightsEnabled, setBossFightsEnabled] = useState(false);
  // Loading until data for this exact user/grade/term lands, or while a
  // manual refresh is in flight.
  const progressKey = `${userId}|${grade}|${term}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loading = refreshing || loadedKey !== progressKey;

  // The term's boss questions live on the device (lib/bossQuestionBank.ts): a
  // cached copy answers the roster/readiness counts at once while the sync
  // checks for changes in the background, even before the event is switched on.
  const fetchAll = useCallback(() => {
    const isBossGrade = !!getScheduleForGrade(grade);
    const cachedBank = isBossGrade ? readBossBank(grade, term) : null;
    const bankSync = isBossGrade ? syncBossBank(grade, term) : Promise.resolve(null);
    return Promise.all([
      supabase.from('boss_fights_status').select('boss_fights_enabled').maybeSingle(),
      supabase.from('boss_persona_defeats').select('subject')
        .eq('user_id', userId).eq('grade', grade).eq('term', term),
      cachedBank ?? bankSync,
      supabase.from('boss_gauntlet_rewards').select('reward_monster_id, reward_lore_markdown')
        .eq('grade', grade).eq('term', term).maybeSingle(),
      supabase.from('boss_gauntlet_claims').select('id')
        .eq('user_id', userId).eq('grade', grade).eq('term', term).maybeSingle(),
    ]).then(results => ({ results, cachedBank, bankSync }));
  }, [userId, grade, term]);

  const applyBank = useCallback((b: ReturnType<typeof readBossBank>) => {
    setPoolCounts(b ? bankPoolCounts(b) : {});
    const lastWeek = b ? bankLatestWeek(b) : null;
    setEndsAt(lastWeek ? fridayEnd(lastWeek) : null);
  }, []);

  // isCurrent: false once this load is stale, so a late background sync
  // never overwrites a newer user/grade/term.
  const apply = useCallback((
    { results: [statusRes, defeatsRes, bank, rewardRes, claimRes], cachedBank, bankSync }: Awaited<ReturnType<typeof fetchAll>>,
    isCurrent: () => boolean,
  ) => {
    setBossFightsEnabled(!!statusRes.data?.boss_fights_enabled);
    setDefeated(new Set((defeatsRes.data || []).map(r => r.subject as string)));
    applyBank(bank);
    if (cachedBank) bankSync.then(fresh => { if (isCurrent() && fresh && fresh !== cachedBank) applyBank(fresh); });
    setSealedCurio(rewardRes.data
      ? { monsterId: rewardRes.data.reward_monster_id as string, loreMarkdown: (rewardRes.data.reward_lore_markdown as string | null) ?? null }
      : null);
    setSealedCurioClaimed(!!claimRes.data);
    setLoadedKey(progressKey);
    setRefreshing(false);
  }, [progressKey, applyBank]);

  useEffect(() => {
    let cancelled = false;
    fetchAll().then(result => { if (!cancelled) apply(result, () => !cancelled); });
    return () => { cancelled = true; };
  }, [fetchAll, apply]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchAll().then(result => apply(result, () => true));
  }, [fetchAll, apply]);

  const claimSealedCurio = useCallback(async () => {
    const { data, error } = await supabase.rpc('claim_boss_gauntlet_reward', {
      p_user_id: userId, p_grade: grade, p_term: term,
    });
    if (error) {
      console.error('Failed to claim the sealed Curio:', error);
      return false;
    }
    if (data) setSealedCurioClaimed(true);
    return !!data;
  }, [userId, grade, term]);

  const personas = useMemo(() => getPersonasForGrade(grade, poolCounts), [grade, poolCounts]);

  return {
    defeated, personas, poolCounts, total: personas.length,
    sealedCurio, sealedCurioClaimed, endsAt,
    bossFightsEnabled, loading, refresh, claimSealedCurio,
  };
}
