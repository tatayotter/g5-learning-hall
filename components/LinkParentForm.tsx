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
    const { data, error: invokeError } = await supabase.functions.invoke('request-parent-link', {
      body: { parentEmail: targetEmail },
    });
    if (invokeError || data?.error) {
      setError(data?.error || 'Could not send the invite. Please try again.');
      setStatus('error');
      return;
    }
    setStatus('sent');
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
    isActivePending || status === 'sent' || status === 'sending' || (status === 'error' && !!pending);

  if (showPendingCard) {
    const busy = status === 'sending';
    return (
      <div className="space-y-2">
        <p className="text-green-400 text-xs">
          Invite sent to <span className="font-semibold">{pending?.parent_email || email}</span> —
          {' '}{pending ? formatTimeLeft(pending.expires_at) : 'expires in 24h'}. Ask them to check their email.
        </p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={() => send(pending?.parent_email || email)}
          disabled={busy}
          className="text-xs underline text-indigo-300 hover:text-indigo-200 disabled:opacity-50"
        >
          {busy ? 'Resending…' : 'Resend invite'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-gray-400 text-xs">
        Enter your parent&apos;s email. They&apos;ll get a link to confirm — this unlocks leaderboards
        and PvP, and you earn 100 gold.
      </p>
      <input
        type="email"
        required
        placeholder="Parent's email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-2.5 py-1.5 text-white text-xs"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {/* status can't be 'sending' while this form is showing — showPendingCard
          switches to the pending-card branch synchronously the moment send()
          sets it, so there's no "sending" state to render here. */}
      <button
        type="submit"
        className="self-start bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold px-3 py-1.5 rounded-lg transition-colors text-xs text-white"
      >
        Send Invite
      </button>
    </form>
  );
}
