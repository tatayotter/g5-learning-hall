'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';

interface ParentRow {
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
}

interface ChildRow {
  id: string;
  full_name: string;
  grade: string;
  gender: string;
  school_name: string;
  avatar: string;
  username: string;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChild, setNewChild] = useState<ChildFormData>(emptyChildForm());
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/parent-login');
      return;
    }
    const { data: parentRow } = await supabase
      .from('parents')
      .select('status, full_name')
      .eq('id', user.id)
      .single();
    setParent(parentRow as ParentRow);

    if (parentRow?.status === 'approved') {
      const { data: children } = await supabase
        .from('children')
        .select('id, full_name, grade, gender, school_name, avatar, username')
        .eq('parent_id', user.id);
      setKids((children as ChildRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newChild.fullName.trim() || !newChild.schoolName.trim() || !newChild.username.trim() || newChild.pin.length !== 4) {
      setAddError('Please fill in every field, including a 4-digit PIN.');
      return;
    }
    setAdding(true);
    const { error } = await supabase.rpc('create_child_account', {
      p_username: newChild.username,
      p_pin: newChild.pin,
      p_full_name: newChild.fullName,
      p_grade: newChild.grade,
      p_gender: newChild.gender,
      p_school_name: newChild.schoolName,
      p_avatar: newChild.avatar,
    });
    setAdding(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setNewChild(emptyChildForm());
    setShowAddChild(false);
    load();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/parent-login');
  };

  if (loading) {
    return <main className="min-h-screen bg-black flex items-center justify-center text-gray-500">Loading…</main>;
  }

  if (!parent) {
    return <main className="min-h-screen bg-black flex items-center justify-center text-gray-500">Could not load your account.</main>;
  }

  if (parent.status === 'pending') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="text-xl font-display font-bold text-white">⏳ Pending Approval</h1>
          <p className="text-gray-400 text-sm">
            Thanks for registering, {parent.full_name}! An admin still needs to review and approve your account before you can manage your children here. Check back later.
          </p>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-300 underline">Sign out</button>
        </div>
      </main>
    );
  }

  if (parent.status === 'rejected') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="text-xl font-display font-bold text-white">Registration Rejected</h1>
          <p className="text-gray-400 text-sm">Your registration was not approved.</p>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-300 underline">Sign out</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-white">Welcome, {parent.full_name}</h1>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-300 underline">Sign out</button>
        </div>

        <div className="space-y-3">
          {kids.length === 0 && <p className="text-gray-500 text-sm">No children added yet.</p>}
          {kids.map((kid) => (
            <div key={kid.id} className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 flex items-center gap-3">
              <img src={kid.avatar} alt="" className="w-12 h-12 rounded-lg object-cover border border-neutral-700" />
              <div>
                <p className="text-white text-sm font-bold">{kid.full_name}</p>
                <p className="text-gray-500 text-xs">{kid.grade} · {kid.school_name} · @{kid.username}</p>
              </div>
            </div>
          ))}
        </div>

        {showAddChild ? (
          <form onSubmit={handleAddChild} className="space-y-3">
            <ChildAccountForm label="New Child" data={newChild} onChange={setNewChild} />
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowAddChild(false); setAddError(''); }}
                className="flex-1 rounded-lg border border-neutral-700 text-gray-400 py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5"
              >
                {adding ? 'Adding…' : 'Add Child'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddChild(true)}
            className="w-full rounded-lg border border-dashed border-neutral-700 py-2.5 text-sm text-gray-400 hover:text-indigo-300 hover:border-indigo-400"
          >
            + Add a child
          </button>
        )}
      </div>
    </main>
  );
}
