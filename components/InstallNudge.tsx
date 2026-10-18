// components/InstallNudge.tsx
'use client';

import { useEffect, useState } from 'react';
import { useClientValue } from '@/hooks/useClientValue';
import type { UserId } from '@/lib/userSession';
import {
  PLAY_TEST_URL,
  dismissInstallNudge,
  dismissPlayTestNudge,
  hasDismissedInstallNudge,
  hasDismissedPlayTestNudge,
  isAndroidDevice,
  isIosDevice,
  isRunningInstalled,
} from '@/lib/installPrompt';
import { isNativeApp } from '@/lib/platform';
import { trackEvent } from '@/lib/analytics';

// Nudge, not a wall — same spirit as LinkParentBanner.tsx, different corner
// (bottom-right) so the two never stack. Android players outside the native
// app are sent to the Google Play closed test (it needs 12+ testers for 14
// days before the app can be published); everyone else is offered the web
// app itself as a home-screen/desktop icon.
//
// Chrome/Edge (Android + desktop) fire `beforeinstallprompt`, which we can
// trigger programmatically. iOS Safari never fires it — Apple only exposes
// "Add to Home Screen" through the manual Share-sheet flow — so iOS gets
// static instructions instead of a button.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Platform = 'installable' | 'ios' | 'play_test';

export default function InstallNudge({ userId }: { userId: UserId | null }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // iOS never fires beforeinstallprompt, so eligibility is read directly.
  const iosEligible = useClientValue(
    () => isIosDevice() && !isRunningInstalled() && !hasDismissedInstallNudge(userId),
    false,
  );
  // Android in a browser or as a home-screen icon, not already in the Play app.
  const playTestEligible = useClientValue(
    () => isAndroidDevice() && !isNativeApp() && !hasDismissedPlayTestNudge(userId),
    false,
  );
  const platform: Platform | null = dismissed
    ? null
    : playTestEligible ? 'play_test' : iosEligible ? 'ios' : deferredPrompt ? 'installable' : null;
  const [expanded, setExpanded] = useState(false);

  // Fires however the install happened (our button or the browser's own menu),
  // so it's the ground truth for "added to home screen".
  useEffect(() => {
    const onInstalled = () => { trackEvent('pwa_installed'); };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  useEffect(() => {
    if (platform) trackEvent('install_nudge_shown', { platform });
  }, [platform]);

  useEffect(() => {
    if (isRunningInstalled() || hasDismissedInstallNudge(userId) || isIosDevice()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [userId]);

  if (!platform) return null;

  const handleDismiss = () => {
    trackEvent('install_nudge_dismissed', { platform });
    if (platform === 'play_test') dismissPlayTestNudge(userId);
    else dismissInstallNudge(userId);
    setDismissed(true);
  };

  // A tap opens the opt-in page in a new tab; the nudge stays put so a parent
  // who came back without joining can still find it.
  const handlePlayTestClick = () => {
    trackEvent('play_test_link_opened');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    trackEvent('install_prompt_result', { outcome });
    // Dismiss either way — a "not now" on the native prompt shouldn't nag
    // again next session any more than accepting it should.
    dismissInstallNudge(userId);
    setDismissed(true);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => { trackEvent('install_nudge_opened', { platform }); setExpanded(true); }}
        title={platform === 'play_test' ? 'Get the Learning Hall app' : 'Add Learning Hall to your home screen'}
        className="fixed bottom-28 md:bottom-4 right-4 z-40 flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-emerald-500 transition-colors"
      >
        <span>{platform === 'play_test' ? 'Get the app 📲' : 'Add to Home Screen 📲'}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-28 md:bottom-4 right-4 z-40 w-[calc(100vw-1.5rem)] max-w-xs bg-neutral-900 border border-emerald-500/40 text-white text-xs rounded-xl shadow-2xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold">{platform === 'play_test' ? 'Get the Learning Hall app 📲' : 'Get one-tap access 📲'}</span>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/60 hover:text-white leading-none text-base"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {platform === 'play_test' ? (
        <>
          <p className="text-gray-400">
            Our Android app is almost ready! Ask a grown-up to tap the button, join with
            their Google account, then install it from Google Play.
          </p>
          <p className="text-gray-400">
            Please keep the app for <strong className="text-white">14 days</strong>. It helps us
            put Learning Hall on Google Play for everyone.
          </p>
          <a
            href={PLAY_TEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePlayTestClick}
            className="self-start bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Get the app
          </a>
        </>
      ) : platform === 'ios' ? (
        <p className="text-gray-400">
          Tap the Share icon <strong className="text-white">⬆️</strong> in Safari&apos;s toolbar,
          then scroll down and tap <strong className="text-white">&quot;Add to Home Screen.&quot;</strong>{' '}
          Learning Hall opens full-screen from an icon on your home screen — no App Store needed.
        </p>
      ) : (
        <>
          <p className="text-gray-400">
            Install Learning Hall as an app icon on your home screen or desktop — opens instantly,
            full-screen, no browser bar. No app store needed.
          </p>
          <button
            onClick={handleInstallClick}
            className="self-start bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Install
          </button>
        </>
      )}
    </div>
  );
}
