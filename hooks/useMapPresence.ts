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
const STICKER_TTL_MS = 3000;

export function useMapPresence(userId: string, name: string, gender: 'boy' | 'girl', x: number, y: number) {
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, OnlinePlayer>>({});
  const [waves, setWaves] = useState<Record<string, number>>({});
  const [stickers, setStickers] = useState<Record<string, { text: string; at: number }>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
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

    channel.on('broadcast', { event: 'sticker' }, ({ payload }) => {
      const from = payload?.from;
      const text = payload?.text;
      if (!from || !text) return;
      playNearbyWhoosh();
      setStickers(prev => ({ ...prev, [from]: { text, at: Date.now() } }));
      setTimeout(() => {
        setStickers(prev => {
          if (!(from in prev)) return prev;
          const { [from]: _, ...rest } = prev;
          return rest;
        });
      }, STICKER_TTL_MS);
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
  }, [userId]);

  useEffect(() => {
    channelRef.current?.track({ userId, name, gender, x, y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  const sendWave = (toUserId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'wave', payload: { from: userId, to: toUserId } });
  };

  const sendSticker = (text: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'sticker', payload: { from: userId, text } });
  };

  return { onlinePlayers, waves, stickers, sendWave, sendSticker };
}
