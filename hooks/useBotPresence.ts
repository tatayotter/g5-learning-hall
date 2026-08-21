// hooks/useBotPresence.ts
// Returns a Record<string, OnlinePlayer> of 5 randomly-chosen bot classmates
// that wander the Training Map. The selection is fixed for the session (picked
// once on mount) and their positions update every ~2.5 s to simulate movement.
// Merge the result into mapPresence.onlinePlayers before passing to TrainingMap
// so the Online tab count and sprite list include the bots automatically.

import { useEffect, useMemo, useRef, useState } from 'react';
import { BOT_PROFILES } from '@/lib/botProfiles';
import type { OnlinePlayer } from '@/hooks/useMapPresence';

const WANDER_RADIUS = 3;   // max tile drift from home before bias pulls back
const TICK_MS_MIN  = 2000;
const TICK_MS_MAX  = 3000;
const BOTS_ONLINE  = 5;

/** Pick BOTS_ONLINE unique indices into BOT_PROFILES, once per session. */
function pickSessionBots(): typeof BOT_PROFILES {
  const shuffled = [...BOT_PROFILES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, BOTS_ONLINE);
}

export function useBotPresence(): Record<string, OnlinePlayer> {
  // Fixed bot subset for this session
  const sessionBots = useMemo(pickSessionBots, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Positions keyed by bot id
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(sessionBots.map(b => [b.id, { x: b.homeX, y: b.homeY }])),
  );

  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleNext() {
      const delay = TICK_MS_MIN + Math.random() * (TICK_MS_MAX - TICK_MS_MIN);
      tickRef.current = setTimeout(() => {
        setPositions(prev => {
          const next = { ...prev };
          for (const bot of sessionBots) {
            const { x, y } = prev[bot.id];
            // Bias back toward home when drifted too far
            const dxBias = Math.abs(x - bot.homeX) >= WANDER_RADIUS ? Math.sign(bot.homeX - x) : 0;
            const dyBias = Math.abs(y - bot.homeY) >= WANDER_RADIUS ? Math.sign(bot.homeY - y) : 0;
            const dx = dxBias !== 0 ? dxBias : (Math.random() < 0.5 ? 1 : -1);
            const dy = dyBias !== 0 ? dyBias : (Math.random() < 0.5 ? 1 : -1);
            next[bot.id] = {
              x: Math.max(1, x + (Math.random() < 0.7 ? dx : 0)),
              y: Math.max(1, y + (Math.random() < 0.7 ? dy : 0)),
            };
          }
          return next;
        });
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [sessionBots]);

  // Build OnlinePlayer records from current positions
  return useMemo(
    () =>
      Object.fromEntries(
        sessionBots.map(b => [
          b.id,
          {
            userId: b.id,
            name: b.fullName,
            gender: b.gender,
            x: positions[b.id]?.x ?? b.homeX,
            y: positions[b.id]?.y ?? b.homeY,
          } satisfies OnlinePlayer,
        ]),
      ),
    [sessionBots, positions],
  );
}
