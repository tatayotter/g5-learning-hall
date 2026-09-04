// components/PushNotificationSettings.tsx
// Plumbing-phase UI: subscribe/unsubscribe this browser to Web Push, and a
// "send me a test" button to prove the pipe works end-to-end. No real
// triggers wired up yet (see lib/push.ts) — that's a deliberate follow-up.
'use client';

import { useEffect, useState } from 'react';
import {
  isPushSupported,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
  type PushOwner,
} from '@/lib/push';

interface PushNotificationSettingsProps {
  owner: PushOwner;
  /** Compact inline row (matches parent-dashboard's "More options" list) vs. a standalone card. */
  variant?: 'row' | 'card';
}

export default function PushNotificationSettings({ owner, variant = 'row' }: PushNotificationSettingsProps) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    getExistingSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  if (!supported) return null;

  async function handleToggle() {
    setBusy(true);
    setTestStatus('idle');
    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) setSubscribed(false);
      } else {
        const ok = await subscribeToPush(owner);
        setSubscribed(ok);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setTestStatus('sending');
    const ok = await sendTestPush(owner);
    setTestStatus(ok ? 'sent' : 'error');
  }

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
        <div>
          <p className="text-sm font-bold text-stone-700">🔔 Push notifications</p>
          <p className="text-xs text-stone-500">Get an alert on this device for things you care about.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 disabled:opacity-50"
          >
            {busy ? '…' : subscribed ? 'Disable' : 'Enable'}
          </button>
          {subscribed && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testStatus === 'sending'}
              className="text-xs text-stone-500 hover:text-stone-700 underline disabled:opacity-50"
            >
              {testStatus === 'sending' ? 'Sending…' : 'Send test'}
            </button>
          )}
          {testStatus === 'sent' && <span className="text-xs text-emerald-600">Sent ✓</span>}
          {testStatus === 'error' && <span className="text-xs text-red-600">Failed</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-stone-500">🔔 Push notifications — device alerts</span>
      <div className="flex items-center gap-3">
        {subscribed && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testStatus === 'sending'}
            className="text-xs text-stone-500 hover:text-stone-700 underline disabled:opacity-50"
          >
            {testStatus === 'sending' ? '…' : testStatus === 'sent' ? 'Sent ✓' : testStatus === 'error' ? 'Failed' : 'Send test'}
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          className={
            subscribed
              ? 'text-xs text-stone-500 hover:text-stone-700 underline disabled:opacity-50'
              : 'text-xs text-amber-700 hover:text-amber-800 underline disabled:opacity-50'
          }
        >
          {busy ? '…' : subscribed ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
}
