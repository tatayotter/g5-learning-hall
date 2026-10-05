// hooks/useReadTimer.ts
import { useState, useEffect } from 'react';

const WORDS_PER_MINUTE = 130; // rough silent-reading pace for a 10-11 year old
const MIN_SECONDS = 8;
const MAX_SECONDS = 45;

function computeReadSeconds(content: string | null | undefined): number {
  const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds));
}

// Forces a minimum dwell time on a study/notes screen — sized to how long the
// content actually is — before a "continue" action is allowed to unlock.
// Nudges against clicking straight through without reading. Pass a `resetKey`
// that changes whenever a *different* quest's notes are shown (e.g. the quest
// id) so the countdown restarts instead of carrying over a stale value.
export function useReadTimer(content: string | null | undefined, resetKey: string): number {
  // The countdown is tagged with the quest (resetKey) and content it belongs
  // to; a different quest — or content arriving async under the same key —
  // starts over from that content's full read time.
  const [tick, setTick] = useState<{ resetKey: string; content: string | null | undefined; remaining: number } | null>(null);
  const remaining = tick && tick.resetKey === resetKey && tick.content === content
    ? tick.remaining
    : computeReadSeconds(content);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setTick({ resetKey, content, remaining: remaining - 1 }), 1000);
    return () => clearTimeout(timer);
  }, [remaining, resetKey, content]);

  return remaining;
}
