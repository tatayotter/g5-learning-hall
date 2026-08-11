// hooks/useBossFightProgress.ts
// useWeeklyData-shaped hook (this codebase has no React Context anywhere —
// session state is threaded via hooks called in app/page.tsx and
// prop-drilled) for the Term Exam Boss Fight's per-user progress: which
// personas are defeated this term, and whether the admin's global toggle is
// on. Consumed by both the board's persona-list section and the mist overlay.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { getPersonasForGrade } from '@/lib/bossPersonas';

export interface BossFightProgress {
  defeated: Set<string>; // subject names defeated this grade+term
  total: number;
  bossFightsEnabled: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useBossFightProgress(userId: string, grade: number, term: number = CURRENT_TERM): BossFightProgress {
  const [defeated, setDefeated] = useState<Set<string>>(new Set());
  const [bossFightsEnabled, setBossFightsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statusRes, defeatsRes] = await Promise.all([
      supabase.from('boss_fights_status').select('boss_fights_enabled').maybeSingle(),
      supabase.from('boss_persona_defeats').select('subject')
        .eq('user_id', userId).eq('grade', grade).eq('term', term),
    ]);
    setBossFightsEnabled(!!statusRes.data?.boss_fights_enabled);
    setDefeated(new Set((defeatsRes.data || []).map(r => r.subject as string)));
    setLoading(false);
  }, [userId, grade, term]);

  useEffect(() => { load(); }, [load]);

  const total = getPersonasForGrade(grade).length;

  return { defeated, total, bossFightsEnabled, loading, refresh: load };
}
