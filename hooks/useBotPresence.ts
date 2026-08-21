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

const WANDER_RADIUS  = 3;    // max tile drift from home before bias pulls back
const TICK_MS_MIN    = 3000; // per-bot minimum move interval
const TICK_MS_MAX    = 7000; // per-bot maximum move interval
// Each bot's first tick is further staggered by up to this many ms so they
// don't all move at t=0 when the hook first mounts.
const STAGGER_MS_MAX = 4000;
const BOTS_ONLINE    = 5;

/** Pick BOTS_ONLINE unique indices into BOT_PROFILES, once per session. */
function pickSessionBots(): typeof BOT_PROFILES {
  const shuffled = [...BOT_PROFILES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, BOTS_ONLINE);
}

/** Compute the next position for one bot given its current position. */
function wanderStep(
  x: number,
  y: number,
  homeX: number,
  homeY: number,
): { x: number; y: number } {
  // Bias back toward home when drifted too far
  const dxBias = Math.abs(x - homeX) >= WANDER_RADIUS ? Math.sign(homeX - x) : 0;
  const dyBias = Math.abs(y - homeY) >= WANDER_RADIUS ? Math.sign(homeY - y) : 0;
  const dx = dxBias !== 0 ? dxBias : (Math.random() < 0.5 ? 1 : -1);
  const dy = dyBias !== 0 ? dyBias : (Math.random() < 0.5 ? 1 : -1);
  // 70% chance to actually step on each axis — sometimes the bot just stands
  // still for a tick, adding further variety.
  return {
    x: Math.max(1, x + (Math.random() < 0.7 ? dx : 0)),
    y: Math.max(1, y + (Math.random() < 0.7 ? dy : 0)),
  };
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
