// lib/friends.ts
// Client wrappers around the friend-request RPCs (see Supabase migration
// add_friend_request_schema_and_rpcs). All party/ownership checks happen
// server-side inside those SECURITY DEFINER functions — this file never
// decides who's allowed to accept/cancel what, only reflects what the RPCs
// return, same pattern as lib/trades.ts.
import { supabase } from '@/lib/supabase';
import { UserId } from '@/lib/userSession';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequestRow {
  id: string;
  requester_id: UserId;
  recipient_id: UserId;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
}

// One player's whole friend picture, split the three ways the UI actually
// needs them. `friends` includes both directions of an accepted row —
// callers that need "the other person's id" should use friendPartnerId.
export interface FriendData {
  friends: FriendRequestRow[];
  incoming: FriendRequestRow[]; // pending, I'm the recipient — mine to accept/decline
  outgoing: FriendRequestRow[]; // pending, I'm the requester — mine to cancel
}

export function friendPartnerId(row: FriendRequestRow, myId: UserId): UserId {
  return row.requester_id === myId ? row.recipient_id : row.requester_id;
}

export async function fetchMyFriendData(userId: UserId): Promise<FriendData> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error || !data) return { friends: [], incoming: [], outgoing: [] };

  const rows = data as FriendRequestRow[];
  return {
    friends: rows.filter(r => r.status === 'accepted'),
    incoming: rows.filter(r => r.status === 'pending' && r.recipient_id === userId),
    outgoing: rows.filter(r => r.status === 'pending' && r.requester_id === userId),
  };
}

// The latest row (any status) between two specific players — lets a popup
// like PlayerStatsPopup show the right button (Add / Sent / Accept /
// Friends) without pulling the viewer's entire friend list. A pair can have
// old declined/cancelled rows sitting alongside their real current state
// (only pending/accepted is ever unique per pair — see the migration's
// partial index), so this always takes the most recent one.
export async function fetchFriendRelation(myId: UserId, otherId: UserId): Promise<FriendRequestRow | null> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`and(requester_id.eq.${myId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${myId})`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as FriendRequestRow | null;
}

export async function sendFriendRequest(recipientId: UserId): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('send_friend_request', { p_recipient_id: recipientId });
  if (error) return { id: null, error: error.message };
  return { id: data as string, error: null };
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('respond_to_friend_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  return !error && data === true;
}

export async function cancelFriendRequest(requestId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_friend_request', { p_request_id: requestId });
  return !error && data === true;
}

export async function removeFriend(friendId: UserId): Promise<boolean> {
  const { data, error } = await supabase.rpc('remove_friend', { p_friend_id: friendId });
  return !error && data === true;
}
