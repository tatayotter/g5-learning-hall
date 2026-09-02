import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { playNearbyWhoosh } from '@/lib/sounds';
import { createTrailingThrottle } from '@/lib/throttle';

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
// Presence track() was firing once per tile crossed (a Realtime broadcast
// per step, unthrottled) — collapse that to at most one every 200ms while
// still guaranteeing the latest position is always sent, never dropped.
const PRESENCE_TRACK_THROTTLE_MS = 200;

// `enabled` defaults true (every existing call site keeps working
// unchanged); pass false to skip opening the Realtime channel entirely —
// used by MonsterGuild.tsx when offline, where a live presence channel has
// no chance of connecting and would just retry uselessly.
export function useMapPresence(userId: string, name: string, gender: 'boy' | 'girl', x: number, y: number, enabled = true) {
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePlayer>>({});
  const [waves, setWaves] = useState<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Persists across renders for the component's lifetime — same instance
  // reused by every track() call below so the throttle window is continuous.
  const trackThrottleRef = useRef(
    createTrailingThrottle((payload: OnlinePlayer) => channelRef.current?.track(payload), PRESENCE_TRACK_THROTTLE_MS)
  );

  useEffect(() => {
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
      setOnlinePlayers(next);
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
        await channel.track({ userId, name, gender, x, y });
      }
    });

    return () => {
      trackThrottleRef.current.cancel(); // stale position, channel's gone anyway
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  useEffect(() => {
    trackThrottleRef.current.call({ userId, name, gender, x, y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  // Separate effect with empty deps — its cleanup only runs on unmount, not
  // on every [x, y] change (a cleanup tied to the effect above would flush,
  // and thus defeat, the throttle on every single position update). Ensures
  // the player's LAST position (not a throttled-away one) is what's visible
  // right before the channel disconnects.
  useEffect(() => () => trackThrottleRef.current.flush(), []);

  const sendWave = (toUserId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'wave', payload: { from: userId, to: toUserId } });
  };

  return { onlinePlayers, waves, sendWave };
}
