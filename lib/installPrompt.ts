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

// Google Play closed test for the Android app. Only Google accounts on the
// test's tester list can join; anyone else sees "not available". The plain
// store listing doesn't open until a tester has joined, so link the opt-in page.
export const PLAY_TEST_URL = 'https://play.google.com/apps/testing/com.tatayotter.learninghall';

const PLAY_TEST_KEY_PREFIX = 'play_test_nudge_dismissed';

// Separate from the home-screen nudge's flag, so kids who closed that one
// still get one chance to see the Android app.
export function hasDismissedPlayTestNudge(userId: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return true;
  return localStorage.getItem(`${PLAY_TEST_KEY_PREFIX}:${userId}`) === '1';
}

export function dismissPlayTestNudge(userId: string | null): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(`${PLAY_TEST_KEY_PREFIX}:${userId}`, '1');
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
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
