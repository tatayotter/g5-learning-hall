'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// The link an old parent gets in the admin-reassignment-notify email — see
// docs/parent-child-linking-design.md. No auth required: the cancel token
// itself, emailed only to that parent's inbox, is the proof of authority
// here, same pattern as the parent-link invite token.
export default function CancelReassignmentAction() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    supabase.rpc('cancel_child_reassignment', { p_cancel_token: token }).then(({ error }) => {
      setStatus(error ? 'error' : 'done');
    });
  }, [token]);

  if (status === 'loading') {
    return <p className="text-center text-gray-500 text-sm">Cancelling…</p>;
  }

  if (status === 'error') {
    return (
      <div className="text-center space-y-2">
        <p className="text-red-400 font-semibold">This link is invalid or already resolved.</p>
        <p className="text-gray-500 text-sm">
          It may have already been cancelled, already completed, or the link has expired.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-2">
      <p className="text-2xl">✅</p>
      <p className="text-white font-bold">Reassignment cancelled.</p>
      <p className="text-gray-500 text-sm">Nothing has changed on the account.</p>
    </div>
  );
}
