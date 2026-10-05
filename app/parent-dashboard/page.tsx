'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isNativeApp } from '@/lib/platform';
import { ChildFormData, emptyChildForm, defaultAvatarForGender, GRADES } from '@/components/ChildAccountForm';
import ChildProgressPanel from '@/components/ChildProgressPanel';
import ChildComparisonPanel from '@/components/ChildComparisonPanel';
import WeeklyLessonsPanel from '@/components/WeeklyLessonsPanel';
import ParentBlogResources from '@/components/ParentBlogResources';
import PushNotificationSettings from '@/components/PushNotificationSettings';
import { initNativePush, recordPushOpenFromUrl } from '@/lib/push';
import { trackParentEvent } from '@/lib/analytics';
import { useScreenTime } from '@/hooks/useScreenTime';
import ParentPushOptIn from '@/components/parent/ParentPushOptIn';
import SchoolPicker from '@/components/SchoolPicker';
import { checkSignupNames, friendlyNameError } from '@/lib/nameFilter';
import { CHILD_SLOT_PRICE_PHP } from '@/lib/pricingPlans';
import {
  IOS, Icon, IosAlert, IosBarButton, IosButton, IosCapsule, IosContent, IosField, IosGroup,
  IosIconTile, IosNavBar, IosPushedPage, IosRow, IosScreen, IosSegmented, IosSheet, IosSwitch,
} from '@/components/parent/ios';

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

type SheetKind = 'addChild' | 'compare' | 'bug' | 'delete' | 'lessons' | null;

const SUPPORT_EMAIL = 'tatay@learninghallph.com';
const FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/1403800008384313';
const MESSENGER_URL = 'https://m.me/learninghallph';

export default function ParentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [newChild, setNewChild] = useState<ChildFormData>(emptyChildForm());
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [togglingOptIn, setTogglingOptIn] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, string | null>>({});
  const [pinLoading, setPinLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [maxChildren, setMaxChildren] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isNative, setIsNative] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugSent, setBugSent] = useState(false);
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugError, setBugError] = useState('');
  const [showOptOutConfirm, setShowOptOutConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  // The child whose detail page is "pushed" on top of the family list. Mirrored
  // into history state so the phone's back gesture/button pops it like iOS.
  const [openChildId, setOpenChildId] = useState<string | null>(null);

  const isPremium = subscription?.status === 'active';
  const openChild = kids.find((k) => k.id === openChildId) ?? null;

  useEffect(() => { setIsNative(isNativeApp()); }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      setOpenChildId((e.state as { pdChild?: string } | null)?.pdChild ?? null);
      setSheet(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const pushChild = (id: string) => {
    trackParentEvent('parent_child_opened', { child_id: id });
    window.history.pushState({ pdChild: id }, '');
    setOpenChildId(id);
  };
  const popChild = () => {
    if ((window.history.state as { pdChild?: string } | null)?.pdChild) window.history.back();
    else setOpenChildId(null);
  };

  const closeSheet = useCallback(() => setSheet(null), []);

  useScreenTime(
    loading || parent?.status !== 'approved' ? null : openChildId ? 'parent_child' : 'parent_home',
    (name, props, options) => trackParentEvent(name, props, options)
  );
  useEffect(() => {
    if (sheet) trackParentEvent('parent_sheet_opened', { sheet });
  }, [sheet]);

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

    let viewStats: { children: number; premium: boolean } | null = null;
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
      viewStats = { children: children?.length ?? 0, premium: (subRow as SubscriptionRow | null)?.status === 'active' };
    }
    setLoading(false);
    return viewStats;
  };

  // 'premium' buys/renews the ₱249 year; 'childSlot' is the separate one-time
  // ₱99 slot that never touches the renewal date or coin pool.
  const startCheckout = async (kind: 'premium' | 'childSlot') => {
    trackParentEvent('parent_checkout_started', { kind, from: 'dashboard' });
    setCheckoutError('');
    setCheckingOut(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(kind === 'premium' ? '/api/create-checkout' : '/api/create-child-slot-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({}),
    });
    const body = await res.json().catch(() => ({}));
    setCheckingOut(false);
    if (!res.ok || !body.success) {
      setCheckoutError(body.error || 'Could not start checkout.');
      return;
    }
    window.location.href = body.checkoutUrl;
  };

  // Play app: route notification taps and keep this device's push token fresh.
  useEffect(() => {
    if (parentId) initNativePush({ kind: 'parent', id: parentId });
  }, [parentId]);

  useEffect(() => {
    // Parent pushes deep-link here with ?pq=<queue id>; record the open,
    // then drop the param so a refresh doesn't count it again.
    recordPushOpenFromUrl();
    if (new URLSearchParams(window.location.search).has('pq')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    load().then((viewStats) => {
      if (viewStats) trackParentEvent('parent_dashboard_viewed', viewStats);
    });
  }, []);

  const handleAddChild = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAddError('');
    if (!newChild.fullName.trim() || !newChild.schoolName.trim() || !newChild.username.trim() || newChild.pin.length !== 4) {
      setAddError('Please fill in every field, including a 4-digit PIN.');
      return;
    }
    setAdding(true);
    const nameProblem = await checkSignupNames(newChild.username, newChild.fullName, newChild.schoolName);
    if (nameProblem) {
      setAdding(false);
      setAddError(nameProblem);
      return;
    }
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
      setAddError(friendlyNameError(error.message) ?? error.message);
      return;
    }
    trackParentEvent('parent_child_added', { grade: newChild.grade });
    setNewChild(emptyChildForm());
    setSheet(null);
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
    trackParentEvent('parent_email_optin_changed', { opted_in: nextValue });
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
    trackParentEvent('parent_pin_revealed', { child_id: childId });
  };

  const handleBugReport = async () => {
    const description = bugText.trim();
    if (!description) return;
    setBugSubmitting(true);
    setBugError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ description }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setBugError(result.error || 'Something went wrong — please try again.');
        return;
      }
      setBugSent(true);
      setBugText('');
      trackParentEvent('parent_bug_report_sent');
      setTimeout(() => {
        setBugSent(false);
        setSheet((s) => (s === 'bug' ? null : s));
      }, 2500);
    } catch {
      setBugError('Something went wrong — please try again.');
    } finally {
      setBugSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await trackParentEvent('parent_signed_out');
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

  /* ── Non-dashboard states ───────────────────────────────────────────── */

  const centered = (title: string, message?: string, withSignOut = false) => (
    <IosScreen className="flex items-center justify-center px-8">
      <div className="max-w-sm text-center space-y-2">
        <p className="text-[20px] font-semibold">{title}</p>
        {message && <p className="text-[15px]" style={{ color: IOS.secondary }}>{message}</p>}
        {withSignOut && (
          <div className="pt-3"><IosBarButton onClick={handleSignOut}>Sign Out</IosBarButton></div>
        )}
      </div>
    </IosScreen>
  );

  if (loading) return centered('Loading…');
  if (!parent) return centered('Could not load your account.');
  if (parent.status === 'pending') {
    // New registrations are approved automatically — this only shows for an
    // account an admin has manually parked back in review.
    return centered('Pending Review', `Thanks for registering, ${parent.full_name}! Your account is being reviewed — check back shortly.`, true);
  }
  if (parent.status === 'rejected') {
    return centered('Registration Not Approved', 'Your registration was not approved.', true);
  }

  /* ── Derived bits ───────────────────────────────────────────────────── */

  const firstName = parent.full_name.trim().split(/\s+/)[0] || parent.full_name;
  const atChildLimit = kids.length >= maxChildren;
  const canBuyChildSlot = isPremium && !isNative && subscription!.addon_children < 2;
  const renewsLabel = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const childrenFooter = (() => {
    if (checkoutError && atChildLimit) return <span style={{ color: IOS.red }}>{checkoutError}</span>;
    if (!atChildLimit) return undefined;
    if (canBuyChildSlot) return `A child slot is a one-time ₱${CHILD_SLOT_PRICE_PHP} and stays on your account for good, even if Premium lapses. It doesn't change your renewal date or coins.`;
    if (isPremium) return `You've reached your child limit (${maxChildren}).`;
    return maxChildren > 1
      ? `Your account holds ${maxChildren} children. Get Premium to add more.`
      : 'Free accounts can add 1 child. Get Premium to add more.';
  })();

  /* ── Child detail (pushed page) ─────────────────────────────────────── */

  const childPage = openChild && (
    <IosPushedPage>
      <IosNavBar
        large={false}
        title={openChild.full_name.split(' ')[0]}
        left={<IosBarButton back onClick={popChild}>Family</IosBarButton>}
      />
      <IosContent>
        <div className="flex flex-col items-center text-center pt-2">
          <img src={openChild.avatar} alt="" className="w-24 h-24 object-contain" />
          <p className="mt-2 text-[22px] leading-[28px] font-bold">{openChild.full_name}</p>
          <p className="text-[15px]" style={{ color: IOS.secondary }}>
            {openChild.grade} · {openChild.school_name}
          </p>
        </div>

        <IosGroup header="Sign-in" footer="Your child signs in with this username and 4-digit PIN.">
          <IosRow icon="person" iconColor={IOS.blue} title="Username" detail={`@${openChild.username}`} />
          <IosRow
            icon="key"
            iconColor={IOS.gray}
            title="PIN"
            accessory={
              <div className="flex items-center gap-3">
                <span className="text-[17px] tabular-nums tracking-[0.15em]" style={{ color: IOS.secondary }}>
                  {openChild.id in revealedPins ? (revealedPins[openChild.id] ?? 'Unavailable') : '••••'}
                </span>
                <IosCapsule onClick={() => handleTogglePin(openChild.id)} disabled={pinLoading === openChild.id}>
                  {pinLoading === openChild.id ? '…' : openChild.id in revealedPins ? 'Hide' : 'Show'}
                </IosCapsule>
              </div>
            }
          />
        </IosGroup>

        <IosGroup header="School week">
          <IosRow
            icon="calendar"
            iconColor={IOS.red}
            title="This Week's Lessons"
            subtitle={`What ${openChild.full_name.split(' ')[0]} is learning in ${openChild.grade}`}
            onClick={() => setSheet('lessons')}
          />
        </IosGroup>

        <ChildProgressPanel
          key={openChild.id}
          childId={openChild.id}
          isPremium={isPremium}
          coinBalance={subscription?.coin_pool_balance ?? 0}
          onCoinsAwarded={(amount) =>
            setSubscription((prev) => (prev ? { ...prev, coin_pool_balance: prev.coin_pool_balance - amount } : prev))
          }
        />
      </IosContent>

      <IosSheet open={sheet === 'lessons'} onClose={closeSheet} title="This Week" closeLabel="Done">
        <WeeklyLessonsPanel grade={openChild.grade} />
      </IosSheet>
    </IosPushedPage>
  );

  /* ── Family (home) ──────────────────────────────────────────────────── */

  return (
    <IosScreen>
      <IosNavBar title={`Hi, ${firstName}`} />
      <IosContent>
        {/* Plan */}
        <IosGroup
          footer={checkoutError && !atChildLimit ? <span style={{ color: IOS.red }}>{checkoutError}</span> : undefined}
        >
          {isPremium ? (
            <>
              <IosRow
                icon="star"
                iconColor={IOS.yellow}
                title="Premium"
                subtitle={renewsLabel ? `Active until ${renewsLabel}` : 'Active'}
              />
              <IosRow icon="coins" iconColor={IOS.orange} title="Coin pool" detail={subscription!.coin_pool_balance.toLocaleString()} />
            </>
          ) : (
            <>
              <div className="p-4 space-y-3.5">
                <div className="flex items-center gap-3">
                  <IosIconTile icon="star" color={IOS.yellow} size={40} />
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold">Free Plan</p>
                    <p className="text-[15px] leading-[20px]" style={{ color: IOS.secondary }}>
                      Premium adds the journal, weak-topic reports, coin rewards and more child slots.
                    </p>
                  </div>
                </div>
                {!isNative && (
                  <IosButton onClick={() => startCheckout('premium')} disabled={checkingOut}>
                    {checkingOut ? 'Redirecting…' : 'Get Premium · ₱249/yr'}
                  </IosButton>
                )}
              </div>
              {!isNative && (
                <IosRow href="/parent-dashboard/pricing" title="See Pricing Details" tint="blue" />
              )}
            </>
          )}
        </IosGroup>

        {/* Push ask — only once there's a child to report on. */}
        {parentId && kids.length > 0 && (
          <ParentPushOptIn
            parentId={parentId}
            childNames={kids.map(k => k.full_name.trim().split(/\s+/)[0])}
          />
        )}

        {/* Children */}
        <IosGroup header="Children" footer={childrenFooter}>
          {kids.length === 0 && (
            <IosRow title="No children added yet" subtitle="Add your child to start tracking progress." />
          )}
          {kids.map((kid) => (
            <IosRow
              key={kid.id}
              leading={<img src={kid.avatar} alt="" className="w-11 h-11 object-contain shrink-0" />}
              title={kid.full_name}
              subtitle={`${kid.grade} · ${kid.school_name}`}
              onClick={() => pushChild(kid.id)}
            />
          ))}
          {!atChildLimit ? (
            <IosRow
              leading={<span className="w-11 flex justify-center"><Icon name="plus" size={22} color={IOS.blue} /></span>}
              title="Add Child"
              tint="blue"
              onClick={() => { setAddError(''); setSheet('addChild'); }}
            />
          ) : canBuyChildSlot ? (
            <IosRow
              leading={<span className="w-11 flex justify-center"><Icon name="plus" size={22} color={IOS.blue} /></span>}
              title={checkingOut ? 'Redirecting…' : 'Add a Child Slot'}
              tint="blue"
              detail={`₱${CHILD_SLOT_PRICE_PHP}`}
              onClick={checkingOut ? undefined : () => startCheckout('childSlot')}
            />
          ) : null}
        </IosGroup>

        {kids.length > 1 && (
          <IosGroup footer={isPremium ? undefined : 'Comparing children side by side is a Premium feature.'}>
            <IosRow
              icon="compare"
              iconColor={IOS.teal}
              title="Compare Children"
              onClick={isPremium ? () => setSheet('compare') : () => trackParentEvent('parent_locked_feature_tapped', { feature: 'compare_children' })}
              accessory={isPremium ? undefined : <Icon name="lock" size={16} color={IOS.tertiary} />}
            />
          </IosGroup>
        )}

        {/* Store — web only (Play billing rules) */}
        {!isNative && (
          <IosGroup header="Store">
            <IosRow href="/parent-dashboard/shop" icon="bag" iconColor={IOS.purple} title="Quest Packs" subtitle="Extra bonus quests for your child" />
            <IosRow href="/parent-dashboard/my-secs" icon="ticket" iconColor={IOS.indigo} title="My SECs" />
          </IosGroup>
        )}

        {/* Community */}
        <IosGroup header="Community">
          <IosRow
            href={FACEBOOK_GROUP_URL}
            external
            icon="people"
            iconColor="#1877F2"
            title="Parent Facebook Group"
            subtitle="Swap tips and ask questions with other parents"
            onClick={() => trackParentEvent('parent_link_clicked', { target: 'facebook_group' })}
          />
        </IosGroup>

        {kids.length > 0 && (
          <ParentBlogResources
            grades={[...new Set(kids.map(k => parseInt(k.grade.replace(/\D/g, ''), 10)).filter(Boolean))]}
          />
        )}

        {/* Notifications */}
        <IosGroup header="Notifications">
          {parentId && <PushNotificationSettings owner={{ kind: 'parent', id: parentId }} variant="ios" />}
          <IosRow
            icon="mail"
            iconColor={IOS.blue}
            title="Email Updates"
            subtitle={parent.marketing_opt_in ? 'Progress tips and news' : 'Turn on to get 250 free gold'}
            accessory={
              <IosSwitch
                checked={parent.marketing_opt_in}
                disabled={togglingOptIn}
                label="Email updates"
                onChange={(on) => (on ? handleToggleOptIn() : setShowOptOutConfirm(true))}
              />
            }
          />
        </IosGroup>

        {/* Support */}
        <IosGroup header="Support">
          <IosRow
            icon="ladybug"
            iconColor={IOS.green}
            title="Report a Problem"
            onClick={() => { setBugSent(false); setBugError(''); setSheet('bug'); }}
          />
          <IosRow
            href={MESSENGER_URL}
            external
            icon="chat"
            iconColor="#0084FF"
            title="Message Us"
            subtitle="Chat with us on Facebook Messenger"
            onClick={() => trackParentEvent('parent_link_clicked', { target: 'messenger' })}
          />
          <IosRow href={`mailto:${SUPPORT_EMAIL}`} external icon="mail" iconColor={IOS.gray} title="Contact Support" detail="Email" onClick={() => trackParentEvent('parent_link_clicked', { target: 'support_email' })} />
        </IosGroup>

        <IosGroup>
          <IosRow title="Sign Out" tint="red" center onClick={() => setShowSignOutConfirm(true)} />
        </IosGroup>

        <IosGroup footer="Permanently removes your account and every child's progress.">
          <IosRow
            title="Delete Account"
            tint="red"
            center
            onClick={() => { setDeleteConfirmText(''); setDeleteError(''); setSheet('delete'); }}
          />
        </IosGroup>
      </IosContent>

      {childPage}

      {/* ── Sheets ── */}

      <IosSheet
        open={sheet === 'addChild'}
        onClose={closeSheet}
        title="Add Child"
        action={{ label: adding ? 'Adding…' : 'Add', onClick: () => handleAddChild(), disabled: adding }}
      >
        <form onSubmit={handleAddChild} className="space-y-8">
          <div className="flex flex-col items-center gap-3 pt-1">
            <img src={newChild.avatar} alt="" className="w-24 h-24 object-contain" />
            <div className="w-full max-w-[240px]">
              <IosSegmented
                value={newChild.gender}
                onChange={(gender) => setNewChild({ ...newChild, gender, avatar: defaultAvatarForGender(gender) })}
                options={[{ value: 'boy', label: 'Boy' }, { value: 'girl', label: 'Girl' }]}
              />
            </div>
          </div>

          <IosGroup>
            <IosField
              placeholder="Full name"
              value={newChild.fullName}
              onChange={(e) => setNewChild({ ...newChild, fullName: e.target.value })}
              autoComplete="off"
            />
            {/* Same layout as IosField, with directory autocomplete. */}
            <div className="pl-4 pr-4">
              <SchoolPicker
                value={newChild.schoolName}
                onChange={(schoolName) => setNewChild({ ...newChild, schoolName })}
                inputClassName="w-full bg-transparent text-[17px] py-[12px] outline-none placeholder:text-[#AEAEB2]"
                tone="ios"
              />
            </div>
          </IosGroup>

          <IosGroup header="Grade">
            {GRADES.map((g) => (
              <IosRow
                key={g}
                title={g}
                onClick={() => setNewChild({ ...newChild, grade: g })}
                accessory={newChild.grade === g ? <Icon name="check" size={20} color={IOS.blue} /> : <span />}
              />
            ))}
          </IosGroup>

          <IosGroup
            header="Sign-in"
            footer={addError ? <span style={{ color: IOS.red }}>{addError}</span> : 'Your child signs in with this username and a 4-digit PIN. You can view the PIN here anytime.'}
          >
            <IosField
              label="Username"
              placeholder="Required"
              value={newChild.username}
              onChange={(e) => setNewChild({ ...newChild, username: e.target.value })}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
            />
            <IosField
              label="PIN"
              placeholder="4 digits"
              type="password"
              inputMode="numeric"
              value={newChild.pin}
              onChange={(e) => setNewChild({ ...newChild, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              autoComplete="new-password"
            />
          </IosGroup>

          <IosButton type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add Child'}</IosButton>
        </form>
      </IosSheet>

      <IosSheet open={sheet === 'compare'} onClose={closeSheet} title="Compare" closeLabel="Done">
        <ChildComparisonPanel kids={kids} />
      </IosSheet>

      <IosSheet
        open={sheet === 'bug'}
        onClose={closeSheet}
        title="Report a Problem"
        action={bugSent ? undefined : { label: bugSubmitting ? 'Sending…' : 'Send', onClick: handleBugReport, disabled: !bugText.trim() || bugSubmitting }}
      >
        {bugSent ? (
          <div className="flex flex-col items-center text-center gap-2 py-8">
            <IosIconTile icon="check" color={IOS.green} size={48} />
            <p className="text-[17px] font-semibold">Thanks! Your report is on its way.</p>
          </div>
        ) : (
          <IosGroup
            footer={bugError ? <span style={{ color: IOS.red }}>{bugError}</span> : "Describe what happened and we'll look into it."}
          >
            <textarea
              value={bugText}
              onChange={(e) => setBugText(e.target.value)}
              rows={6}
              autoFocus
              placeholder="e.g. The progress page doesn't load for my child…"
              className="block w-full bg-transparent px-4 py-3 text-[17px] leading-[22px] resize-none outline-none placeholder:text-[#C7C7CC]"
            />
          </IosGroup>
        )}
      </IosSheet>

      <IosSheet open={sheet === 'delete'} onClose={closeSheet} title="Delete Account">
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <IosIconTile icon="trash" color={IOS.red} size={48} />
          <p className="text-[17px] font-semibold">This can&apos;t be undone</p>
          <p className="text-[15px]" style={{ color: IOS.secondary }}>
            Your account and every child&apos;s progress will be permanently deleted.
          </p>
        </div>
        <IosGroup
          header="Type DELETE to confirm"
          footer={deleteError ? <span style={{ color: IOS.red }}>{deleteError}</span> : undefined}
        >
          <IosField
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
          />
        </IosGroup>
        <IosButton color={IOS.red} onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting}>
          {deleting ? 'Deleting…' : 'Permanently Delete'}
        </IosButton>
      </IosSheet>

      {/* ── Alerts ── */}

      <IosAlert
        open={showOptOutConfirm}
        title="Turn Off Email Updates?"
        message="You'll stop getting progress tips and news from Learning Hall."
        confirmLabel="Turn Off"
        destructive
        busy={togglingOptIn}
        onCancel={() => setShowOptOutConfirm(false)}
        onConfirm={async () => { await handleToggleOptIn(); setShowOptOutConfirm(false); }}
      />
      <IosAlert
        open={showSignOutConfirm}
        title="Sign Out?"
        confirmLabel="Sign Out"
        destructive
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
      />
    </IosScreen>
  );
}
