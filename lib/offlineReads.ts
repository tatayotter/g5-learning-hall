// lib/offlineReads.ts
//
// Read-only screens with no connection (docs/offline-mode-plan.md): the profile, the
// achievements board and the Curio Arena's team, hatchery and compendium. Each read they make
// is wrapped in cachedRead, which on the installed app keeps the last good result on the
// device and, for players with the 'offline_play' flag, answers from that copy while offline
// instead of waiting on Supabase's retries and then showing an empty screen.
//
// Only for reads whose result is shown, never for ones whose result gets written back (gold,
// level): an old copy there would overwrite what was earned offline. Saves still go to the
// server; the next online load replaces every copy.
import { isRunningInstalled } from '@/lib/installPrompt';
import { isNativeApp } from '@/lib/platform';
import { isOffline } from '@/lib/offlineSnapshot';
import { offlinePlayEnabled } from '@/lib/offlineQuests';

const KEY = (userId: string, name: string) => `lh_offline_read_${userId}_${name}`;

// Saved on the installed app whatever the flag says, so a kid whose flag is turned on already
// has copies the next time they're offline. Plain browser tabs keep nothing.
export function keepsOfflineCopies(): boolean {
  return typeof window !== 'undefined' && (isNativeApp() || isRunningInstalled());
}

// True when a read should come from the device copy instead of the network.
export function readingOffline(userId: string): boolean {
  return isOffline() && offlinePlayEnabled(userId);
}

interface Saved<T> {
  savedAt: string;
  value: T;
}

function load<T>(userId: string, name: string): T | undefined {
  try {
    const raw = localStorage.getItem(KEY(userId, name));
    return raw ? (JSON.parse(raw) as Saved<T>).value : undefined;
  } catch {
    return undefined;
  }
}

function save(userId: string, name: string, value: unknown) {
  if (!keepsOfflineCopies()) return;
  try {
    localStorage.setItem(KEY(userId, name), JSON.stringify({ savedAt: new Date().toISOString(), value }));
  } catch {
    // Storage full or blocked: that screen just won't have a copy offline.
  }
}

// `fetch` throws when the read fails, so a failed read never replaces a good copy. Offline, or
// when the read fails with offline play on, the saved copy is returned (`fallback` if there's
// none); otherwise a failure returns `fallback`, as the callers did before.
// Values must survive JSON (no Sets or Maps).
export async function cachedRead<T>(userId: string, name: string, fetch: () => Promise<T>, fallback: T): Promise<T> {
  if (readingOffline(userId)) return load<T>(userId, name) ?? fallback;
  try {
    const value = await fetch();
    save(userId, name, value);
    return value;
  } catch {
    return (offlinePlayEnabled(userId) ? load<T>(userId, name) : undefined) ?? fallback;
  }
}

// For buttons on those screens that save (team changes, skills, eggs): offline they would fail
// with a misleading "make sure you have a scroll" message, so they stop here instead.
export const NEEDS_CONNECTION_MESSAGE = "📡 No internet. This needs internet, so try again when it's back.";

export function needsConnection(): boolean {
  if (!isOffline()) return false;
  alert(NEEDS_CONNECTION_MESSAGE);
  return true;
}

// Whether this device has a copy of `name` to show offline.
export function hasOfflineCopy(userId: string, name: string): boolean {
  return load<unknown>(userId, name) !== undefined;
}

// Changes the device copy in place, so something done offline (curio EXP from a map scroll)
// still shows after reopening offline. Does nothing when there's no copy.
export function updateOfflineCopy<T>(userId: string, name: string, change: (value: T) => T) {
  const current = load<T>(userId, name);
  if (current !== undefined) save(userId, name, change(current));
}
