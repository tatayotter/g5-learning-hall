// hooks/useBossFightProgress.ts
// useWeeklyData-shaped hook (this codebase has no React Context anywhere —
// session state is threaded via hooks called in app/page.tsx and
// prop-drilled) for the Term Exam Boss Fight's per-user progress: which
// personas are defeated this term, the term's question-pool counts (which
// decide the roster and each shadow's readiness), and whether the admin's
// global toggle is on. Consumed by the board, the intro and the mist overlay.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { BossPersona, getPersonasForGrade } from '@/lib/bossPersonas';
import { fetchBossPoolCounts } from '@/lib/bossFightEngine';

export interface BossFightProgress {
  defeated: Set<string>; // subject names defeated this grade+term
  personas: BossPersona[]; // this grade's roster for the term
  poolCounts: Record<string, number>; // published questions per subject this term
  total: number;
  bossFightsEnabled: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useBossFightProgress(userId: string, grade: number, term: number = CURRENT_TERM): BossFightProgress {
  const [defeated, setDefeated] = useState<Set<string>>(new Set());
  const [poolCounts, setPoolCounts] = useState<Record<string, number>>({});
  const [bossFightsEnabled, setBossFightsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statusRes, defeatsRes, counts] = await Promise.all([
      supabase.from('boss_fights_status').select('boss_fights_enabled').maybeSingle(),
      supabase.from('boss_persona_defeats').select('subject')
        .eq('user_id', userId).eq('grade', grade).eq('term', term),
      fetchBossPoolCounts(grade, term),
    ]);
    setBossFightsEnabled(!!statusRes.data?.boss_fights_enabled);
    setDefeated(new Set((defeatsRes.data || []).map(r => r.subject as string)));
    setPoolCounts(counts);
    setLoading(false);
  }, [userId, grade, term]);

  useEffect(() => { load(); }, [load]);

  const personas = useMemo(() => getPersonasForGrade(grade, poolCounts), [grade, poolCounts]);

  return { defeated, personas, poolCounts, total: personas.length, bossFightsEnabled, loading, refresh: load };
}
