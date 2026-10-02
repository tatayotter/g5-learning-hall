// components/PushOptInCard.tsx
// In-app ask for push notifications, shown on the Board tab once a kid has
// actually played. Replaces the old page-load autoPromptForPush(): Safari
// and Chrome's quiet-permission UI block or hide a permission request that
// isn't triggered by a tap, and it set its "already asked" flag before the
// prompt ever showed, so it silently never asked again. Here the native
// prompt only fires from the button below.
//
// On iPhone/iPad in a normal Safari tab push is impossible until the app is
// added to the Home Screen, so the card explains that instead.
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import GameButton from '@/components/GameButton';
import { getExistingSubscription, subscribeToPush, usePushAvailability, type PushOwner } from '@/lib/push';
import { claimPushGoldBonusChild } from '@/lib/pushBonus';
import { playPageFlip } from '@/lib/sounds';

const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export type CardState = 'hidden' | 'ask' | 'ios-install';

const noopSubscribe = () => () => {};

function snoozeKey(owner: PushOwner) {
  return `lh_push_card_snooze_${owner.kind}_${owner.id}`;
}

function isSnoozed(owner: PushOwner): boolean {
  try {
    const until = Number(window.localStorage.getItem(snoozeKey(owner)));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

/**
 * Shared show/hide + subscribe logic for the in-app push ask (this card and
 * the parent dashboard's ParentPushOptIn). `state` is 'hidden' when already
 * subscribed, denied, snoozed, unsupported, or until the check finishes.
 */
export function usePushAsk(owner: PushOwner, previewState?: Exclude<CardState, 'hidden'>) {
  const availability = usePushAvailability();
  // Server snapshot: snoozed, so nothing renders until the client knows.
  const snoozed = useSyncExternalStore(noopSubscribe, () => isSnoozed(owner), () => true);
  const [dismissed, setDismissed] = useState(false);
  // null until checked; true also covers "permission already denied" —
  // that can only be undone in browser settings, nothing to offer here.
  const [nothingToAsk, setNothingToAsk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (previewState || availability !== 'supported') return;
    let live = true;
    getExistingSubscription().then((sub) => {
      if (live) setNothingToAsk(!!sub || Notification.permission === 'denied');
    });
    return () => { live = false; };
  }, [availability, previewState]);

  const state: CardState = previewState
    ?? (dismissed || snoozed ? 'hidden'
      : availability === 'ios-needs-install' ? 'ios-install'
      : availability === 'supported' && nothingToAsk === false ? 'ask'
      : 'hidden');

  function snooze() {
    try {
      window.localStorage.setItem(snoozeKey(owner), String(Date.now() + SNOOZE_MS));
    } catch {
      // Storage unavailable — hiding for this visit is still fine.
    }
    setDismissed(true);
  }

  /** Fires the native prompt — call only from a tap. True once subscribed. */
  async function enable(): Promise<boolean> {
    setBusy(true);
    try {
      const ok = await subscribeToPush(owner);
      if (!ok) {
        // Either the prompt was dismissed/denied or something failed —
        // only "denied" is permanent.
        if (Notification.permission === 'denied') setBlocked(true);
        return false;
      }
      setDismissed(true);
      return true;
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, blocked, snooze, enable };
}

interface PushOptInCardProps {
  owner: PushOwner;
  /** Called with the gold actually credited, so the Dashboard can toast it. */
  onEnabled?: (gold: number | null) => void;
  /** /dev/ui-gallery only: render a state regardless of this browser. */
  previewState?: Exclude<CardState, 'hidden'>;
}

export default function PushOptInCard({ owner, onEnabled, previewState }: PushOptInCardProps) {
  const ask = usePushAsk(owner, previewState);
  const { state, busy, blocked } = ask;

  if (state === 'hidden') return null;

  function snooze() {
    playPageFlip();
    ask.snooze();
  }

  async function enable() {
    playPageFlip();
    if (!(await ask.enable())) return;
    const reward = owner.kind === 'app_user' ? await claimPushGoldBonusChild(owner.id) : null;
    onEnabled?.(reward?.gold ?? null);
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-[#8b5e2a] bg-[#f0ddb8] p-4 shadow-md">
      <div className="flex items-start gap-3">
        <img src="/icons/notificationbell.png" alt="" className="h-10 w-10 flex-none object-contain" />
        <div className="min-w-0 flex-1">
          {state === 'ask' ? (
            <>
              <p className="text-base font-bold text-[#2a1505]">Get a heads-up from your curios</p>
              <p className="mt-1 text-sm text-[#3a2610]">
                We&apos;ll tell you when a mission finishes, a trade offer arrives, or new quests are ready.
                Turn it on and get <span className="font-bold text-[#c9781a]">300 free Gold</span>.
              </p>
              {blocked && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  Alerts are blocked for this site. Ask a grown-up to allow notifications in the browser settings.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-base font-bold text-[#2a1505]">Want alerts on your iPhone or iPad?</p>
              <p className="mt-1 text-sm text-[#3a2610]">
                Add Learning Hall to your Home Screen first: tap the <span className="font-bold">Share</span> button,
                then <span className="font-bold">Add to Home Screen</span>. Open it from there and you can turn alerts
                on for <span className="font-bold text-[#c9781a]">300 free Gold</span>.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-4">
        <button type="button" onClick={snooze} className="whitespace-nowrap text-sm font-bold text-[#6b4820] hover:text-[#2a1505]">
          {state === 'ask' ? 'Not now' : 'Got it'}
        </button>
        {state === 'ask' && !blocked && (
          <GameButton variant="quest" color="#d4a017" onClick={enable} disabled={busy} className="whitespace-nowrap" style={{ fontSize: 15 }}>
            {busy ? 'Turning on...' : 'Turn on alerts'}
          </GameButton>
        )}
      </div>
    </div>
  );
}
