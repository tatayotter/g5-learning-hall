// components/LinkParentBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Nudge, not a wall — see docs/parent-child-linking-design.md. Shown to
// self-registered children who haven't linked a parent yet.
// am_i_linked() is a SECURITY DEFINER RPC because the existing children
// RLS policy doesn't expose an unclaimed child's own row to itself.
export default function LinkParentBanner() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    // am_i_linked() is tri-state: true (linked), false (unclaimed child --
    // show the nudge), or null (not a child account at all -- family,
    // classmate, demo). Must NOT coerce with Boolean(): that would turn
    // null into false and show this to everyone who isn't a child.
    supabase.rpc('am_i_linked').then(({ data, error }) => {
      setLinked(error ? true : (data as boolean | null)); // fail closed: don't nag on error
    });
  }, []);

  if (linked !== false) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('request-parent-link', {
      body: { parentEmail: email },
    });
    if (invokeError || data?.error) {
      setError(data?.error || 'Could not send the invite. Please try again.');
      setStatus('error');
      return;
    }
    setStatus('sent');
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Link a parent to unlock more"
        className="fixed top-3 right-3 z-40 flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-indigo-500 transition-colors"
      >
        <span>Link a Parent 🎁</span>
      </button>
    );
  }

  return (
    <div className="fixed top-3 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-xs bg-neutral-900 border border-indigo-500/40 text-white text-xs rounded-xl shadow-2xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold">Link a parent, earn 100 gold 🎁</span>
        <button
          onClick={() => setExpanded(false)}
          className="shrink-0 text-white/60 hover:text-white leading-none text-base"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {status === 'sent' ? (
        <p className="text-green-400">
          Invite sent! Ask your parent to check their email — the link expires in 30 minutes.
        </p>
      ) : (
        <>
          <p className="text-gray-400">
            Enter your parent&apos;s email. They&apos;ll get a link to confirm — this unlocks
            leaderboards and PvP, and you earn 100 gold.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="email"
              required
              placeholder="Parent's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-2.5 py-1.5 text-white"
            />
            {error && <p className="text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="self-start bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              {status === 'sending' ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
