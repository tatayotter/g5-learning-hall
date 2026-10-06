// lib/offlineSnapshot.ts
//
// Last-loaded copies of what the dashboard needs to open with no connection:
// the signed-in player's profile (normally rebuilt from the roster tables on
// every load) and their last WeeklyData (stats, journal, this week's
// answer-stripped quiz content). Written on every successful online load and
// read only while the device is offline. The app shell itself is cached by
// public/sw.js.
//
// Nothing here is a source of truth: saves still go to the server, and the
// next online load overwrites both copies.
import type { UserId, UserProfile } from '@/lib/userSession';

const PROFILE_KEY = (id: UserId) => `lh_offline_profile_${id}`;
const WEEKLY_KEY = (id: UserId) => `lh_offline_weekly_${id}`;

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — offline opening just won't have this copy.
  }
}

export function saveOfflineProfile(profile: UserProfile) {
  write(PROFILE_KEY(profile.id), profile);
}

export function loadOfflineProfile(id: UserId): UserProfile | null {
  return read<UserProfile>(PROFILE_KEY(id));
}

export interface OfflineWeeklySnapshot<TData, TProgress> {
  savedAt: string;
  data: TData;
  progress: TProgress | null;
  contentWeekId: string | null;
}

export function saveOfflineWeekly<TData, TProgress>(id: UserId, snapshot: Omit<OfflineWeeklySnapshot<TData, TProgress>, 'savedAt'>) {
  write(WEEKLY_KEY(id), { ...snapshot, savedAt: new Date().toISOString() });
}

export function loadOfflineWeekly<TData, TProgress>(id: UserId): OfflineWeeklySnapshot<TData, TProgress> | null {
  return read<OfflineWeeklySnapshot<TData, TProgress>>(WEEKLY_KEY(id));
}
