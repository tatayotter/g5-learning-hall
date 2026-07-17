// hooks/useLiveBattleInbox.ts
// App-level channel a player stays subscribed to everywhere in the app, so a
// live-battle challenge reaches them even if they're not on the Monster Arena
// tab. Modeled on hooks/useMapPresence.ts's presence+broadcast pattern.
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface IncomingInvite {
  battleId: string;
  fromId: string;
  fromName: string;
}

export interface InviteResponse {
  battleId: string;
  accepted: boolean;
}

// Shared by every logged-in player so "who's online" presence is visible
// across sessions — the per-user player-inbox-{userId} channel below is
// still used for delivering invites, since presence tracked there would
// only ever be seen by that one user (each subscriber is alone on it).
const LOBBY_CHANNEL = 'live-battle-lobby';

export function useLiveBattleInbox(userId: string, name: string) {
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<Set<string>>(new Set());
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const [inviteResponse, setInviteResponse] = useState<InviteResponse | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lobbyRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const lobby = supabase.channel(LOBBY_CHANNEL, {
      config: { presence: { key: userId } },
    });
    lobbyRef.current = lobby;

    lobby.on('presence', { event: 'sync' }, () => {
      const state = lobby.presenceState<{ userId: string }>();
      setOnlinePlayerIds(new Set(Object.keys(state)));
    });

    lobby.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await lobby.track({ userId, name });
      }
    });

    return () => {
      supabase.removeChannel(lobby);
      lobbyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`player-inbox-${userId}`, {
      config: { broadcast: { self: true } },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'invite' }, ({ payload }) => {
      if (!payload?.battleId || payload.toId !== userId) return;
      setIncomingInvite({ battleId: payload.battleId, fromId: payload.fromId, fromName: payload.fromName });
    });

    channel.on('broadcast', { event: 'invite_cancelled' }, ({ payload }) => {
      if (payload?.battleId && incomingInvite?.battleId === payload.battleId) {
        setIncomingInvite(null);
      }
    });

    channel.on('broadcast', { event: 'invite_response' }, ({ payload }) => {
      if (!payload?.battleId) return;
      setInviteResponse({ battleId: payload.battleId, accepted: !!payload.accepted });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Sends an invite broadcast to the target player's own inbox channel —
  // this client isn't subscribed to it, so open a one-off channel just to send.
  const sendInvite = async (toId: string, battleId: string) => {
    const inboxChannel = supabase.channel(`player-inbox-${toId}`, { config: { broadcast: { self: false } } });
    await new Promise<void>(resolve => {
      inboxChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await inboxChannel.send({
      type: 'broadcast',
      event: 'invite',
      payload: { battleId, fromId: userId, fromName: name, toId },
    });
    supabase.removeChannel(inboxChannel);
  };

  const cancelInvite = async (toId: string, battleId: string) => {
    const inboxChannel = supabase.channel(`player-inbox-${toId}`, { config: { broadcast: { self: false } } });
    await new Promise<void>(resolve => {
      inboxChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await inboxChannel.send({ type: 'broadcast', event: 'invite_cancelled', payload: { battleId } });
    supabase.removeChannel(inboxChannel);
  };

  // Sent by the invitee back to the challenger's inbox after they've updated
  // the live_battles row via lib/liveBattle.ts's respondToInvite().
  const sendInviteResponse = async (toId: string, battleId: string, accepted: boolean) => {
    const inboxChannel = supabase.channel(`player-inbox-${toId}`, { config: { broadcast: { self: false } } });
    await new Promise<void>(resolve => {
      inboxChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await inboxChannel.send({ type: 'broadcast', event: 'invite_response', payload: { battleId, accepted } });
    supabase.removeChannel(inboxChannel);
  };

  const clearIncomingInvite = () => setIncomingInvite(null);
  const clearInviteResponse = () => setInviteResponse(null);

  return {
    onlinePlayerIds, incomingInvite, inviteResponse,
    sendInvite, cancelInvite, sendInviteResponse,
    clearIncomingInvite, clearInviteResponse,
  };
}
