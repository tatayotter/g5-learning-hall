// hooks/useAchievementNotifier.ts
// Detects newly unlocked achievements by comparing previous vs current data
// and returns the list of newly unlocked ones to show as toasts.

import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENTS, Achievement } from '@/lib/achievements';
import { WeeklyData } from '@/hooks/useWeeklyData';

export function useAchievementNotifier(data: WeeklyData | null) {
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const prevUnlockedIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!data) return;

    const currentUnlocked = ACHIEVEMENTS.filter(a => a.criteria(data));
    const currentIds = new Set(currentUnlocked.map(a => a.id));

    if (!initialized.current) {
      // First load — just record what's already unlocked, don't toast them
      prevUnlockedIds.current = currentIds;
      initialized.current = true;
      return;
    }

    // Find achievements that are newly unlocked since last check
    const justUnlocked = currentUnlocked.filter(
      a => !prevUnlockedIds.current.has(a.id)
    );

    if (justUnlocked.length > 0) {
      setNewlyUnlocked(justUnlocked);
    }

    prevUnlockedIds.current = currentIds;
  }, [data]);

  const clearNotifications = () => setNewlyUnlocked([]);

  return { newlyUnlocked, clearNotifications };
}
