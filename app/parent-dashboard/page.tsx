'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';
import ChildProgressPanel from '@/components/ChildProgressPanel';

interface ParentRow {
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
  marketing_opt_in: boolean;
}

interface SubscriptionRow {
  status: 'none' | 'pending' | 'active' | 'expired' | 'cancelled';
  addon_children: number;
  coin_pool_balance: number;
  current_period_end: string | null;
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
  const [togglingOptIn, setTogglingOptIn] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, string | null>>({});
  const [pinLoading, setPinLoading] = useState<string | null>(null);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [maxChildren, setMaxChildren] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const isPremium = subscription?.status === 'active';

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/parent-login');
      return;
    }
    const { data: parentRow } = await supabase
      .from('parents')
      .select('status, full_name, marketing_opt_in')
      .eq('id', user.id)
      .single();
    setParent(parentRow as ParentRow);

    if (parentRow?.status === 'approved') {
      const [{ data: children }, { data: subRow }, { data: maxKids }] = await Promise.all([
        supabase
          .from('children')
          .select('id, full_name, grade, gender, school_name, avatar, username')
          .eq('parent_id', user.id),
        supabase
          .from('subscriptions')
          .select('status, addon_children, coin_pool_balance, current_period_end')
          .eq('parent_id', user.id)
          .maybeSingle(),
        supabase.rpc('max_children_for_parent', { p_parent_id: user.id }),
      ]);
      setKids((children as ChildRow[]) || []);
      setSubscription((subRow as SubscriptionRow) ?? null);
      setMaxChildren((maxKids as number) ?? 1);
    }
    setLoading(false);
  };

  const handleSubscribe = async (addonChildren: number) => {
    setCheckoutError('');
    setCheckingOut(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ addonChildren }),
    });
    const body = await res.json().catch(() => ({}));
    setCheckingOut(false);
    if (!res.ok || !body.success) {
      setCheckoutError(body.error || 'Could not start checkout.');
      return;
    }
    window.location.href = body.checkoutUrl;
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

  const handleToggleOptIn = async () => {
    if (!parent) return;
    const nextValue = !parent.marketing_opt_in;
    setTogglingOptIn(true);
    const { error } = await supabase.rpc('set_marketing_opt_in', { p_opt_in: nextValue });
    setTogglingOptIn(false);
    if (error) {
      console.error('Failed to update email preference:', error);
      return;
    }
    setParent({ ...parent, marketing_opt_in: nextValue });
    if (nextValue) {
      supabase.functions.invoke('sendfox-sync').then(({ error: syncError }) => {
        if (syncError) console.error('Failed to sync SendFox contact:', syncError);
      });
    }
  };

  const handleTogglePin = async (childId: string) => {
    if (childId in revealedPins) {
      setRevealedPins((prev) => {
        const next = { ...prev };
        delete next[childId];
        return next;
      });
      return;
    }
    setPinLoading(childId);
    const { data, error } = await supabase.rpc('get_child_pin', { p_child_id: childId });
    setPinLoading(null);
    if (error) {
      console.error('Failed to load PIN:', error);
      return;
    }
    setRevealedPins((prev) => ({ ...prev, [childId]: data ?? null }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/parent-login');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);
    const { error: rpcError } = await supabase.rpc('delete_own_family_data');
    if (rpcError) {
      setDeleteError(rpcError.message);
      setDeleting(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/account-delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteError(body.error || 'Could not finish deleting your account. Your data was removed, but sign-in still exists — contact support.');
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push('/');
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

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 flex items-center justify-between gap-3">
          {isPremium ? (
            <>
              <span className="text-sm text-amber-300">⭐ Premium · 🪙 {subscription!.coin_pool_balance} coins left</span>
              {subscription!.current_period_end && (
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  renews {new Date(subscription!.current_period_end).toLocaleDateString()}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-sm text-gray-400">Free plan — journal viewing & coin rewards are Premium.</span>
              <button
                onClick={() => handleSubscribe(0)}
                disabled={checkingOut}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 whitespace-nowrap"
              >
                {checkingOut ? 'Redirecting…' : 'Subscribe ₱249/yr'}
              </button>
            </>
          )}
        </div>
        {checkoutError && !isPremium && kids.length < maxChildren && <p className="text-red-400 text-xs">{checkoutError}</p>}

        <label className="flex items-start gap-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2.5 cursor-pointer hover:border-indigo-400">
          <input
            type="checkbox"
            checked={parent.marketing_opt_in}
            onChange={handleToggleOptIn}
            disabled={togglingOptIn}
            className="mt-0.5 h-4 w-4 accent-indigo-500"
          />
          <span className="text-sm text-indigo-200">
            <span className="font-semibold text-indigo-300">Email updates</span> — send occasional progress tips and updates. You can toggle this anytime.
          </span>
        </label>

        <div className="space-y-3">
          {kids.length === 0 && <p className="text-gray-500 text-sm">No children added yet.</p>}
          {kids.map((kid) => (
            <div key={kid.id} className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-3">
                <img src={kid.avatar} alt="" className="w-12 h-12 rounded-lg object-cover border border-neutral-700" />
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">{kid.full_name}</p>
                  <p className="text-gray-500 text-xs">{kid.grade} · {kid.school_name} · @{kid.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePin(kid.id)}
                  disabled={pinLoading === kid.id}
                  className="text-xs text-indigo-300 hover:text-indigo-200 underline disabled:opacity-50 whitespace-nowrap"
                >
                  {pinLoading === kid.id
                    ? '…'
                    : kid.id in revealedPins
                      ? (revealedPins[kid.id] ?? 'PIN unavailable — reset it')
                      : 'Show PIN'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExpandedChild(expandedChild === kid.id ? null : kid.id)}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                {expandedChild === kid.id ? 'Hide progress ▲' : 'View progress ▼'}
              </button>
              {expandedChild === kid.id && (
                <ChildProgressPanel
                  childId={kid.id}
                  isPremium={isPremium}
                  coinBalance={subscription?.coin_pool_balance ?? 0}
                  onCoinsAwarded={(amount) =>
                    setSubscription((prev) => (prev ? { ...prev, coin_pool_balance: prev.coin_pool_balance - amount } : prev))
                  }
                />
              )}
            </div>
          ))}
        </div>

        {kids.length >= maxChildren ? (
          <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 space-y-2 text-center">
            <p className="text-sm text-amber-300">
              {isPremium
                ? `You've reached your child limit (${maxChildren}).`
                : `Free accounts can add 1 child. Subscribe to add more.`}
            </p>
            {isPremium && subscription!.addon_children < 2 ? (
              <button
                onClick={() => handleSubscribe(subscription!.addon_children + 1)}
                disabled={checkingOut}
                className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold py-2"
              >
                {checkingOut ? 'Redirecting…' : `+ Add a child slot (₱99/yr, renews at ₱${249 + (subscription!.addon_children + 1) * 99}/yr)`}
              </button>
            ) : !isPremium ? (
              <button
                onClick={() => handleSubscribe(0)}
                disabled={checkingOut}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold py-2"
              >
                {checkingOut ? 'Redirecting…' : 'Subscribe — ₱249/yr'}
              </button>
            ) : null}
            {checkoutError && <p className="text-red-400 text-xs">{checkoutError}</p>}
          </div>
        ) : showAddChild ? (
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

        <div className="pt-6 border-t border-neutral-800">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-500/70 hover:text-red-400 underline"
            >
              Delete my account
            </button>
          ) : (
            <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 space-y-3">
              <p className="text-sm text-red-300 font-semibold">This permanently deletes your account and every child's progress. This cannot be undone.</p>
              <p className="text-xs text-gray-400">Type DELETE below to confirm.</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-lg bg-black border border-neutral-700 px-3 py-2 text-sm text-white"
                placeholder="DELETE"
              />
              {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(''); }}
                  className="flex-1 rounded-lg border border-neutral-700 text-gray-400 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5"
                >
                  {deleting ? 'Deleting…' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
