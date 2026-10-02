'use client';
// components/LinkParentForm.tsx
// The actual "enter a parent email, send an invite" form — extracted from
// LinkParentBanner so it can be reused inline inside a hard gate (Leaderboard
// tab, PvP challenge) and not just the floating corner pill. Shows the
// child's own pending invite (via my_pending_link_request()) instead of
// always starting from a blank form, and offers a one-tap resend once the
// previous invite has expired.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PendingRequest = {
  parent_email: string;
  status: string;
  created_at: string;
  expires_at: string;
};

// Kept as a named helper (rather than inlined in the component body) so the
// impure Date.now() read happens inside a plain function call, not directly
// in the render body — see formatTimeLeft below for the same pattern.
function isPendingActive(pending: PendingRequest | null | undefined): boolean {
  return !!pending && pending.status === 'pending' && new Date(pending.expires_at).getTime() > Date.now();
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `${minutes}m left`;
}

export default function LinkParentForm({ onSent }: { onSent?: () => void }) {
  const [pending, setPending] = useState<PendingRequest | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  // The address the most recent send() targeted — shown on the pending card
  // while `pending` (re-fetched after the send) may still hold the old one.
  const [lastSent, setLastSent] = useState('');
  // "Change email": back to the form, prefilled, from the pending card. A new
  // send revokes the old invite server-side (request_parent_link), so a link
  // that went to a mistyped address stops working.
  const [editing, setEditing] = useState(false);

  const loadPending = () => {
    supabase.rpc('my_pending_link_request').then(({ data, error }) => {
      const row = !error && data && data[0] ? (data[0] as PendingRequest) : null;
      setPending(row);
      if (row?.status === 'pending') setEmail(row.parent_email);
    });
  };

  useEffect(() => {
    loadPending();
  }, []);

  const send = async (targetEmail: string) => {
    setStatus('sending');
    setError('');
    setLastSent(targetEmail);
    const { data, error: invokeError } = await supabase.functions.invoke('request-parent-link', {
      body: { parentEmail: targetEmail },
    });
    if (invokeError || data?.error) {
      const msg: string = data?.error || '';
      setError(
        msg.includes('rate limit')
          ? 'Too many invites today. Please try again tomorrow.'
          : msg || 'Could not send the invite. Please try again.'
      );
      setStatus('error');
      return;
    }
    setStatus('sent');
    setEditing(false);
    loadPending();
    onSent?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(email);
  };

  const isActivePending = isPendingActive(pending);
  // Once we've loaded a still-active pending invite, or just sent/are
  // sending one, show the status card + resend action instead of the blank
  // form. Keyed off `pending`/`status` together (not just `status`) so a
  // click on "Resend" (status -> 'sending') doesn't flip back to the form
  // mid-request.
  const showPendingCard =
    status === 'sending' ||
    (!editing && (isActivePending || status === 'sent' || (status === 'error' && !!pending)));

  if (showPendingCard) {
    const busy = status === 'sending';
    const sentTo = status === 'sending' || status === 'sent' ? lastSent : pending?.parent_email || email;
    const pendingMatches = pending?.parent_email === sentTo;
    return (
      <div className="space-y-2">
        <p className="text-green-800 text-xs bg-[#e8f5e0] border border-green-700 rounded-lg px-2.5 py-2">
          {busy ? 'Sending invite to ' : 'Invite sent to '}
          <span className="font-semibold break-all">{sentTo}</span>
          {!busy && (
            <>
              {' '}— {pending && pendingMatches ? formatTimeLeft(pending.expires_at) : 'expires in 24h'}. Ask them
              to open the email and tap the link. Your Growth Pills arrive the moment they confirm.
            </>
          )}
        </p>
        {error && <p className="text-red-700 text-xs">{error}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <button
            onClick={() => send(sentTo)}
            disabled={busy}
            className="text-xs underline font-bold text-[#6b4820] hover:text-[#2a1505] disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Resend invite'}
          </button>
          <button
            onClick={() => {
              setEmail(sentTo);
              setError('');
              setStatus('idle');
              setEditing(true);
            }}
            disabled={busy}
            className="text-xs underline font-bold text-[#6b4820] hover:text-[#2a1505] disabled:opacity-50"
          >
            Wrong email? Change it
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-[#6b4820] text-xs">
        {editing
          ? "Fix the email or type a different parent's email. The old invite link will stop working."
          : <>Type your parent&apos;s email (or let them type it). They&apos;ll get a link to confirm.</>}
      </p>
      <input
        type="email"
        required
        placeholder="Parent's email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus={editing}
        className="w-full rounded-lg bg-white border border-[#c9a87a] focus:border-[#c9781a] outline-none px-2.5 py-2 text-[#2a1505] text-sm"
      />
      {error && <p className="text-red-700 text-xs">{error}</p>}
      {/* status can't be 'sending' while this form is showing — showPendingCard
          switches to the pending-card branch synchronously the moment send()
          sets it, so there's no "sending" state to render here. */}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold px-3 py-2 rounded-lg transition-colors text-sm text-white"
      >
        {editing ? 'Send to this email' : 'Send Invite'}
      </button>
      {editing && (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError('');
            setStatus('idle');
          }}
          className="text-xs font-bold text-[#6b4820] hover:text-[#2a1505]"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
