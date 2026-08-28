'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

interface ParentChild {
  id: string;
  full_name: string;
  grade: string;
  school_name: string;
  is_active: boolean;
}

interface Parent {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  marketing_opt_in: boolean;
  created_at: string;
  children: ParentChild[];
}

const STATUS_STYLES: Record<Parent['status'], string> = {
  pending: 'bg-amber-900/50 text-amber-400 border border-amber-800',
  approved: 'bg-[#223616]/50 text-[#7fae52] border border-[#33501f]',
  rejected: 'bg-[#4a0e0c]/50 text-[#e0605a] border border-[#6e1512]',
};

export default function ParentsSection() {
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Parent['status']>('All');
  const [search, setSearch] = useState('');

  const loadSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email || null);
  };

  const loadParents = async () => {
    setListError('');
    const { data, error } = await supabase.rpc('admin_list_parents');
    if (error) {
      setListError(error.message);
      return;
    }
    setParents((data as Parent[]) || []);
  };

  useEffect(() => { loadSession(); }, []);
  useEffect(() => {
    if (userEmail && userEmail === ADMIN_EMAIL) loadParents();
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
    loadParents();
  };

  const handleSetStatus = async (parentId: string, status: 'approved' | 'rejected' | 'pending') => {
    setBusyId(parentId);
    const { error } = await supabase.rpc('admin_set_parent_status', { p_parent_id: parentId, p_status: status });
    setBusyId(null);
    if (error) {
      setListError(error.message);
      return;
    }
    loadParents();
  };

  if (userEmail === undefined) {
    return <p className="text-[#8a7c66] text-sm">Loading…</p>;
  }

  if (!userEmail) {
    return (
      <div>
        <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Parents</h2>
        <p className="text-[#8a7c66] text-sm mb-6">Sign in with the admin account to manage parent accounts.</p>
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#1c1611] border border-[#3d3225] rounded-xl p-6 space-y-4">
          <input
            type="email"
            placeholder="Admin email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full rounded-lg bg-neutral-950 border border-[#3d3225] px-3 py-2 text-sm text-[#ede4d3]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full rounded-lg bg-neutral-950 border border-[#3d3225] px-3 py-2 text-sm text-[#ede4d3]"
            required
          />
          {loginError && <p className="text-[#e0605a] text-xs">{loginError}</p>}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[#ede4d3] font-bold py-2.5"
          >
            {loggingIn ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </div>
    );
  }

  if (userEmail !== ADMIN_EMAIL) {
    return <p className="text-[#8a7c66] text-sm">Signed in as {userEmail}, which isn&apos;t the admin account.</p>;
  }

  const filtered = parents.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.full_name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Parents</h2>
      <p className="text-[#8a7c66] text-sm mb-6">Manage every parent account — pending, approved, and rejected.</p>

      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3]">
          <option value="All">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input type="text" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3]" />
      </div>

      {listError && <p className="text-[#e0605a] text-sm mb-4">{listError}</p>}
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-[#8a7c66] text-sm">No parents match these filters.</p>}
        {filtered.map((p) => (
          <div key={p.id} className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[#ede4d3] font-bold text-sm">{p.full_name}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                </div>
                <p className="text-[#8a7c66] text-xs">{p.email}{p.phone ? ` · ${p.phone}` : ''}</p>
                <p className="text-gray-600 text-xs">Registered {new Date(p.created_at).toLocaleString()}</p>
                {p.children.length > 0 && (
                  <p className="text-[#8a7c66] text-xs mt-2">
                    Children: {p.children.map(c => `${c.full_name} (${c.grade}${c.is_active ? '' : ', inactive'})`).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => handleDecision(p.id, 'approve')} disabled={busyId === p.id}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[#ede4d3] text-xs font-bold px-4 py-1.5">
                      Approve
                    </button>
                    <button onClick={() => handleDecision(p.id, 'reject')} disabled={busyId === p.id}
                      className="rounded-lg border border-[#6e1512] text-[#e0605a] hover:bg-red-950 disabled:opacity-50 text-xs font-bold px-4 py-1.5">
                      Reject
                    </button>
                  </>
                )}
                {p.status === 'approved' && (
                  <button onClick={() => handleSetStatus(p.id, 'rejected')} disabled={busyId === p.id}
                    className="rounded-lg border border-[#6e1512] text-[#e0605a] hover:bg-red-950 disabled:opacity-50 text-xs font-bold px-4 py-1.5">
                    Suspend
                  </button>
                )}
                {p.status === 'rejected' && (
                  <button onClick={() => handleSetStatus(p.id, 'approved')} disabled={busyId === p.id}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[#ede4d3] text-xs font-bold px-4 py-1.5">
                    Reinstate
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
