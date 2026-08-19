'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isNativeApp } from '@/lib/platform';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';
import ChildProgressPanel from '@/components/ChildProgressPanel';
import WeeklyLessonsPanel from '@/components/WeeklyLessonsPanel';

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
  const [expandedLessons, setExpandedLessons] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [maxChildren, setMaxChildren] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isNative, setIsNative] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugSent, setBugSent] = useState(false);
  const [showOptOutConfirm, setShowOptOutConfirm] = useState(false);

  const isPremium = subscription?.status === 'active';

  useEffect(() => { setIsNative(isNativeApp()); }, []);

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

  const handleBugReport = () => {
    const subject = encodeURIComponent('[Learning Hall] Bug Report');
    const body = encodeURIComponent(
      `Parent: ${parent?.full_name ?? 'unknown'}\n\n` +
      `Description:\n${bugText.trim()}\n\n` +
      `---\nSent from Parent Dashboard`
    );
    window.open(`mailto:tatay@learninghallph.com?subject=${subject}&body=${body}`);
    setBugSent(true);
    setBugText('');
    setTimeout(() => {
      setBugSent(false);
      setShowBugReport(false);
    }, 2500);
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
    <main className="min-h-screen bg-black py-10 px-4 pb-20">
      <div className="max-w-lg mx-auto space-y-5">
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
          ) : isNative ? (
            <span className="text-sm text-gray-400">Free plan — Premium unlocks journal viewing & coin rewards.</span>
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
        {!isPremium && !isNative && (
          <a href="/parent-dashboard/pricing" className="block text-center text-xs text-indigo-300 hover:text-indigo-200 underline">
            See full pricing details
          </a>
        )}
        {checkoutError && !isPremium && kids.length < maxChildren && <p className="text-red-400 text-xs">{checkoutError}</p>}

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
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setExpandedLessons(expandedLessons === kid.id ? null : kid.id)}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  {expandedLessons === kid.id ? 'Hide lessons ▲' : "This week's lessons ▼"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedChild(expandedChild === kid.id ? null : kid.id)}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  {expandedChild === kid.id ? 'Hide progress ▲' : 'View progress ▼'}
                </button>
              </div>

              {expandedLessons === kid.id && (
                <WeeklyLessonsPanel grade={kid.grade} />
              )}

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
            {isNative ? null : isPremium && subscription!.addon_children < 2 ? (
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

        {/* ── Danger zone — pushed far from main content ── */}
        <div className="mt-16 pt-8 border-t border-neutral-800/60 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 select-none">More options</p>

          {/* Email updates opt-in/out */}
          {!showOptOutConfirm ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                📧 Email updates — progress tips &amp; news
              </span>
              {parent.marketing_opt_in ? (
                <button
                  type="button"
                  onClick={() => setShowOptOutConfirm(true)}
                  disabled={togglingOptIn}
                  className="text-[11px] text-gray-600 hover:text-gray-400 underline disabled:opacity-50"
                >
                  Unsubscribe
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleOptIn}
                  disabled={togglingOptIn}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline disabled:opacity-50"
                >
                  {togglingOptIn ? '…' : 'Subscribe'}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 space-y-2">
              <p className="text-xs text-gray-300">Stop receiving email updates from Learning Hall?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOptOutConfirm(false)}
                  className="flex-1 rounded-lg border border-neutral-700 text-gray-400 py-2 text-xs"
                >
                  Keep me subscribed
                </button>
                <button
                  type="button"
                  onClick={async () => { await handleToggleOptIn(); setShowOptOutConfirm(false); }}
                  disabled={togglingOptIn}
                  className="flex-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-gray-300 text-xs py-2"
                >
                  {togglingOptIn ? '…' : 'Yes, unsubscribe'}
                </button>
              </div>
            </div>
          )}

          {/* Bug report */}
          {!showBugReport ? (
            <button
              onClick={() => { setShowBugReport(true); setBugSent(false); }}
              className="block text-xs text-yellow-500/60 hover:text-yellow-400 underline"
            >
              🐛 Report a bug
            </button>
          ) : (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4 space-y-3">
              <p className="text-sm text-yellow-300 font-semibold">🐛 Report a Bug</p>
              <p className="text-xs text-gray-400">Describe what happened and we'll look into it.</p>
              {bugSent ? (
                <p className="text-sm text-green-400">✓ Thanks! Your report is on its way.</p>
              ) : (
                <>
                  <textarea
                    value={bugText}
                    onChange={(e) => setBugText(e.target.value)}
                    rows={4}
                    placeholder="e.g. The progress panel doesn't load for my child…"
                    className="w-full rounded-lg bg-black border border-neutral-700 px-3 py-2 text-sm text-white resize-none placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/60"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowBugReport(false); setBugText(''); }}
                      className="flex-1 rounded-lg border border-neutral-700 text-gray-400 py-2.5 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBugReport}
                      disabled={!bugText.trim()}
                      className="flex-1 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white font-bold py-2.5 text-sm"
                    >
                      Send Report
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Account deletion */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="block text-xs text-red-500/50 hover:text-red-400 underline"
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
