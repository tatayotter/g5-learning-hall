// components/InstallNudge.tsx
'use client';

import { useEffect, useState } from 'react';
import type { UserId } from '@/lib/userSession';
import { dismissInstallNudge, hasDismissedInstallNudge, isIosDevice, isRunningInstalled } from '@/lib/installPrompt';

// Nudge, not a wall — same spirit as LinkParentBanner.tsx, different corner
// (bottom-right) so the two never stack. The Android app isn't published yet
// (see docs/... blog post "how-to-install-learning-hall-phone-computer"), so
// this points everyone at the one thing that actually works today: installing
// the web app itself as a home-screen/desktop icon.
//
// Chrome/Edge (Android + desktop) fire `beforeinstallprompt`, which we can
// trigger programmatically. iOS Safari never fires it — Apple only exposes
// "Add to Home Screen" through the manual Share-sheet flow — so iOS gets
// static instructions instead of a button.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Platform = 'installable' | 'ios';

export default function InstallNudge({ userId }: { userId: UserId | null }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isRunningInstalled() || hasDismissedInstallNudge(userId)) return;

    if (isIosDevice()) {
      setPlatform('ios');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('installable');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [userId]);

  if (!platform) return null;

  const handleDismiss = () => {
    dismissInstallNudge(userId);
    setPlatform(null);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Dismiss either way — a "not now" on the native prompt shouldn't nag
    // again next session any more than accepting it should.
    dismissInstallNudge(userId);
    setPlatform(null);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Add Learning Hall to your home screen"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-emerald-500 transition-colors"
      >
        <span>Add to Home Screen 📲</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-1.5rem)] max-w-xs bg-neutral-900 border border-emerald-500/40 text-white text-xs rounded-xl shadow-2xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold">Get one-tap access 📲</span>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/60 hover:text-white leading-none text-base"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {platform === 'ios' ? (
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
