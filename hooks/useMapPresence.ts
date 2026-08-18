import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { playNearbyWhoosh } from '@/lib/sounds';

export interface OnlinePlayer {
  userId: string;
  name: string;
  gender: 'boy' | 'girl';
  x: number;
  y: number;
}

const WAVE_TTL_MS = 1500;

// `enabled` defaults true (every existing call site keeps working
// unchanged); pass false to skip opening the Realtime channel entirely —
// used by MonsterGuild.tsx when offline, where a live presence channel has
// no chance of connecting and would just retry uselessly.
export function useMapPresence(userId: string, name: string, gender: 'boy' | 'girl', x: number, y: number, enabled = true) {
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePlayer>>({});
  const [waves, setWaves] = useState<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

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
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  useEffect(() => {
    channelRef.current?.track({ userId, name, gender, x, y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  const sendWave = (toUserId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'wave', payload: { from: userId, to: toUserId } });
  };

  return { onlinePlayers, waves, sendWave };
}
