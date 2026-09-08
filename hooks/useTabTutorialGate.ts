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

  // `show` only ever flips true→false via markDone(), i.e. finishing this
  // tab's tutorial. If the kid switches to another tab first — tapping a
  // step's own CTA, which is exactly how the tutorial encourages them to
  // navigate — `show` stays true, and switching to a tab whose own tutorial
  // hasn't been seen yet flips that gate true too, stacking two spotlights
  // on screen at once. Requiring activeTab === tabKey here (not just at the
  // call site) hides this tab's spotlight the instant it's not the active
  // tab, while leaving `show` itself true so the tutorial resumes if they
  // tab back in without having finished it.
  return { active: show && activeTab === tabKey, markDone };
}
