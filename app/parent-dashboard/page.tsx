'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isNativeApp } from '@/lib/platform';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';
import ChildProgressPanel from '@/components/ChildProgressPanel';
import ChildComparisonPanel from '@/components/ChildComparisonPanel';
import WeeklyLessonsPanel from '@/components/WeeklyLessonsPanel';
import ParentBlogResources from '@/components/ParentBlogResources';
import PushNotificationSettings from '@/components/PushNotificationSettings';

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
  const [showComparison, setShowComparison] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);

  const isPremium = subscription?.status === 'active';

  useEffect(() => { setIsNative(isNativeApp()); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/parent-login');
      return;
    }
    setParentId(user.id);
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
    return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center text-stone-500">Loading…</main>;
  }

  if (!parent) {
    return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center text-stone-500">Could not load your account.</main>;
  }

  if (parent.status === 'pending') {
    // New registrations are approved automatically — this only shows for an
    // account an admin has manually parked back in review.
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="text-xl font-display font-bold text-slate-800">⏳ Pending Review</h1>
          <p className="text-stone-500 text-base">
            Thanks for registering, {parent.full_name}! Your account is being reviewed — check back
            shortly.
          </p>
          <button onClick={handleSignOut} className="text-sm text-stone-500 hover:text-slate-700 underline">Sign out</button>
        </div>
      </main>
    );
  }

  if (parent.status === 'rejected') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="text-xl font-display font-bold text-slate-800">Registration Rejected</h1>
          <p className="text-stone-500 text-base">Your registration was not approved.</p>
          <button onClick={handleSignOut} className="text-sm text-stone-500 hover:text-slate-700 underline">Sign out</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-slate-800">Welcome, {parent.full_name}</h1>
          <button onClick={handleSignOut} className="text-sm text-stone-500 hover:text-slate-700 underline">Sign out</button>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
          {isPremium ? (
            <>
              <span className="text-base text-amber-700 font-semibold">⭐ Premium · 🪙 {subscription!.coin_pool_balance} coins left</span>
              {subscription!.current_period_end && (
                <span className="text-xs text-stone-500 whitespace-nowrap">
                  renews {new Date(subscription!.current_period_end).toLocaleDateString()}
                </span>
              )}
            </>
          ) : isNative ? (
            <span className="text-base text-stone-600">Free plan — Premium unlocks journal viewing & coin rewards.</span>
          ) : kids.length >= maxChildren ? (
            // Already at the free child limit — the more contextual "Subscribe to
            // add more" CTA below covers this, so don't repeat the same button here.
            <span className="text-base text-stone-600">Free plan — journal viewing & coin rewards are Premium.</span>
          ) : (
            <>
              <span className="text-base text-stone-600">Free plan — journal viewing & coin rewards are Premium.</span>
              <button
                onClick={() => handleSubscribe(0)}
                disabled={checkingOut}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] text-sm font-bold px-3 py-1.5 whitespace-nowrap transition-colors"
              >
                {checkingOut ? 'Redirecting…' : 'Subscribe ₱249/yr'}
              </button>
            </>
          )}
        </div>
        {!isPremium && !isNative && (
          <a href="/parent-dashboard/pricing" className="block text-center text-sm text-amber-700 hover:text-amber-800 underline">
            See full pricing details
          </a>
        )}
        {checkoutError && !isPremium && kids.length < maxChildren && <p className="text-red-500 text-sm">{checkoutError}</p>}

        {kids.length > 1 && (
          isPremium ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowComparison((v) => !v)}
                className="text-sm text-amber-700 hover:text-amber-800 underline"
              >
                {showComparison ? 'Hide comparison ▲' : 'Compare children ▼'}
              </button>
              {showComparison && <ChildComparisonPanel kids={kids} />}
            </div>
          ) : (
            <p className="text-sm text-stone-400">🔒 Comparing children side-by-side is a Premium feature.</p>
          )
        )}

        <div className="space-y-3">
          {kids.length === 0 && <p className="text-stone-500 text-base">No children added yet.</p>}
          {kids.map((kid) => (
            <div key={kid.id} className="bg-[#ffffff] border border-stone-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={kid.avatar} alt="" className="w-12 h-12 rounded-lg object-cover border border-stone-200" />
                <div className="flex-1">
                  <p className="text-slate-800 text-base font-bold">{kid.full_name}</p>
                  <p className="text-stone-500 text-sm">{kid.grade} · {kid.school_name} · @{kid.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePin(kid.id)}
                  disabled={pinLoading === kid.id}
                  className="text-sm text-amber-700 hover:text-amber-800 underline disabled:opacity-50 whitespace-nowrap"
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
                  className="text-sm text-stone-500 hover:text-slate-800 underline"
                >
                  {expandedLessons === kid.id ? 'Hide lessons ▲' : "This week's lessons ▼"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedChild(expandedChild === kid.id ? null : kid.id)}
                  className="text-sm text-stone-500 hover:text-slate-800 underline"
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
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 space-y-2 text-center">
            <p className="text-base text-amber-700">
              {isPremium
                ? `You've reached your child limit (${maxChildren}).`
                : `Free accounts can add 1 child. Subscribe to add more.`}
            </p>
            {isNative ? null : isPremium && subscription!.addon_children < 2 ? (
              <button
                onClick={() => handleSubscribe(subscription!.addon_children + 1)}
                disabled={checkingOut}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] text-base font-bold py-2.5 shadow-lg shadow-orange-500/25 transition-colors"
              >
                {checkingOut ? 'Redirecting…' : `+ Add a child slot (₱99/yr, renews at ₱${249 + (subscription!.addon_children + 1) * 99}/yr)`}
              </button>
            ) : !isPremium ? (
              <button
                onClick={() => handleSubscribe(0)}
                disabled={checkingOut}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] text-base font-bold py-2.5 shadow-lg shadow-orange-500/25 transition-colors"
              >
                {checkingOut ? 'Redirecting…' : 'Subscribe — ₱249/yr'}
              </button>
            ) : null}
            {checkoutError && <p className="text-red-500 text-sm">{checkoutError}</p>}
          </div>
        ) : showAddChild ? (
          <form onSubmit={handleAddChild} className="space-y-3">
            <div className="bg-[#ffffff] border border-stone-200 rounded-2xl p-5 shadow-sm">
              <ChildAccountForm theme="light" label="New Child" data={newChild} onChange={setNewChild} />
            </div>
            {addError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <p className="text-base text-red-600">{addError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowAddChild(false); setAddError(''); }}
                className="flex-1 rounded-xl border border-stone-300 text-stone-500 hover:text-slate-800 hover:border-stone-400 font-bold text-base py-3 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-[#ffffff] font-bold text-base py-3 shadow-lg shadow-orange-500/25 transition-colors"
              >
                {adding ? 'Adding…' : 'Add Child'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddChild(true)}
            className="w-full rounded-xl border border-dashed border-stone-300 py-3 text-base text-stone-500 hover:text-amber-700 hover:border-amber-300 transition-colors"
          >
            + Add a child
          </button>
        )}

        {/* ── Parent Facebook group ── */}
        <a
          href="https://www.facebook.com/groups/1403800008384313"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 px-4 py-3 shadow-sm transition-colors group"
        >
          <span className="w-9 h-9 rounded-full bg-[#1877F2] text-[#ffffff] flex items-center justify-center text-lg shrink-0">f</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-sky-800">Join our Parent Facebook Group</p>
            <p className="text-xs text-sky-700/70">Swap tips, ask questions, and connect with other Learning Hall parents</p>
          </div>
          <span className="text-sky-600 group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
        </a>

        {/* ── Blog resources ── */}
        {kids.length > 0 && (
          <ParentBlogResources
            grades={[...new Set(kids.map(k => parseInt(k.grade.replace(/\D/g, ''), 10)).filter(Boolean))]}
          />
        )}

        {/* ── Danger zone — pushed far from main content ── */}
        <div className="mt-16 pt-8 border-t border-stone-200 space-y-3">
          <p className="text-xs uppercase tracking-widest text-stone-400 select-none">More options</p>

          {/* Push notifications on this device */}
          {parentId && <PushNotificationSettings owner={{ kind: 'parent', id: parentId }} />}

          {/* Email updates opt-in/out */}
          {!showOptOutConfirm ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-500">
                📧 Email updates — progress tips &amp; news
                {!parent.marketing_opt_in && <span className="text-amber-700"> · get 250 free gold 🪙</span>}
              </span>
              {parent.marketing_opt_in ? (
                <button
                  type="button"
                  onClick={() => setShowOptOutConfirm(true)}
                  disabled={togglingOptIn}
                  className="text-xs text-stone-500 hover:text-stone-700 underline disabled:opacity-50"
                >
                  Unsubscribe
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleOptIn}
                  disabled={togglingOptIn}
                  className="text-xs text-amber-700 hover:text-amber-800 underline disabled:opacity-50"
                >
                  {togglingOptIn ? '…' : 'Subscribe'}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-[#ffffff] p-4 space-y-2 shadow-sm">
              <p className="text-sm text-slate-700">Stop receiving email updates from Learning Hall?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOptOutConfirm(false)}
                  className="flex-1 rounded-lg border border-stone-300 text-stone-500 py-2 text-sm"
                >
                  Keep me subscribed
                </button>
                <button
                  type="button"
                  onClick={async () => { await handleToggleOptIn(); setShowOptOutConfirm(false); }}
                  disabled={togglingOptIn}
                  className="flex-1 rounded-lg bg-stone-200 hover:bg-stone-300 disabled:opacity-50 text-stone-700 text-sm py-2"
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
              className="block text-sm text-amber-600 hover:text-amber-700 underline"
            >
              🐛 Report a bug
            </button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-base text-amber-800 font-semibold">🐛 Report a Bug</p>
              <p className="text-sm text-stone-500">Describe what happened and we'll look into it.</p>
              {bugSent ? (
                <p className="text-base text-green-600">✓ Thanks! Your report is on its way.</p>
              ) : (
                <>
                  <textarea
                    value={bugText}
                    onChange={(e) => setBugText(e.target.value)}
                    rows={4}
                    placeholder="e.g. The progress panel doesn't load for my child…"
                    className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 resize-none placeholder:text-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowBugReport(false); setBugText(''); }}
                      className="flex-1 rounded-xl border border-stone-300 text-stone-500 py-3 text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBugReport}
                      disabled={!bugText.trim()}
                      className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-[#ffffff] font-bold py-3 text-base transition-colors"
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
              className="block text-sm text-red-500/70 hover:text-red-600 underline"
            >
              Delete my account
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-base text-red-700 font-semibold">This permanently deletes your account and every child's progress. This cannot be undone.</p>
              <p className="text-sm text-stone-500">Type DELETE below to confirm.</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                placeholder="DELETE"
              />
              {deleteError && <p className="text-red-500 text-base">{deleteError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(''); }}
                  className="flex-1 rounded-xl border border-stone-300 text-stone-500 py-3 text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-[#ffffff] font-bold py-3 text-base transition-colors"
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
