'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PendingParent {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

export default function AdminApprovalsPage() {
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [pending, setPending] = useState<PendingParent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState('');

  const loadSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? null);
  };

  const loadPending = async () => {
    setListError('');
    const { data, error } = await supabase.rpc('admin_list_pending_parents');
    if (error) {
      setListError(error.message);
      return;
    }
    setPending((data as PendingParent[]) || []);
  };

  useEffect(() => { loadSession(); }, []);
  useEffect(() => {
    if (userEmail && userEmail === ADMIN_EMAIL) loadPending();
  }, [userEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoggingIn(false);
    if (error) {
      setLoginError('Incorrect email or password.');
      return;
    }
    loadSession();
  };

  const handleDecision = async (parentId: string, decision: 'approve' | 'reject') => {
    setBusyId(parentId);
    const { error } = await supabase.rpc(decision === 'approve' ? 'approve_parent' : 'reject_parent', { p_parent_id: parentId });
    setBusyId(null);
    if (error) {
      setListError(error.message);
      return;
    }
    loadPending();
  };

  if (userEmail === undefined) {
    return <main className="min-h-screen bg-black flex items-center justify-center text-gray-500">Loading…</main>;
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-display font-bold text-white text-center">Admin Login</h1>
          <input
            type="email"
            placeholder="Admin email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
            required
          />
          {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5"
          >
            {loggingIn ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </main>
    );
  }

  if (userEmail !== ADMIN_EMAIL) {
    return <main className="min-h-screen bg-black flex items-center justify-center text-gray-500">Not authorized.</main>;
  }

  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-display font-bold text-white">Pending Parent Registrations</h1>
        {listError && <p className="text-red-400 text-sm">{listError}</p>}
        {pending.length === 0 && <p className="text-gray-500 text-sm">No pending registrations.</p>}
        {pending.map((p) => (
          <div key={p.id} className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-2">
            <p className="text-white font-bold text-sm">{p.full_name}</p>
            <p className="text-gray-500 text-xs">{p.email}{p.phone ? ` · ${p.phone}` : ''}</p>
            <p className="text-gray-600 text-xs">Registered {new Date(p.created_at).toLocaleString()}</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handleDecision(p.id, 'reject')}
                disabled={busyId === p.id}
                className="flex-1 rounded-lg border border-red-800 text-red-400 hover:bg-red-950 disabled:opacity-50 py-2 text-sm"
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision(p.id, 'approve')}
                disabled={busyId === p.id}
                className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 text-sm"
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
