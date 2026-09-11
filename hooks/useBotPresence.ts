// hooks/useBotPresence.ts
// Returns a Record<string, OnlinePlayer> of 5 randomly-chosen bot classmates
// that wander the Training Map. The selection is fixed for the session (picked
// once on mount) and each bot has its own independent timer with a randomised
// delay so they never move in lockstep.
// Merge the result into mapPresence.onlinePlayers before passing to TrainingMap
// so the Online tab count and sprite list include the bots automatically.

import { useEffect, useMemo, useRef, useState } from 'react';
import { BOT_PROFILES } from '@/lib/botProfiles';
import type { OnlinePlayer } from '@/hooks/useMapPresence';
import { wanderStep, TICK_MS_MIN, TICK_MS_MAX, STAGGER_MS_MAX } from '@/lib/wander';

const BOTS_ONLINE = 5;

/** Pick BOTS_ONLINE unique indices into BOT_PROFILES, once per session. */
function pickSessionBots(): typeof BOT_PROFILES {
  const shuffled = [...BOT_PROFILES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, BOTS_ONLINE);
}

export function useBotPresence(): Record<string, OnlinePlayer> {
  // Fixed bot subset for this session
  const sessionBots = useMemo(pickSessionBots, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Positions keyed by bot id — each bot moves independently
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(sessionBots.map(b => [b.id, { x: b.homeX, y: b.homeY }])),
  );

  // One timer handle per bot so they can be cancelled individually
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    function scheduleBotNext(botId: string, homeX: number, homeY: number, delay?: number) {
      const ms = delay ?? (TICK_MS_MIN + Math.random() * (TICK_MS_MAX - TICK_MS_MIN));
      timerRefs.current[botId] = setTimeout(() => {
        setPositions(prev => {
          const cur = prev[botId] ?? { x: homeX, y: homeY };
          return { ...prev, [botId]: wanderStep(cur.x, cur.y, homeX, homeY) };
        });
        scheduleBotNext(botId, homeX, homeY);
      }, ms);
    }

    // Stagger each bot's first tick so they never all move at the same moment
    sessionBots.forEach((bot, i) => {
      // First bot starts earliest, last starts latest — deterministic spread
      // within the stagger window, but each bot's ongoing cadence is random.
      const stagger = (i / sessionBots.length) * STAGGER_MS_MAX + Math.random() * 500;
      scheduleBotNext(bot.id, bot.homeX, bot.homeY, stagger);
    });

    return () => {
      Object.values(timerRefs.current).forEach(clearTimeout);
      timerRefs.current = {};
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
            name: b.firstName,
            gender: b.gender,
            x: positions[b.id]?.x ?? b.homeX,
            y: positions[b.id]?.y ?? b.homeY,
            userpic: b.userpic,
          } satisfies OnlinePlayer,
        ]),
      ),
    [sessionBots, positions],
  );
}
