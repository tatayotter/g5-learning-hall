'use client';
// hooks/useTabTutorialGate.ts
//
// True exactly while `tabKey` is the active tab AND its first-visit
// tutorial hasn't been marked seen yet for this user. Mirrors the board
// tab's Supabase-backed showOnboarding/handleCompleteOnboarding gate (see
// Dashboard.tsx), but backed by localStorage (lib/tutorial.ts) for tabs
// that don't have a dedicated DB column.
//
// The localStorage check + setShow happen inside a useEffect guarded by a
// ref (not "adjust state during render") — see useTutorialSequence.ts's
// header comment for why: Dashboard re-renders frequently for reasons
// unrelated to this gate, and a render-phase setState here intermittently
// tripped React's "Maximum update depth exceeded" limit.

import { useEffect, useRef, useState } from 'react';
import { hasSeenTabTutorial, markTabTutorialSeen } from '@/lib/tutorial';

export function useTabTutorialGate(tabKey: string, activeTab: string, userId: string | null) {
  const [show, setShow] = useState(false);
  const prevActiveTabRef = useRef(activeTab);

  useEffect(() => {
    if (activeTab === prevActiveTabRef.current) return;
    prevActiveTabRef.current = activeTab;
    if (activeTab === tabKey && !hasSeenTabTutorial(tabKey, userId)) {
      // Guarded by the ref above so this only fires once per genuine tab
      // switch, not on every re-render — see this file's header comment.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
    }
  }, [activeTab, tabKey, userId]);

  const markDone = () => {
    markTabTutorialSeen(tabKey, userId);
    setShow(false);
  };

  return { active: show, markDone };
}
