// lib/installPrompt.ts
//
// Per-user "has this kid/parent dismissed the install-the-web-app nudge"
// flag. Same shape as lib/tutorial.ts's hasSeenTabTutorial/markTabTutorialSeen
// (localStorage, keyed per user so siblings sharing a device each get their
// own nudge) — kept as its own module since it's a one-off dismiss rather
// than a multi-step tutorial sequence.

const KEY_PREFIX = 'install_nudge_dismissed';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId}`;
}

export function hasDismissedInstallNudge(userId: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return true; // fail closed: no user yet, don't show
  return localStorage.getItem(storageKey(userId)) === '1';
}

export function dismissInstallNudge(userId: string | null): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(storageKey(userId), '1');
}

/** True once the app is already running as an installed/home-screen app —
 * covers the standard `display-mode` media query (Android/desktop Chrome,
 * Edge) and iOS Safari's older `navigator.standalone` flag. */
export function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** iPhone/iPad only. iPadOS 13+ reports as "MacIntel" but is touch-capable,
 * which a real Mac never is — that's the standard way to tell them apart. */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
