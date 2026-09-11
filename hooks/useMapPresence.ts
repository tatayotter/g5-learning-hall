import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { playNearbyWhoosh } from '@/lib/sounds';
import { wanderStep, TICK_MS_MIN, TICK_MS_MAX, STAGGER_MS_MAX } from '@/lib/wander';

export interface OnlinePlayer {
  userId: string;
  name: string;
  gender: 'boy' | 'girl';
  x: number;
  y: number;
  /** Optional avatar path — bots supply their assigned userpic here. */
  userpic?: string;
}

const WAVE_TTL_MS = 1500;

// Real players are marked online once on enter and offline on leave — NOT
// re-tracked on every step. This used to sync live position too (track() on
// every move, throttled to ~5/sec), but that tripped Supabase Realtime's
// per-client presence rate limit the moment two players were both walking:
// the server silently drops track() calls past the cap, so an actively
// moving player's position update would never reach anyone else's sync
// handler (they'd show "online" to themselves but be invisible to everyone
// else, and MapInfoDrawer's online count would never include them). Traced
// via the project's realtime_logs: repeated
// "ClientPresenceRateLimitReached: :client_rate_limit_exceeded" entries
// timestamped exactly during test sessions (2026-09-10/11).
//
// Instead, each other online player now gets a purely client-local
// randomized wander around the tile they entered on (lib/wander.ts) — the
// same trick hooks/useBotPresence.ts already used for the bot classmates,
// generalized here to a dynamic id set that grows/shrinks as real players
// join/leave. It's cosmetic only (never synced, and never used for any
// gameplay proximity check — only rendering + the online count/roster), so
// every viewer sees their own independent wander path for the same online
// player, not the same path in sync. TrainingMapScene.ts already tweens any
// "other player" sprite to its new tile over 200ms whenever its position
// changes, so this glides exactly like a bot's wander step — no blink.
export function useMapPresence(userId: string, name: string, gender: 'boy' | 'girl', x: number, y: number, enabled = true) {
  // Raw presence state — one entry per other online player, holding the tile
  // they entered on. Never updated again after their initial track() below.
  const [rawPlayers, setRawPlayers] = useState<Record<string, OnlinePlayer>>({});
  const [waves, setWaves] = useState<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Latest x/y as a ref (not state) so the SUBSCRIBED callback below always
  // tracks the freshest known position without needing to re-subscribe the
  // channel — and therefore re-announce enter/leave — on every move.
  const posRef = useRef({ x, y });
  useEffect(() => { posRef.current = { x, y }; }, [x, y]);

  useEffect(() => {
    // No reset needed here for the disabled case: rawPlayers starts empty,
    // and if this flips from true → false the PREVIOUS run's cleanup below
    // already resets it (calling setState from an effect body, rather than
    // its cleanup, is what the lint rule below actually objects to).
    if (!enabled) return;
    const channel = supabase.channel('training-map', {
      config: { presence: { key: userId }, broadcast: { self: true } },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<OnlinePlayer>();
      const next: Record<string, OnlinePlayer> = {};
      Object.entries(state).forEach(([key, entries]) => {
        if (key === userId) return;
        const latest = entries[entries.length - 1];
        if (latest) next[key] = latest;
      });
      setRawPlayers(next);
    });

    channel.on('broadcast', { event: 'wave' }, ({ payload }) => {
      const from = payload?.from;
      if (!from) return;
      playNearbyWhoosh();
      setWaves(prev => ({ ...prev, [from]: Date.now() }));
      setTimeout(() => {
        setWaves(prev => {
          if (!(from in prev)) return prev;
          const { [from]: _, ...rest } = prev;
          return rest;
        });
      }, WAVE_TTL_MS);
    });

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        // Tracked exactly once per session (enter) — never re-tracked on
        // movement, see the header comment above.
        await channel.track({ userId, name, gender, x: posRef.current.x, y: posRef.current.y });
      }
    });

    return () => {
      supabase.removeChannel(channel); // implicitly untracks (leave) for everyone else
      channelRef.current = null;
      setRawPlayers({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  // Client-local wander animation layered on top of rawPlayers — purely
  // cosmetic, never synced. Each other online player gets their own
  // randomized walk around the tile they entered on (their "home"), started
  // the moment they appear in rawPlayers and torn down the moment they
  // disappear (they left the channel).
  const [wanderPositions, setWanderPositions] = useState<Record<string, { x: number; y: number }>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const homesRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const rawIds = new Set(Object.keys(rawPlayers));

    // Newly-online players — remember their entry tile as home, start wandering.
    Object.entries(rawPlayers).forEach(([id, p]) => {
      if (homesRef.current[id]) return; // already wandering
      homesRef.current[id] = { x: p.x, y: p.y };
      setWanderPositions(prev => ({ ...prev, [id]: { x: p.x, y: p.y } }));

      const scheduleNext = (delay?: number) => {
        const ms = delay ?? (TICK_MS_MIN + Math.random() * (TICK_MS_MAX - TICK_MS_MIN));
        timerRefs.current[id] = setTimeout(() => {
          setWanderPositions(prev => {
            const home = homesRef.current[id];
            if (!home) return prev; // left in the meantime
            const cur = prev[id] ?? home;
            return { ...prev, [id]: wanderStep(cur.x, cur.y, home.x, home.y) };
          });
          scheduleNext();
        }, ms);
      };
      scheduleNext(Math.random() * STAGGER_MS_MAX);
    });

    // Departed players — stop their timer and forget them.
    Object.keys(homesRef.current).forEach(id => {
      if (rawIds.has(id)) return;
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
      delete homesRef.current[id];
      setWanderPositions(prev => {
        if (!(id in prev)) return prev;
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    });
  }, [rawPlayers]);

  // Stop every timer on unmount (e.g. leaving the map entirely).
  useEffect(() => () => {
    Object.values(timerRefs.current).forEach(clearTimeout);
  }, []);

  const onlinePlayers: Record<string, OnlinePlayer> = {};
  Object.entries(rawPlayers).forEach(([id, p]) => {
    const pos = wanderPositions[id] ?? p;
    onlinePlayers[id] = { ...p, x: pos.x, y: pos.y };
  });

  const sendWave = (toUserId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'wave', payload: { from: userId, to: toUserId } });
  };

  return { onlinePlayers, waves, sendWave };
}
